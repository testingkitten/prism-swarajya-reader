# Swarajya

A minimal text-only reader for every item currently available in Swarajya's public RSS feed. Article pages are converted to Markdown through Jina Reader and rendered internally without images or outbound links.

## What it does

- Loads the current RSS feed at `https://swarajyamag.com/stories.rss`
- Fetches through a small Vercel function, so the browser never has to contend with RSS CORS restrictions
- Shows every currently supplied feed item in one text-only page
- Renders full article Markdown inside the reader through an allowlisted server endpoint
- Uses open-source `Spectral` and `DM Sans` typefaces

## Run locally

```bash
npm install
npm run dev
```

For a production-like local server that includes the `/api/feed` endpoint, use `vercel dev`.

## Deploy

Import the GitHub repository into Vercel, or use `vercel --prod` from this folder. No environment variables are required.

## Attribution

This is an independent feed interface. Article content and rights remain with their respective publisher.
