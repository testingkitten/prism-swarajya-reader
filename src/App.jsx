import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const FEED_VERSION = 'swarajya-v4'
const ALLOWED_HOSTS = new Set(['swarajyamag.com', 'www.swarajyamag.com'])

function formatDate(value, options = {}) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(value))
}

function shortDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function indianLongDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value instanceof Date ? value : new Date(value))
}

/** Extract and canonicalize a Swarajya article URL from free text / clipboard paste. */
function parseSwarajyaUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null

  // Prefer first URL-looking token in pasted text.
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i) || text.match(/(?:www\.)?swarajyamag\.com\/[^\s<>"')\]]+/i)
  let candidate = match ? match[0] : text
  candidate = candidate.replace(/[.,;:!?)}\]]+$/g, '')

  if (!/^https?:\/\//i.test(candidate)) {
    if (/^(?:www\.)?swarajyamag\.com\//i.test(candidate)) {
      candidate = `https://${candidate.replace(/^\/\//, '')}`
    } else {
      return null
    }
  }

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null
    url.protocol = 'https:'
    url.hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    url.hash = ''
    // Keep meaningful path; drop tracking query.
    url.search = ''
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    if (url.pathname === '/') return null
    return url.toString()
  } catch {
    return null
  }
}

function StoryMeta({ story }) {
  return (
    <p className="story-meta">
      <span>{story.categories?.[0] || 'Latest'}</span>
      <span aria-hidden="true">·</span>
      <span>{story.author || 'Swarajya'}</span>
      {story.published ? (
        <>
          <span aria-hidden="true">·</span>
          <time dateTime={story.published}>{shortDate(story.published)}</time>
        </>
      ) : null}
    </p>
  )
}

function Story({ story, variant = 'standard', onOpen }) {
  return (
    <article className={`story story--${variant}`}>
      <button
        className="story-button"
        type="button"
        onClick={() => onOpen(story)}
        aria-label={`Read article: ${story.title}`}
      >
        <StoryMeta story={story} />
        <h2>{story.title}</h2>
        {story.summary ? <p className="story-summary">{story.summary}</p> : null}
        <span className="read-label">
          Read article <span aria-hidden="true">→</span>
        </span>
      </button>
    </article>
  )
}

function ImportBar({ onImport, importError, onClearError }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  const tryImport = useCallback(
    (text) => {
      const url = parseSwarajyaUrl(text)
      if (!url) return false
      setValue('')
      onImport(url)
      return true
    },
    [onImport],
  )

  function handlePaste(event) {
    const text = event.clipboardData?.getData('text') || ''
    if (parseSwarajyaUrl(text)) {
      event.preventDefault()
      tryImport(text)
    }
  }

  function handleChange(event) {
    const next = event.target.value
    setValue(next)
    onClearError?.()
    // Instant open when a full valid URL is typed/pasted into the field.
    if (parseSwarajyaUrl(next)) {
      tryImport(next)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!value.trim()) return
    if (!tryImport(value)) onImport(value)
  }

  return (
    <form className="import-bar" onSubmit={handleSubmit} aria-label="Open Swarajya article by link">
      <label className="import-label" htmlFor="swarajya-import">
        Paste link
      </label>
      <input
        ref={inputRef}
        id="swarajya-import"
        className="import-input"
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        placeholder="Paste any swarajyamag.com article link…"
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        aria-invalid={importError ? 'true' : 'false'}
        aria-describedby={importError ? 'import-error' : undefined}
      />
      {importError ? (
        <p id="import-error" className="import-error" role="alert">
          {importError}
        </p>
      ) : (
        <p className="import-hint">Paste → opens instantly. Images render in the reader.</p>
      )}
    </form>
  )
}

function Header({ onRefresh, refreshing, updated, count, onImport, importError, onClearError }) {
  return (
    <header className="masthead">
      <div className="utility-bar">
        <span>{indianLongDate()}</span>
        <span className="utility-center">India edition</span>
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Updating…' : 'Refresh'}
        </button>
      </div>
      <h1 className="masthead-name">Swarajya</h1>
      <ImportBar onImport={onImport} importError={importError} onClearError={onClearError} />
      <div className="double-rule" aria-hidden="true" />
      <div className="subhead">
        <span>Latest stories</span>
        <span className="subhead-meta">
          {typeof count === 'number' ? <span>{count} stories</span> : null}
          {updated ? (
            <time dateTime={updated}>
              Updated {formatDate(updated, { hour: 'numeric', minute: '2-digit' })}
            </time>
          ) : null}
        </span>
      </div>
      <div className="single-rule" aria-hidden="true" />
    </header>
  )
}

function LoadingState() {
  return (
    <div className="loading-wall" aria-label="Loading stories" aria-live="polite">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className="skeleton" key={item} />
      ))}
    </div>
  )
}

function markdownComponents() {
  return {
    a: ({ children }) => <span className="link-text">{children}</span>,
    img: ({ src, alt }) => {
      if (!src || !/^https?:\/\//i.test(src)) return null
      return (
        <img
          className="article-image"
          src={src}
          alt={alt || ''}
          title={alt || undefined}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )
    },
    h1: ({ children }) => <h2>{children}</h2>,
  }
}

function ArticleView({ story, onClose, onImport, importError, onClearError }) {
  const [article, setArticle] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadArticle = useCallback(() => {
    let active = true
    setArticle(null)
    setError('')
    setLoading(true)
    document.title = `${story.title} — Swarajya`
    window.scrollTo({ top: 0, behavior: 'instant' })

    fetch(`/api/article?url=${encodeURIComponent(story.url)}&v=images-1`)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load this article.')
        return response.json()
      })
      .then((data) => {
        if (!active) return
        setArticle(data)
        if (data.title) document.title = `${data.title} — Swarajya`
        setLoading(false)
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Unable to load this article.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [story])

  useEffect(() => loadArticle(), [loadArticle])

  return (
    <div className="reader-shell">
      <header className="reader-nav">
        <button type="button" onClick={onClose} className="back-button">
          <span aria-hidden="true">←</span> All stories
        </button>
        <button type="button" onClick={onClose} className="reader-brand" aria-label="Back to Swarajya homepage">
          Swarajya
        </button>
        <span className="reader-section">{story.categories?.[0] || 'Article'}</span>
      </header>

      <div className="reader-import-wrap">
        <ImportBar onImport={onImport} importError={importError} onClearError={onClearError} />
      </div>

      <main className="article-page">
        <article className="article-reading">
          <header className="article-header">
            <StoryMeta
              story={{
                ...story,
                author: article?.author || story.author,
                published: article?.published || story.published,
                categories: story.categories?.length ? story.categories : article?.categories || [],
              }}
            />
            <h1>{article?.title && (!story.title || story.title === 'Swarajya') ? article.title : story.title}</h1>
          </header>

          {loading ? (
            <div className="article-loading" aria-live="polite">
              <span />
              <span />
              <span />
              <p>Preparing article…</p>
            </div>
          ) : null}

          {error ? (
            <div className="article-error" aria-live="polite">
              <h2>We could not prepare this article.</h2>
              <p>{error}</p>
              <div className="article-error-actions">
                <button type="button" onClick={loadArticle}>
                  Try again
                </button>
                <button type="button" className="button-secondary" onClick={onClose}>
                  Back to all stories
                </button>
              </div>
            </div>
          ) : null}

          {article ? (
            <div className="article-body">
              {article.partial ? (
                <p className="partial-note" role="note">
                  This article is partially available from the public page. Full subscriber text requires the
                  authorised internal content API.
                </p>
              ) : null}
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents()}>
                {article.markdown}
              </ReactMarkdown>
            </div>
          ) : null}
        </article>
      </main>

      <footer className="reader-footer">Swarajya</footer>
    </div>
  )
}

function storyFromUrl(url, feedStories = []) {
  const match = feedStories.find((story) => story.url === url)
  if (match) return match
  return {
    id: url,
    title: 'Swarajya',
    url,
    author: 'Swarajya',
    published: null,
    summary: '',
    categories: [],
  }
}

function App() {
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [importError, setImportError] = useState('')
  const [articleUrl, setArticleUrl] = useState(() =>
    new URLSearchParams(window.location.search).get('article'),
  )

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/feed?v=${FEED_VERSION}${isRefresh ? `&t=${Date.now()}` : ''}`,
      )
      if (!response.ok) throw new Error('Stories are unavailable right now.')
      const data = await response.json()
      if (!data.entries?.length) throw new Error('No stories are available right now.')
      setFeed(data)
    } catch (requestError) {
      setError(requestError.message || 'Stories are unavailable right now.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  useEffect(() => {
    const handlePopState = () => {
      setArticleUrl(new URLSearchParams(window.location.search).get('article'))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const stories = useMemo(() => feed?.entries || [], [feed])
  const lead = stories[0]
  const supporting = stories.slice(1, 3)
  const remaining = stories.slice(3)

  const openImportedUrl = useCallback((canonicalUrl) => {
    const parsed = parseSwarajyaUrl(canonicalUrl)
    if (!parsed) {
      setImportError('Paste a full https://swarajyamag.com/… article link.')
      return
    }
    setImportError('')
    setArticleUrl((current) => {
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.set('article', parsed)
      if (current === parsed) {
        window.history.replaceState({}, '', nextUrl)
        // Remount same article.
        queueMicrotask(() => setArticleUrl(parsed))
        return null
      }
      window.history.pushState({}, '', nextUrl)
      return parsed
    })
  }, [])

  // Global paste: Ctrl/Cmd+V of a Swarajya URL opens the reader immediately.
  useEffect(() => {
    function handleGlobalPaste(event) {
      const target = event.target
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const text = event.clipboardData?.getData('text') || ''
      const url = parseSwarajyaUrl(text)
      if (!url) return
      event.preventDefault()
      openImportedUrl(url)
    }
    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [openImportedUrl])

  useEffect(() => {
    if (!articleUrl) document.title = 'Swarajya'
  }, [articleUrl])

  function openStory(story) {
    const url = new URL(window.location.href)
    url.searchParams.set('article', story.url)
    window.history.pushState({}, '', url)
    setArticleUrl(story.url)
    setImportError('')
  }

  function closeStory() {
    const url = new URL(window.location.href)
    url.searchParams.delete('article')
    window.history.pushState({}, '', url)
    setArticleUrl(null)
    document.title = 'Swarajya'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Direct / pasted article URLs open immediately (no feed wait).
  if (articleUrl) {
    const enriched = storyFromUrl(articleUrl, stories)
    return (
      <ArticleView
        story={enriched}
        onClose={closeStory}
        onImport={openImportedUrl}
        importError={importError}
        onClearError={() => setImportError('')}
      />
    )
  }

  return (
    <div className="page-shell">
      <Header
        onRefresh={() => loadFeed(true)}
        refreshing={refreshing}
        updated={feed?.updated || feed?.fetchedAt}
        count={stories.length || feed?.count}
        onImport={openImportedUrl}
        importError={importError}
        onClearError={() => setImportError('')}
      />
      <main>
        {loading ? <LoadingState /> : null}
        {error ? (
          <section className="empty-state" aria-live="polite">
            <h2>Unable to load the latest stories.</h2>
            <p>{error}</p>
            <button type="button" onClick={() => loadFeed(true)}>
              Try again
            </button>
          </section>
        ) : null}
        {!loading && !error && lead ? (
          <>
            <section className="lead-grid" aria-label="Lead stories">
              <Story story={lead} variant="lead" onOpen={openStory} />
              <div className="supporting-stories">
                {supporting.map((story) => (
                  <Story key={story.id || story.url} story={story} variant="supporting" onOpen={openStory} />
                ))}
              </div>
            </section>
            {remaining.length ? (
              <section className="story-index" aria-labelledby="all-stories-title">
                <div className="index-heading">
                  <h2 id="all-stories-title">All stories</h2>
                  <p>{stories.length} stories</p>
                </div>
                <div className="story-wall">
                  {remaining.map((story) => (
                    <Story key={story.id || story.url} story={story} onOpen={openStory} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
      <footer>Swarajya</footer>
    </div>
  )
}

export default App
