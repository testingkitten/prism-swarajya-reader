import { XMLParser } from 'fast-xml-parser'

const STORIES_FEED_URL = 'https://swarajyamag.com/stories.rss'
const RECENT_FEED_URL = 'https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml'
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  trimValues: true,
})

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getText(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value['#text'] || ''
  return ''
}

function cleanSummary(value) {
  return getText(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#x27;|&#39;/g, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s\w+$/, '')
}

function normalizeEntry(entry, index) {
  const link = asArray(entry.link).find((item) => !item.rel || item.rel === 'alternate')
  return {
    id: getText(entry.id) || `${getText(entry.title)}-${index}`,
    title: getText(entry.title),
    url: link?.href || 'https://swarajyamag.com/',
    author: getText(entry.author?.name) || 'Swarajya',
    published: getText(entry.published) || getText(entry.updated),
    summary: cleanSummary(entry.summary),
    categories: asArray(entry.category).map((category) => category.term || getText(category)).filter(Boolean),
  }
}

function normalizeRssItem(item, index) {
  return {
    id: getText(item.guid) || `${getText(item.title)}-${index}`,
    title: getText(item.title),
    url: getText(item.link),
    author: getText(item['atom:author']?.['atom:name']) || getText(item.author) || 'Swarajya',
    published: getText(item['atom:updated']) || getText(item.pubDate),
    summary: cleanSummary(item.description),
    categories: asArray(item.category).map(getText).filter(Boolean),
  }
}

function parseEntries(document) {
  const atomChannel = document.feed
  const rssChannel = document.rss?.channel
  const entries = atomChannel
    ? asArray(atomChannel.entry).map(normalizeEntry)
    : asArray(rssChannel?.item).map(normalizeRssItem)

  return {
    entries: entries.filter((entry) => entry.title && entry.url),
    updated: getText(atomChannel?.updated) || getText(rssChannel?.lastBuildDate),
  }
}

async function retrieveFeed(url) {
  const upstream = await fetch(url, {
    headers: { 'User-Agent': 'Swarajya Reader/1.0' },
    signal: AbortSignal.timeout(10000),
  })
  if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`)
  return parseEntries(parser.parse(await upstream.text()))
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800')
  try {
    const feeds = await Promise.allSettled([
      retrieveFeed(STORIES_FEED_URL),
      retrieveFeed(RECENT_FEED_URL),
    ])
    const availableFeeds = feeds.filter((result) => result.status === 'fulfilled').map((result) => result.value)
    const primaryFeed = availableFeeds[0]
    const stories = availableFeeds
      .flatMap((feed) => feed.entries)
      .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.url === entry.url) === index)
      .sort((a, b) => new Date(b.published) - new Date(a.published))
    if (!stories.length) throw new Error('No feed entries found')

    response.status(200).json({
      source: 'Swarajya',
      sourceUrl: 'https://swarajyamag.com/',
      feedUrl: STORIES_FEED_URL,
      updated: primaryFeed?.updated || stories[0].published,
      fetchedAt: new Date().toISOString(),
      entries: stories,
    })
  } catch (error) {
    response.status(502).json({ error: 'Unable to retrieve the Swarajya feed.', detail: error.message })
  }
}
