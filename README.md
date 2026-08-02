# Swarajya

A minimal, text-only reading client for current Swarajya stories. Articles open and render entirely inside this application — readers are never sent to the original website.

Live: https://swarajya-reader.vercel.app

## What it does

- Merges two public feeds server-side:
  - Primary: https://swarajyamag.com/stories.rss
  - Supplemental: https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml
- Normalises RSS 2.0 and Atom entries, deduplicates by canonical URL, sorts newest first
- Shows every unique current feed item in a newspaper-style, text-only interface
- Converts article pages to Markdown through Jina Reader (`r.jina.ai`), with `markdown.new` as fallback
- Cleans navigation, subscription prompts, images, tags, related stories, and footer chrome
- Renders Markdown with `react-markdown` + `remark-gfm` (no raw HTML, no images, no outbound article links)
- Brands only as **Swarajya**

## Run locally

```bash
npm install
npm run dev
```

For the full stack including `/api/feed` and `/api/article`, use:

```bash
npx vercel dev
```

## Production build

```bash
npm run build
```

## Feed API

`GET /api/feed`

Returns merged, deduplicated entries with `count` matching `entries.length`. Cached with `s-maxage=300` and stale-while-revalidate.

## Article API

`GET /api/article?url=ENCODED_SWARAJYA_URL`

Security:

- HTTPS only
- Allowlist: `swarajyamag.com`, `www.swarajyamag.com`
- GET only
- ~25s timeout on converters

Response includes `markdown`, `partial` (true when the public page is paywalled), and `source` (`jina` | `markdown.new` | `internal`).

### Full subscriber content (optional)

Public conversion may return only a partial body for paywalled pieces. To supply complete authorised text, configure an internal Swarajya content API:

| Environment variable | Purpose |
|----------------------|---------|
| `SWARAJYA_CONTENT_API_URL` | Absolute HTTPS endpoint that accepts `?url=` and returns JSON |
| `SWARAJYA_CONTENT_API_KEY` | Optional bearer token (`Authorization: Bearer …`) |
| `SWARAJYA_CONTENT_API_HEADER` | Optional custom header name |
| `SWARAJYA_CONTENT_API_HEADER_VALUE` | Optional custom header value |

Expected JSON shape:

```json
{
  "title": "Article title",
  "published": "2026-08-01T12:00:00.000Z",
  "markdown": "Full article body as Markdown…"
}
```

Accepted body fields: `markdown`, or `body`, or `content`.

When this endpoint is configured and succeeds, it is preferred over Jina / markdown.new. Credentials never reach the browser.

## Typography

See [FONTS.md](./FONTS.md). Faces from [`FrancesCoronel/nyt-comm/fonts`](https://github.com/FrancesCoronel/nyt-comm/tree/master/fonts) are self-hosted:

- **Cheltenham** — masthead and headlines  
- **Franklin** / **Franklin Small** — navigation, dates, categories, utility  
- **Imperial** — long-form body text

## Attribution

Authorised internal side experiment for Swarajya. Article content and rights remain with the publication and its writers.
