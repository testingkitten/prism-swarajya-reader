const ALLOWED_HOSTS = new Set(['swarajyamag.com', 'www.swarajyamag.com'])

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeImages(markdown) {
  const captions = []
  const withoutLinkedImages = markdown.replace(/\[!\[([^\]]*)\]\([^\n]+?\)\]\([^\n]+?\)/g, (_, alt) => {
    captions.push(alt.replace(/^Image \d+:\s*/i, '').trim())
    return ''
  })
  let result = withoutLinkedImages.replace(/!\[([^\]]*)\]\([^\n]+?\)/g, (_, alt) => {
    captions.push(alt.replace(/^Image \d+:\s*/i, '').trim())
    return ''
  })

  for (const caption of captions.filter(Boolean)) {
    result = result.replace(new RegExp(`^${escapeRegExp(caption)}\\s*$`, 'gmi'), '')
  }
  return result
}

function cleanMarkdown(raw, title) {
  const marker = 'Markdown Content:'
  let markdown = raw.includes(marker) ? raw.slice(raw.indexOf(marker) + marker.length) : raw

  const headingPattern = new RegExp(`^#\\s+${escapeRegExp(title)}\\s*$`, 'mi')
  const headingMatch = markdown.match(headingPattern) || markdown.match(/^#\s+.+$/m)
  if (headingMatch?.index !== undefined) {
    markdown = markdown.slice(headingMatch.index + headingMatch[0].length)
  }

  const openingWindow = markdown.slice(0, 6000)
  const preferMatches = [...openingWindow.matchAll(/^\[Prefer\]\([^\n]+\)\s*$/gmi)]
  const lastPrefer = preferMatches.at(-1)
  if (lastPrefer?.index !== undefined) {
    markdown = markdown.slice(lastPrefer.index + lastPrefer[0].length)
  } else {
    const firstImage = openingWindow.search(/^(?:\[!)?\!\[/m)
    if (firstImage >= 0) markdown = markdown.slice(firstImage)
  }

  markdown = removeImages(markdown)

  const endings = [
    '\n## Don\'t Stop Midway!',
    '\n## Why subscribe',
    '\n## Get Swarajya',
    '\n## Please Sign In To Continue Reading',
    '\nTags*',
    '\nTags\n',
    '\nComments ↓',
    '\nComments â†“',
  ]
  const cutoff = endings
    .map((ending) => markdown.indexOf(ending))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0]
  if (cutoff !== undefined) markdown = markdown.slice(0, cutoff)

  return markdown
    .replace(/^\[\]\([^\n]+\)\s*$/gm, '')
    .replace(/^Save & read from anywhere!\s*$/gmi, '')
    .replace(/^Bookmark stories for easy access.*$/gmi, '')
    .replace(/^Sign In\s*$/gmi, '')
    .replace(/^Please click here to add.*$/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    const target = new URL(request.query.url)
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
      return response.status(400).json({ error: 'Invalid article URL.' })
    }

    const readerResponse = await fetch(`https://r.jina.ai/${target.toString()}`, {
      headers: {
        Accept: 'text/markdown',
        'User-Agent': 'Swarajya Reader/1.0',
      },
      signal: AbortSignal.timeout(25000),
    })
    if (!readerResponse.ok) throw new Error(`Reader returned ${readerResponse.status}`)

    const raw = await readerResponse.text()
    const title = raw.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || 'Swarajya'
    const published = raw.match(/^Published Time:\s*(.+)$/m)?.[1]?.trim() || null
    const markdown = cleanMarkdown(raw, title)
    if (!markdown) throw new Error('No article body found')

    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return response.status(200).json({ title, published, markdown })
  } catch (error) {
    return response.status(502).json({ error: 'Unable to prepare this article.', detail: error.message })
  }
}
