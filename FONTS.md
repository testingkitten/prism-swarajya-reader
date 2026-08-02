# Font licensing

## Reference repository

Design and typography roles are informed by:

https://github.com/FrancesCoronel/nyt-comm

That repository is MIT-licensed **for its software and project files**. It also contains or references New York Times proprietary typefaces:

- Cheltenham (masthead / major headlines)
- Franklin (navigation, dates, categories, utility)
- Imperial (long-form body)
- Other NYT families (Karnak, Stymie, Mag, etc.)

## Why those fonts are not shipped here

The MIT license on the student project does **not** grant redistribution rights for proprietary NYT font binaries. The font assets and CDN paths in that repository remain owned by The New York Times / their type vendors.

This project therefore:

- Does **not** copy Cheltenham, Franklin, Imperial, or other NYT font files into production.
- Does **not** hotlink `a1.nyt.com` or other NYT font CDNs.
- Does **not** use the New York Times name, logo, wordmark, or branded artwork.

## Production stand-ins (role-mapped)

Until the publication owner supplies properly licensed font files for the intended roles, production uses open Google Fonts mapped to the same editorial roles:

| Role | Intended family | Production stand-in |
|------|-----------------|---------------------|
| Masthead & major headlines | Cheltenham | **Newsreader** |
| Navigation, dates, categories, buttons, utility | Franklin | **Libre Franklin** |
| Long-form article body | Imperial | **Source Serif 4** |

These are deliberate open-source editorial substitutes, not silent unrelated replacements. CSS custom properties document the mapping:

- `--font-display` → Cheltenham role
- `--font-sans` → Franklin role
- `--font-body` → Imperial role

## How to install licensed fonts later

1. Place licensed `woff2` files under `public/fonts/`.
2. Add `@font-face` rules in `src/styles.css`.
3. Point `--font-display`, `--font-sans`, and `--font-body` at the licensed family names.
4. Remove the Google Fonts `@import` once local faces cover the required weights.
