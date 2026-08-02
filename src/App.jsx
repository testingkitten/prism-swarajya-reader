import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const FEED_VERSION = 'swarajya-v3'

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

function Header({ onRefresh, refreshing, updated, count }) {
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
    img: () => null,
    h1: ({ children }) => <h2>{children}</h2>,
  }
}

function ArticleView({ story, onClose }) {
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

    fetch(`/api/article?url=${encodeURIComponent(story.url)}`)
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

      <main className="article-page">
        <article className="article-reading">
          <header className="article-header">
            <StoryMeta story={story} />
            <h1>{article?.title && story.title === 'Swarajya' ? article.title : story.title}</h1>
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

  useEffect(() => {
    if (!articleUrl) document.title = 'Swarajya'
  }, [articleUrl])

  const stories = useMemo(() => feed?.entries || [], [feed])
  const selectedStory = articleUrl ? storyFromUrl(articleUrl, stories) : null
  const lead = stories[0]
  const supporting = stories.slice(1, 3)
  const remaining = stories.slice(3)

  function openStory(story) {
    const url = new URL(window.location.href)
    url.searchParams.set('article', story.url)
    window.history.pushState({}, '', url)
    setArticleUrl(story.url)
  }

  function closeStory() {
    const url = new URL(window.location.href)
    url.searchParams.delete('article')
    window.history.pushState({}, '', url)
    setArticleUrl(null)
    document.title = 'Swarajya'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Direct internal article URLs work even before / after feed load.
  if (selectedStory && articleUrl) {
    // Wait briefly for feed metadata when available, but do not block first paint forever.
    const enriched = storyFromUrl(articleUrl, stories)
    if (enriched.title === 'Swarajya' && loading) {
      return (
        <div className="page-shell">
          <Header onRefresh={() => loadFeed(true)} refreshing={refreshing} />
          <main>
            <LoadingState />
          </main>
        </div>
      )
    }
    return <ArticleView story={enriched} onClose={closeStory} />
  }

  return (
    <div className="page-shell">
      <Header
        onRefresh={() => loadFeed(true)}
        refreshing={refreshing}
        updated={feed?.updated || feed?.fetchedAt}
        count={stories.length || feed?.count}
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
