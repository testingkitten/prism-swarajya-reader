# Swarajya

A minimal editorial view of every item currently available in Swarajya's public Atom feed. It presents the feed's headline and summary metadata and retrieves the article's published social-preview image for each card.

## What it does

- Loads the verified production feed at `https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml`
- Fetches through a small Vercel function, so the browser never has to contend with RSS CORS restrictions
- Shows every currently supplied feed item in one image-led page
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

This is an independent feed interface. Article content and rights remain with their respective publisher.
