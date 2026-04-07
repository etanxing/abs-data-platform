# ABS Data Platform

> Two SaaS products sharing one ABS open data backend — built on Cloudflare's edge stack.

## Products

### DemoReport — [demoreport.workswell.com.au](https://demoreport.workswell.com.au)
Instant demographic feasibility reports for property developers, urban planners, and real estate professionals. Search any Australian suburb or postcode, preview key ABS Census indicators for free, then purchase a professionally formatted PDF report (10–12 pages) via Stripe. No subscription — pay once, download instantly.

**Plans:** Single $99 · Professional $199 · Enterprise $299

### GrantData — [grantdata.workswell.com.au](https://grantdata.workswell.com.au)
ABS data access for NGOs writing grant applications. Subscription-based access to demographic, SEIFA disadvantage, and housing data for any SA2 area in Australia.

### API — [api.workswell.com.au](https://api.workswell.com.au)
Shared Hono API Worker serving both frontends. Handles data queries, Stripe checkout/webhooks, PDF generation, and report delivery.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | [Turborepo](https://turbo.build/) + pnpm workspaces |
| Frontends | [Next.js 14](https://nextjs.org/) (static export) |
| API | [Hono](https://hono.dev/) on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at the edge) |
| File storage | Cloudflare R2 |
| Cache | Cloudflare KV |
| PDF generation | [pdf-lib](https://pdf-lib.js.org/) (pure JS, no WASM) |
| Payments | Stripe Checkout + Webhooks |
| Data source | ABS Census 2021 (DataPacks — open data) |

---

## Monorepo Structure

```
abs-data-platform/
├── apps/
│   ├── api/          # Hono Worker — data API, Stripe, PDF delivery
│   ├── demoreport/   # Next.js — property developer reports
│   └── grantdata/    # Next.js — NGO grant data tool
├── packages/
│   └── pdf-generator/  # pdf-lib report builder (shared package)
└── data/
    └── abs/
        ├── raw/              # Downloaded ABS DataPack ZIPs (gitignored)
        ├── processed/        # CSV outputs from processing scripts (gitignored)
        ├── process_abs_data.py   # Converts ABS Excel/CSV → clean CSVs
        ├── import_to_d1.py       # Loads processed CSVs → Cloudflare D1
        ├── schema.sql            # D1 database schema
        └── download_abs_data.py  # Helper to fetch ABS DataPack URLs
```

---

## Local Development

### Prerequisites
- Node.js 18+
- pnpm 8+
- Cloudflare account with Wrangler authenticated (`pnpm exec wrangler login`)
- Stripe CLI (for webhook forwarding)

### Setup

```bash
git clone https://github.com/etanxing/abs-data-platform
cd abs-data-platform
pnpm install
```

### Run everything locally

```bash
# Terminal 1 — API Worker (port 8787)
cd apps/api
pnpm dev

# Terminal 2 — DemoReport frontend (port 3000)
cd apps/demoreport
pnpm dev

# Terminal 3 — GrantData frontend (port 3001)
cd apps/grantdata
pnpm dev

# Terminal 4 — Stripe webhook forwarding
stripe listen --forward-to localhost:8787/api/stripe/webhook
```

### Environment variables

Copy `.env.example` to `.env.local` in each frontend app:
```bash
cp apps/demoreport/.env.example apps/demoreport/.env.local
cp apps/grantdata/.env.example apps/grantdata/.env.local
```

Worker secrets are set via `wrangler secret put` (see `apps/api/wrangler.toml` comments):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `JWT_SECRET`

---

## Deployment

### API Worker

```bash
cd apps/api
pnpm exec wrangler deploy
```

### DemoReport

```bash
cd apps/demoreport
NEXT_PUBLIC_API_URL=https://api.workswell.com.au pnpm run build
pnpm exec wrangler pages deploy out --project-name demoreport
```

### GrantData

```bash
cd apps/grantdata
NEXT_PUBLIC_API_URL=https://api.workswell.com.au pnpm run build
pnpm exec wrangler pages deploy out --project-name grantdata
```

### ABS Data pipeline

```bash
cd data/abs
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Download latest ABS DataPacks (or download manually from abs.gov.au)
python3 download_abs_data.py

# Process raw data → CSVs
python3 process_abs_data.py

# Import to D1
python3 import_to_d1.py --db-name abs-data-prod
```

---

## License

MIT
