import React, { useEffect, useMemo, useState } from 'react'

const RSS_URL = 'https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml'

function formatDate(value, options = {}) {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    ...options,
  }).format(new Date(value))
}

function relativeTime(value) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
  return formatDate(value)
}

function BookmarkIcon({ filled = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M6.25 3.5h11.5v17l-5.75-3.75-5.75 3.75v-17Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.45" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="external-icon">
      <path d="M13 5h6v6M19 5l-9.5 9.5M18 13.5V19H5V6h5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}

function StoryMeta({ story, compact = false }) {
  return (
    <p className={`story-meta${compact ? ' story-meta--compact' : ''}`}>
      <span>{story.categories?.[0] || 'Latest'}</span>
      <span aria-hidden="true">·</span>
      <span>{story.author || 'Swarajya'}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={story.published}>{compact ? relativeTime(story.published) : formatDate(story.published)}</time>
    </p>
  )
}

function OpenStory({ story, className = '' }) {
  return (
    <a className={className} href={story.url} target="_blank" rel="noreferrer" aria-label={`Read ${story.title} on Swarajya`}>
      Read at source <ExternalIcon />
    </a>
  )
}

function StoryCard({ story, featured = false, saved, onToggleSave }) {
  return (
    <article className={`story-card${featured ? ' story-card--featured' : ''}`}>
      <div className="story-card__topline">
        <StoryMeta story={story} />
        <button
          className={`save-button${saved ? ' save-button--saved' : ''}`}
          type="button"
          onClick={() => onToggleSave(story.id)}
          aria-label={saved ? `Remove ${story.title} from saved stories` : `Save ${story.title}`}
          aria-pressed={saved}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </div>
      <h2>{story.title}</h2>
      {story.summary ? <p className="story-card__summary">{story.summary}</p> : null}
      <OpenStory story={story} className="source-link" />
    </article>
  )
}

function Header({ onRefresh, refreshing, savedCount, showSaved, onShowSaved, search, onSearch }) {
  return (
    <>
      <a className="skip-link" href="#stories">Skip to stories</a>
      <header className="masthead">
        <div className="utility-bar">
          <a href={RSS_URL} target="_blank" rel="noreferrer">RSS feed</a>
          <span>New Delhi · {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
          <button type="button" onClick={onRefresh} disabled={refreshing} className="refresh-button">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="brand-row">
          <a className="wordmark" href="/" aria-label="Prism home">PRISM</a>
          <p className="edition">THE DAILY READER</p>
          <button type="button" className={`saved-toggle${showSaved ? ' saved-toggle--active' : ''}`} onClick={onShowSaved}>
            <BookmarkIcon filled={showSaved} />
            Saved{savedCount ? ` (${savedCount})` : ''}
          </button>
        </div>
        <div className="rule rule--heavy" />
        <nav className="section-nav" aria-label="Reader controls">
          <p>Latest from Swarajya</p>
          <label className="search-field">
            <span className="sr-only">Search headlines</span>
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search headlines" />
            <span aria-hidden="true">⌕</span>
          </label>
        </nav>
        <div className="rule" />
      </header>
    </>
  )
}

function LoadingGrid() {
  return (
    <div className="loading-grid" aria-label="Loading the latest stories" aria-live="polite">
      {[1, 2, 3, 4, 5].map((item) => <div className="skeleton" key={item} />)}
    </div>
  )
}

function App() {
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showSaved, setShowSaved] = useState(false)
  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('prism-saved-stories') || '[]')) } catch { return new Set() }
  })

  async function loadFeed(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/feed${isRefresh ? `?t=${Date.now()}` : ''}`)
      if (!response.ok) throw new Error('The feed is unavailable right now.')
      const data = await response.json()
      if (!data.entries?.length) throw new Error('The feed returned no stories.')
      setFeed(data)
    } catch (requestError) {
      setError(requestError.message || 'Could not load the latest stories.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadFeed() }, [])

  useEffect(() => {
    localStorage.setItem('prism-saved-stories', JSON.stringify([...saved]))
  }, [saved])

  const categories = useMemo(() => {
    const all = feed?.entries.flatMap((story) => story.categories || []) || []
    return ['All', ...[...new Set(all)].filter((category) => category !== 'News Brief').slice(0, 6)]
  }, [feed])

  const stories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return (feed?.entries || []).filter((story) => {
      const matchesSearch = !query || `${story.title} ${story.summary} ${story.author}`.toLocaleLowerCase().includes(query)
      const matchesCategory = activeCategory === 'All' || story.categories?.includes(activeCategory)
      const matchesSaved = !showSaved || saved.has(story.id)
      return matchesSearch && matchesCategory && matchesSaved
    })
  }, [feed, search, activeCategory, showSaved, saved])

  function toggleSave(id) {
    setSaved((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const lead = stories[0]
  const secondary = stories.slice(1, 3)
  const latest = stories.slice(3)

  return (
    <div className="page-shell">
      <Header
        onRefresh={() => loadFeed(true)}
        refreshing={refreshing}
        savedCount={saved.size}
        showSaved={showSaved}
        onShowSaved={() => setShowSaved((current) => !current)}
        search={search}
        onSearch={setSearch}
      />
      <main id="stories">
        <section className="intro" aria-labelledby="reader-title">
          <div>
            <p className="eyebrow">Curated from the public feed</p>
            <h1 id="reader-title">The essential read, without the noise.</h1>
          </div>
          <p className="intro__note">A reader for Swarajya’s latest reporting. Headlines, feed excerpts and links remain attributed to the original publisher.</p>
        </section>

        {!loading && !error ? (
          <div className="category-row" aria-label="Filter by section">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setActiveCategory(category)} className={activeCategory === category ? 'category-button category-button--active' : 'category-button'}>
                {category}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? <LoadingGrid /> : null}
        {error ? (
          <section className="empty-state" aria-live="polite">
            <p className="eyebrow">Feed unavailable</p>
            <h2>We couldn’t load the latest dispatches.</h2>
            <p>The source may be temporarily unreachable. You can go straight to Swarajya or try again.</p>
            <div className="empty-state__actions">
              <button type="button" onClick={() => loadFeed(true)}>Try again</button>
              <a href="https://swarajyamag.com/" target="_blank" rel="noreferrer">Visit Swarajya <ExternalIcon /></a>
            </div>
          </section>
        ) : null}

        {!loading && !error && lead ? (
          <>
            <section className="top-stories" aria-label="Top stories">
              <StoryCard story={lead} featured saved={saved.has(lead.id)} onToggleSave={toggleSave} />
              <div className="secondary-stories">
                {secondary.map((story) => <StoryCard key={story.id} story={story} saved={saved.has(story.id)} onToggleSave={toggleSave} />)}
              </div>
              <aside className="latest-rail" aria-labelledby="latest-title">
                <div className="latest-rail__heading">
                  <p className="eyebrow" id="latest-title">In brief</p>
                  <span>{feed.updated ? `Updated ${relativeTime(feed.updated)}` : 'Live feed'}</span>
                </div>
                {latest.slice(0, 5).map((story) => (
                  <article className="latest-item" key={story.id}>
                    <StoryMeta story={story} compact />
                    <a href={story.url} target="_blank" rel="noreferrer">{story.title}</a>
                  </article>
                ))}
              </aside>
            </section>

            {latest.length > 5 ? (
              <section className="all-stories" aria-labelledby="all-stories-title">
                <div className="section-heading">
                  <p className="eyebrow">More to read</p>
                  <h2 id="all-stories-title">Latest dispatches</h2>
                </div>
                <div className="story-list">
                  {latest.slice(5).map((story) => <StoryCard key={story.id} story={story} saved={saved.has(story.id)} onToggleSave={toggleSave} />)}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {!loading && !error && !lead ? (
          <section className="empty-state">
            <p className="eyebrow">No matches</p>
            <h2>Nothing here yet.</h2>
            <p>Try a different search or remove the current filter.</p>
            <button type="button" onClick={() => { setSearch(''); setActiveCategory('All'); setShowSaved(false) }}>Clear filters</button>
          </section>
        ) : null}
      </main>
      <footer>
        <div className="rule rule--heavy" />
        <p>PRISM is an independent RSS reader and is not affiliated with Swarajya or The New York Times.</p>
        <a href={RSS_URL} target="_blank" rel="noreferrer">Source feed <ExternalIcon /></a>
      </footer>
    </div>
  )
}

export default App
