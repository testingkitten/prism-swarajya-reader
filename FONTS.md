# Fonts

## Source

Editorial faces are taken from:

https://github.com/FrancesCoronel/nyt-comm/tree/master/fonts

Bundled under `public/fonts/` for this Swarajya experiment (authorised internal side project).

## Roles in the product

| Role | Family | CSS variable | Used for |
|------|--------|--------------|----------|
| Display | **Cheltenham** | `--font-display` | Masthead, story headlines, article titles, section titles |
| Utility | **Franklin** | `--font-sans` | Default UI, buttons, tables |
| Meta | **Franklin Small** | `--font-meta` | Dates, categories, utility bar, bylines, labels |
| Body | **Imperial** | `--font-body` | Long-form article Markdown body, lead summaries |

## Files shipped

Only the weights needed for those roles are included (not every condensed/wide/scaps/mag/stymie file from nyt-comm).

- `public/fonts/cheltenham/` — normal 300–800, italic 300–700  
- `public/fonts/franklin/` — normal 300–800, italic 500/700, small 500/700  
- `public/fonts/imperial/` — normal 500–700, italic 500–700  

## Note

These typefaces originate as New York Times custom faces and appear in the archived student project under MIT project licensing. Branding of this app remains **Swarajya** only — no NYT logos, wordmarks, or names.
