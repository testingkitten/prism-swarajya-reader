import { XMLParser } from 'fast-xml-parser'

const FEED_URL = 'https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml'
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

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800')
  try {
    const upstream = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'Prism RSS Reader/1.0 (+https://github.com/testingcat/swarajya-reader)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`)

    const document = parser.parse(await upstream.text())
    const channel = document.feed
    const entries = asArray(channel?.entry).map(normalizeEntry).filter((entry) => entry.title && entry.url)
    if (!entries.length) throw new Error('No feed entries found')

    response.status(200).json({
      source: 'Swarajya',
      sourceUrl: 'https://swarajyamag.com/',
      feedUrl: FEED_URL,
      updated: getText(channel.updated),
      fetchedAt: new Date().toISOString(),
      entries,
    })
  } catch (error) {
    response.status(502).json({ error: 'Unable to retrieve the Swarajya feed.', detail: error.message })
  }
}
