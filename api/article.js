const ALLOWED_HOSTS = new Set(['swarajyamag.com', 'www.swarajyamag.com'])

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function canonicalizeUrl(rawUrl) {
  const url = new URL(rawUrl)
  url.hash = ''
  url.hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
  url.protocol = 'https:'
  url.search = ''
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString()
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n*/, '')
}

function removeImages(markdown) {
  const captions = []

  const withoutLinkedImages = markdown.replace(
    /\[!\[([^\]]*)\]\([^)\n]+\)\]\([^)\n]+\)/g,
    (_, alt) => {
      captions.push(String(alt).replace(/^Image\s*\d+:\s*/i, '').trim())
      return ''
    },
  )

  let result = withoutLinkedImages.replace(/!\[([^\]]*)\]\([^)\n]+\)/g, (_, alt) => {
    captions.push(String(alt).replace(/^Image\s*\d+:\s*/i, '').trim())
    return ''
  })

  for (const caption of captions.filter(Boolean)) {
    result = result.replace(new RegExp(`^\\s*${escapeRegExp(caption)}\\s*$`, 'gmi'), '')
  }

  return result
}

function cutAtFirstMatch(markdown, patterns) {
  let cutoff
  for (const pattern of patterns) {
    const match = markdown.match(pattern)
    if (match?.index !== undefined) {
      cutoff = cutoff === undefined ? match.index : Math.min(cutoff, match.index)
    }
  }
  return cutoff === undefined ? markdown : markdown.slice(0, cutoff)
}

function looksPaywalled(raw) {
  // Free public articles still show post-body CTAs such as "Don't Stop Midway!".
  // Only treat true mid-article paywall gates as partial.
  const markers = [
    /Please Sign In To Continue Reading/i,
    /This is your last free article/i,
    /Please Sign In to read the full article/i,
  ]
  return markers.some((marker) => marker.test(raw))
}

function cleanMarkdown(raw, title) {
  const marker = 'Markdown Content:'
  let markdown = raw.includes(marker) ? raw.slice(raw.indexOf(marker) + marker.length) : raw
  markdown = stripFrontMatter(markdown)

  // Drop everything before the primary article heading when present.
  const headingPattern = title
    ? new RegExp(`^#\\s+${escapeRegExp(title)}\\s*$`, 'mi')
    : null
  const headingMatch =
    (headingPattern && markdown.match(headingPattern)) || markdown.match(/^#\s+.+$/m)
  if (headingMatch?.index !== undefined) {
    markdown = markdown.slice(headingMatch.index + headingMatch[0].length)
  }

  // Drop chrome that still sits above the body (share buttons, prefer prompts, hero image).
  const openingWindow = markdown.slice(0, 8000)
  const preferMatches = [...openingWindow.matchAll(/^\[Prefer\]\([^)\n]+\)\s*$/gmi)]
  const lastPrefer = preferMatches.at(-1)
  if (lastPrefer?.index !== undefined) {
    markdown = markdown.slice(lastPrefer.index + lastPrefer[0].length)
  } else {
    const firstImage = openingWindow.search(/^(?:\[!)?!\[/m)
    if (firstImage >= 0) markdown = markdown.slice(firstImage)
  }

  markdown = removeImages(markdown)

  // End the article before website chrome / promotions.
  markdown = cutAtFirstMatch(markdown, [
    /\n##\s*Don't Stop Midway!/i,
    /\n##\s*Please Sign In To Continue Reading/i,
    /\nPlease Sign In To Continue Reading/i,
    /\nThis is your last free article/i,
    /\n##\s*Why subscribe/i,
    /\n##\s*Get Swarajya/i,
    /\n##\s*Magazine\b/i,
    /\nTags\*?\s*(?:\n|\*)/i,
    /\nComments\s*[↓â†“]*\s*$/im,
    /\nComments\s/i,
    /\nWe light sparks\./i,
    /\nJoin our WhatsApp channel/i,
    /\nAbout Swarajya\s*$/im,
    /\nUseful Links\s*$/im,
    /\nAlso Read:/i,
    /\n\*\*\[Please click here to add\]/i,
    /\nPlease click here to add/i,
    /\nBecome a Patron/i,
    /\nBecome a Subscriber/i,
  ])

  // Line-level cleanups for residual chrome.
  const dropLinePatterns = [
    /^\[\]\([^)\n]+\)\s*$/,
    /^Save\s*&\s*read from anywhere!?\s*$/i,
    /^Bookmark stories for easy access.*$/i,
    /^Sign In\s*$/i,
    /^Sign In with Google\s*$/i,
    /^Close Sidebar\s*$/i,
    /^Subscribe\s*$/i,
    /^\[Subscribe\]\([^)\n]+\)\s*$/i,
    /^\[Sign In\]\([^)\n]+\)\s*$/i,
    /^\[Prefer\]\([^)\n]+\)\s*$/i,
    /^Please click here to add.*$/i,
    /^\*\*\[Please click here to add\].*$/i,
    /^Also Read:.*$/i,
    /^Join our WhatsApp channel.*$/i,
    /^We light sparks\..*$/i,
    /^Every story at Swarajya begins the same way:.*$/i,
    /^This is what your subscription funds\..*$/i,
    /^Join us\. Lets keep the sparks coming\.\s*$/i,
    /^\[Become a (Patron|Subscriber)\]\([^)\n]+\)\s*$/i,
    /^Our Views\s*$/i,
    /^\[_?\*?_?\s*PRO New\]\([^)\n]+\)\s*$/i,
    /^\[Magazine\]\([^)\n]+\)\s*$/i,
    /^\[Headlines\]\([^)\n]+\)\s*$/i,
    /^\[Store\]\([^)\n]+\)\s*$/i,
    /^Aug\s+\d{1,2},\s+\d{4}\s*\|\s*Updated.*$/i,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\s*\|\s*Updated.*$/i,
    /^\[News Brief\]\([^)\n]+\)\s*$/i,
    /^\[Books\]\([^)\n]+\)\s*$/i,
    /^\[Politics\]\([^)\n]+\)\s*$/i,
    /^\[Economy\]\([^)\n]+\)\s*$/i,
    /^\[Infrastructure\]\([^)\n]+\)\s*$/i,
    /^\[Defence\]\([^)\n]+\)\s*$/i,
    /^\[World\]\([^)\n]+\)\s*$/i,
    /^\[Culture\]\([^)\n]+\)\s*$/i,
    /^\[States\]\([^)\n]+\)\s*$/i,
  ]

  // Author byline lines that appear only as residual chrome above the body.
  const authorOnly = /^\[[^\]]+\]\(https?:\/\/(?:www\.)?swarajyamag\.com\/author\/[^)\n]+\)\s*$/i

  const bodyLines = []
  let started = false
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()
    if (!started) {
      if (!trimmed) continue
      if (dropLinePatterns.some((pattern) => pattern.test(trimmed))) continue
      if (authorOnly.test(trimmed)) continue
      started = true
    }
    if (dropLinePatterns.some((pattern) => pattern.test(trimmed))) continue
    bodyLines.push(line)
  }

  markdown = bodyLines.join('\n')

  // Author promotion / bio boxes often appear after the body.
  markdown = markdown.replace(
    /\n[A-Z][^\n]{2,80}\s+is a (Newsroom Associate|Senior|Contributor|Fellow|Columnist|Writer|Editor)[^\n]*\n?/gi,
    '\n',
  )
  markdown = markdown.replace(/\n[A-Z][^\n]{2,80}\s+tracks [^\n]{10,160}\n?/gi, '\n')

  // Collapse leftover empty links and repeated blank lines.
  // Keep non-empty Markdown links so the client can render them as non-navigating text.
  markdown = markdown
    .replace(/\[\]\([^)\n]+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return markdown
}

async function fetchInternalContent(canonicalUrl) {
  const endpoint = process.env.SWARAJYA_CONTENT_API_URL
  if (!endpoint) return null

  const headers = {
    Accept: 'application/json',
    'User-Agent': 'Swarajya/1.0',
  }
  if (process.env.SWARAJYA_CONTENT_API_KEY) {
    headers.Authorization = `Bearer ${process.env.SWARAJYA_CONTENT_API_KEY}`
  }
  if (process.env.SWARAJYA_CONTENT_API_HEADER && process.env.SWARAJYA_CONTENT_API_HEADER_VALUE) {
    headers[process.env.SWARAJYA_CONTENT_API_HEADER] = process.env.SWARAJYA_CONTENT_API_HEADER_VALUE
  }

  const url = new URL(endpoint)
  url.searchParams.set('url', canonicalUrl)

  const response = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Internal content API returned ${response.status}`)

  const data = await response.json()
  const markdown = data.markdown || data.body || data.content
  if (!markdown || typeof markdown !== 'string') {
    throw new Error('Internal content API response missing markdown body')
  }

  return {
    title: data.title || null,
    published: data.published || data.publishedAt || null,
    markdown: cleanMarkdown(markdown, data.title || ''),
    source: 'internal',
    partial: false,
  }
}

async function fetchJina(canonicalUrl) {
  const response = await fetch(`https://r.jina.ai/${canonicalUrl}`, {
    headers: {
      Accept: 'text/markdown',
      'User-Agent': 'Swarajya/1.0 (+https://swarajya-reader.vercel.app)',
      'X-Return-Format': 'markdown',
    },
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`Jina Reader returned ${response.status}`)
  return response.text()
}

async function fetchMarkdownNew(canonicalUrl) {
  const response = await fetch(`https://markdown.new/${canonicalUrl}`, {
    headers: {
      Accept: 'text/markdown, text/plain, */*',
      'User-Agent': 'Swarajya/1.0 (+https://swarajya-reader.vercel.app)',
    },
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) throw new Error(`markdown.new returned ${response.status}`)
  return response.text()
}

function extractMeta(raw) {
  const title = raw.match(/^Title:\s*(.+)$/m)?.[1]?.trim()
    || raw.match(/^title:\s*(.+)$/m)?.[1]?.trim()
    || raw.match(/^#\s+(.+)$/m)?.[1]?.trim()
    || 'Swarajya'
  const published =
    raw.match(/^Published Time:\s*(.+)$/m)?.[1]?.trim()
    || raw.match(/^published:\s*(.+)$/m)?.[1]?.trim()
    || null
  return { title, published }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    if (!request.query?.url) {
      return response.status(400).json({ error: 'Missing url query parameter.' })
    }

    let target
    try {
      target = new URL(request.query.url)
    } catch {
      return response.status(400).json({ error: 'Invalid article URL.' })
    }

    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
      return response.status(400).json({ error: 'Invalid article URL.' })
    }

    const canonicalUrl = canonicalizeUrl(target.toString())

    // Prefer authorised internal content when configured (full subscriber body).
    try {
      const internal = await fetchInternalContent(canonicalUrl)
      if (internal?.markdown) {
        response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
        return response.status(200).json({
          title: internal.title || 'Swarajya',
          published: internal.published,
          markdown: internal.markdown,
          source: 'internal',
          partial: false,
          url: canonicalUrl,
        })
      }
    } catch {
      // Fall through to public converters when internal API is unavailable.
    }

    let raw
    let converter = 'jina'
    try {
      raw = await fetchJina(canonicalUrl)
    } catch (jinaError) {
      try {
        raw = await fetchMarkdownNew(canonicalUrl)
        converter = 'markdown.new'
      } catch {
        throw jinaError
      }
    }

    const { title, published } = extractMeta(raw)
    const markdown = cleanMarkdown(raw, title)
    if (!markdown) throw new Error('No article body found')

    const partial = looksPaywalled(raw)

    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return response.status(200).json({
      title,
      published,
      markdown,
      source: converter,
      partial,
      url: canonicalUrl,
    })
  } catch (error) {
    return response.status(502).json({
      error: 'Unable to prepare this article.',
      detail: error.message,
    })
  }
}
