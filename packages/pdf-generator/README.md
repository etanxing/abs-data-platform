# @abs/pdf-generator

Pure-JS PDF generation for DemoReport. Uses `pdf-lib` + `@pdf-lib/fontkit` — no WASM, no Node.js APIs, compatible with Cloudflare Workers.

## Exports

```ts
generateFeasibilityReport(data: ReportData): Promise<GeneratedReport>   // Single (10 pages)
generateComparisonReport(primary, neighbours[]):  Promise<GeneratedReport>  // Professional (11 pages)
generateEnterpriseReport(primary, neighbours[]):  Promise<GeneratedReport>  // Enterprise (12 pages)

setFontBuffers(bufs: FontBuffers | null): void   // override fonts with pre-loaded buffers (testing)
setFontUrls(urls: FontUrls | null): void         // override fonts with fetch URLs (Workers/CDN)
```

## Default font

**DM Sans** — static TTF, embedded at build time from `fonts/dm-sans-*.ttf`.

In Node.js, fonts are read from `../fonts/` relative to `dist/index.js` using `readFileSync`.  
In Cloudflare Workers, fonts are fetched from `raw.githubusercontent.com/googlefonts/dm-fonts`.

## Font options evaluated

All tested with static TTF files (variable fonts cause `ti`/`fi` ligature artifacts in `@pdf-lib/fontkit`).

| Font | Style | Source |
|------|-------|--------|
| **DM Sans** ✓ (current) | Geometric sans, clean and modern | googlefonts/dm-fonts |
| **Lato** | Humanist sans, warm and readable | google/fonts |
| **Inter** | UI-optimised, excellent legibility | rsms/inter v4.1 |
| **Source Sans 3** | Adobe humanist, professional | adobe-fonts/source-sans |

Static TTF files are stored in `fonts/` and excluded from the npm package (dev only).

## Scripts

```bash
pnpm build              # tsc → dist/
pnpm test               # build + generate 3 test PDFs from hardcoded data
pnpm test:live          # build + fetch real API data + generate PDF
pnpm test:live -- --postcode 3128 --plan professional
pnpm test:fonts         # generate one PDF per font for visual comparison
```

## Font rules

- Only use **static TTF** files — variable fonts (`[wght].ttf`) cause rendering artifacts
- WOFF2 is not supported — `@pdf-lib/fontkit` does not handle Brotli decompression
- Bold/italic must be separate font files; pdf-lib does not synthesise them

## Workers compatibility

- No WASM (no `yoga-layout`, no `@react-pdf/renderer`)
- No top-level Node.js imports — dynamic imports are used inside `loadDefaultFontsNode()` so the Workers bundler can tree-shake them
- Font loading falls back to Helvetica on error so reports never crash
