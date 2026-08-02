# Prism — Swarajya Reader

A minimal editorial reader for the latest [Swarajya](https://swarajyamag.com/) stories. It reads the publication's publicly available Atom feed, presents headlines and feed-provided summaries, and sends readers to Swarajya for every full article.

## What it does

- Loads the verified production feed at `https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml`
- Fetches through a small Vercel function, so the browser never has to contend with RSS CORS restrictions
- Supports headline search, section filters, local-only saved stories, and refresh
- Uses original `Newsreader` and `Libre Franklin` typefaces for a classic newspaper feel; no New York Times fonts, marks, or artwork are included

## Run locally

```bash
npm install
npm run dev
```

For a production-like local server that includes the `/api/feed` endpoint, use `vercel dev`.

## Deploy

Import the GitHub repository into Vercel, or use `vercel --prod` from this folder. No environment variables are required.

## Attribution

Prism is an independent feed reader. It is not affiliated with Swarajya or The New York Times. Article content and rights remain with their respective publisher.
