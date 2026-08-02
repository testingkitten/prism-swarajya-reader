import { XMLParser } from 'fast-xml-parser'

const STORIES_FEED_URL = 'https://swarajyamag.com/stories.rss'
const RECENT_FEED_URL = 'https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  trimValues: true,
  processEntities: true,
})

const ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '\u2019',
  lsquo: '\u2018',
  rdquo: '\u201D',
  ldquo: '\u201C',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
}

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getText(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    if (typeof value['#text'] === 'string') return value['#text']
    if (typeof value['#cdata'] === 'string') return value['#cdata']
  }
  return ''
}

function decodeEntities(value) {
  if (!value) return ''
  return String(value)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(Number.parseInt(hex, 16))
      } catch {
        return ''
      }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(Number.parseInt(dec, 10))
      } catch {
        return ''
      }
    })
    .replace(/&([a-zA-Z]+);/g, (match, name) => ENTITY_MAP[name] ?? match)
}

function cleanSummary(value) {
  const decoded = decodeEntities(getText(value))
  return decoded
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalizeUrl(rawUrl) {
  if (!rawUrl) return ''
  try {
    const url = new URL(String(rawUrl).trim())
    url.hash = ''
    url.hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    url.protocol = 'https:'
    // Drop tracking query params; keep path-only identity for Swarajya articles.
    url.search = ''
    let path = url.pathname.replace(/\/+$/, '') || '/'
    return `https://${url.hostname}${path}`
  } catch {
    return String(rawUrl).trim().replace(/\/+$/, '')
  }
}

function normalizeEntry(entry, index) {
  const link = asArray(entry.link).find((item) => !item.rel || item.rel === 'alternate')
  const rawUrl = link?.href || getText(link) || ''
  return {
    id: getText(entry.id) || `${getText(entry.title)}-${index}`,
    title: decodeEntities(getText(entry.title)),
    url: canonicalizeUrl(rawUrl),
    author: decodeEntities(getText(entry.author?.name) || getText(entry.author)) || 'Swarajya',
    published: getText(entry.published) || getText(entry.updated) || null,
    summary: cleanSummary(entry.summary || entry.content),
    categories: asArray(entry.category)
      .map((category) => decodeEntities(category.term || getText(category)))
      .filter(Boolean),
  }
}

function normalizeRssItem(item, index) {
  const rawUrl = getText(item.link) || getText(item.guid)
  return {
    id: getText(item.guid) || `${getText(item.title)}-${index}`,
    title: decodeEntities(getText(item.title)),
    url: canonicalizeUrl(rawUrl),
    author:
      decodeEntities(
        getText(item['dc:creator']) ||
          getText(item['atom:author']?.['atom:name']) ||
          getText(item.author),
      ) || 'Swarajya',
    published: getText(item['atom:updated']) || getText(item.pubDate) || null,
    summary: cleanSummary(item.description || item['content:encoded']),
    categories: asArray(item.category).map((category) => decodeEntities(getText(category))).filter(Boolean),
  }
}

function parseEntries(document) {
  const atomChannel = document.feed
  const rssChannel = document.rss?.channel
  const entries = atomChannel
    ? asArray(atomChannel.entry).map(normalizeEntry)
    : asArray(rssChannel?.item).map(normalizeRssItem)

  return {
    entries: entries.filter((entry) => entry.title && entry.url && entry.url.includes('swarajyamag.com')),
    updated: getText(atomChannel?.updated) || getText(rssChannel?.lastBuildDate) || null,
  }
}

async function retrieveFeed(url) {
  const upstream = await fetch(url, {
    headers: {
      'User-Agent': 'Swarajya/1.0 (+https://swarajya-reader.vercel.app)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(12000),
  })
  if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status} for ${url}`)
  return parseEntries(parser.parse(await upstream.text()))
}

function mergeFeeds(feeds) {
  const byUrl = new Map()
  for (const feed of feeds) {
    for (const entry of feed.entries) {
      const key = entry.url
      if (!key) continue
      const existing = byUrl.get(key)
      if (!existing) {
        byUrl.set(key, entry)
        continue
      }
      // Prefer the record with more metadata when URLs collide.
      const existingScore =
        (existing.summary ? 1 : 0) + (existing.author ? 1 : 0) + (existing.categories?.length || 0)
      const nextScore =
        (entry.summary ? 1 : 0) + (entry.author ? 1 : 0) + (entry.categories?.length || 0)
      if (nextScore > existingScore) byUrl.set(key, { ...existing, ...entry, id: existing.id || entry.id })
    }
  }

  return [...byUrl.values()].sort((a, b) => {
    const aTime = a.published ? Date.parse(a.published) : 0
    const bTime = b.published ? Date.parse(b.published) : 0
    return bTime - aTime
  })
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800')
  response.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const results = await Promise.allSettled([
      retrieveFeed(STORIES_FEED_URL),
      retrieveFeed(RECENT_FEED_URL),
    ])

    const available = []
    const sources = []
    for (const [index, result] of results.entries()) {
      const label = index === 0 ? 'stories.rss' : 'feed.xml'
      if (result.status === 'fulfilled') {
        available.push(result.value)
        sources.push({
          label,
          ok: true,
          count: result.value.entries.length,
          updated: result.value.updated,
        })
      } else {
        sources.push({
          label,
          ok: false,
          error: result.reason?.message || 'Failed',
          count: 0,
        })
      }
    }

    const stories = mergeFeeds(available)
    if (!stories.length) throw new Error('No feed entries found from any source')

    const updated =
      available.map((feed) => feed.updated).find(Boolean) || stories[0].published || null

    return response.status(200).json({
      source: 'Swarajya',
      sourceUrl: 'https://swarajyamag.com/',
      feedUrl: STORIES_FEED_URL,
      supplementalFeedUrl: RECENT_FEED_URL,
      updated,
      fetchedAt: new Date().toISOString(),
      count: stories.length,
      sources,
      entries: stories,
    })
  } catch (error) {
    return response.status(502).json({
      error: 'Unable to retrieve the Swarajya feed.',
      detail: error.message,
    })
  }
}
