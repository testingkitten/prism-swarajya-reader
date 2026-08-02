import React, { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

function StoryMeta({ story }) {
  return (
    <p className="story-meta">
      <span>{story.categories?.[0] || 'Latest'}</span>
      <span aria-hidden="true">·</span>
      <span>{story.author || 'Swarajya'}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={story.published}>{shortDate(story.published)}</time>
    </p>
  )
}

function Story({ story, variant = 'standard', onOpen }) {
  return (
    <article className={`story story--${variant}`}>
      <button className="story-button" type="button" onClick={() => onOpen(story)}>
        <StoryMeta story={story} />
        <h2>{story.title}</h2>
        {story.summary ? <p className="story-summary">{story.summary}</p> : null}
        <span className="read-label">Read article <span aria-hidden="true">→</span></span>
      </button>
    </article>
  )
}

function Header({ onRefresh, refreshing, updated }) {
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <header className="masthead">
      <div className="utility-bar">
        <span>Latest edition</span>
        <span>{date}</span>
        <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Updating…' : 'Update'}</button>
      </div>
      <div className="masthead-name">Swarajya</div>
      <div className="double-rule" />
      <div className="subhead">
        <span>Latest stories</span>
        {updated ? <time dateTime={updated}>Updated {formatDate(updated, { hour: 'numeric', minute: '2-digit' })}</time> : null}
      </div>
      <div className="single-rule" />
    </header>
  )
}

function LoadingState() {
  return (
    <div className="loading-wall" aria-label="Loading stories" aria-live="polite">
      {[1, 2, 3, 4, 5, 6].map((item) => <div className="skeleton" key={item} />)}
    </div>
  )
}

function ArticleView({ story, onClose }) {
  const [article, setArticle] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setArticle(null)
    setError('')
    document.title = `${story.title} — Swarajya`
    window.scrollTo({ top: 0, behavior: 'instant' })

    fetch(`/api/article?url=${encodeURIComponent(story.url)}`)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load this article.')
        return response.json()
      })
      .then((data) => { if (active) setArticle(data) })
      .catch((requestError) => { if (active) setError(requestError.message) })

    return () => { active = false }
  }, [story])

  return (
    <div className="reader-shell">
      <header className="reader-nav">
        <button type="button" onClick={onClose} className="back-button"><span aria-hidden="true">←</span> All stories</button>
        <button type="button" onClick={onClose} className="reader-brand">Swarajya</button>
        <span className="reader-section">Reader</span>
      </header>
      <main className="article-page">
        <article className="article-reading">
          <header className="article-header">
            <StoryMeta story={story} />
            <h1>{story.title}</h1>
          </header>
          {!article && !error ? (
            <div className="article-loading" aria-live="polite">
              <span />
              <span />
              <span />
              <p>Preparing article…</p>
            </div>
          ) : null}
          {error ? (
            <div className="article-error" aria-live="polite">
              <h2>We couldn’t prepare this article.</h2>
              <p>{error}</p>
              <button type="button" onClick={onClose}>Back to all stories</button>
            </div>
          ) : null}
          {article ? (
            <div className="article-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ children }) => <span className="link-text">{children}</span>,
                  img: () => null,
                  h1: ({ children }) => <h2>{children}</h2>,
                }}
              >
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

function App() {
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [articleUrl, setArticleUrl] = useState(() => new URLSearchParams(window.location.search).get('article'))

  async function loadFeed(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/feed?v=markdown-reader-1${isRefresh ? `&t=${Date.now()}` : ''}`)
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
  }

  useEffect(() => { loadFeed() }, [])

  useEffect(() => {
    const handlePopState = () => setArticleUrl(new URLSearchParams(window.location.search).get('article'))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const stories = useMemo(() => feed?.entries || [], [feed])
  const selectedStory = stories.find((story) => story.url === articleUrl)
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

  if (selectedStory) return <ArticleView story={selectedStory} onClose={closeStory} />

  return (
    <div className="page-shell">
      <Header onRefresh={() => loadFeed(true)} refreshing={refreshing} updated={feed?.updated} />
      <main>
        {loading ? <LoadingState /> : null}
        {error ? (
          <section className="empty-state" aria-live="polite">
            <h1>Unable to load the latest stories.</h1>
            <button type="button" onClick={() => loadFeed(true)}>Try again</button>
          </section>
        ) : null}
        {!loading && !error && lead ? (
          <>
            <section className="lead-grid" aria-label="Latest stories">
              <Story story={lead} variant="lead" onOpen={openStory} />
              <div className="supporting-stories">
                {supporting.map((story) => <Story key={story.id} story={story} variant="supporting" onOpen={openStory} />)}
              </div>
            </section>
            <section className="story-index" aria-labelledby="all-stories-title">
              <div className="index-heading">
                <h1 id="all-stories-title">All stories</h1>
                <p>{stories.length} stories</p>
              </div>
              <div className="story-wall">
                {remaining.map((story) => <Story key={story.id} story={story} onOpen={openStory} />)}
              </div>
            </section>
          </>
        ) : null}
      </main>
      <footer>Swarajya</footer>
    </div>
  )
}

export default App
