import React, { useEffect, useMemo, useState } from 'react'

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

function StoryImage({ story, eager = false }) {
  if (!story.image) {
    return <div className="image-fallback" aria-hidden="true"><span>S</span></div>
  }

  return <img className="story-image" src={story.image} alt={story.title} loading={eager ? 'eager' : 'lazy'} />
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

function Story({ story, variant = 'standard', eager = false }) {
  return (
    <article className={`story story--${variant}`}>
      <div className="story-media"><StoryImage story={story} eager={eager} /></div>
      <div className="story-copy">
        <StoryMeta story={story} />
        <h2>{story.title}</h2>
        {story.summary ? <p className="story-summary">{story.summary}</p> : null}
      </div>
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

function App() {
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadFeed(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/feed${isRefresh ? `?t=${Date.now()}` : ''}`)
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

  const stories = useMemo(() => feed?.entries || [], [feed])
  const lead = stories[0]
  const supporting = stories.slice(1, 3)
  const remaining = stories.slice(3)

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
              <Story story={lead} variant="lead" eager />
              <div className="supporting-stories">
                {supporting.map((story) => <Story key={story.id} story={story} variant="supporting" />)}
              </div>
            </section>
            <section className="story-index" aria-labelledby="all-stories-title">
              <div className="index-heading">
                <h1 id="all-stories-title">All stories</h1>
                <p>{stories.length} stories</p>
              </div>
              <div className="story-wall">
                {remaining.map((story) => <Story key={story.id} story={story} />)}
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
