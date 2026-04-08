# CLAUDE.md — Guidance for Claude Code

This file helps Claude Code understand the architecture and conventions of this monorepo.

---

## Architecture Overview

Three apps share one Cloudflare infrastructure:

```
Browser → Cloudflare Pages (Next.js static)
              ↓ fetch()
         Cloudflare Worker (Hono API — api.workswell.com.au)
              ↓
         D1 (SQLite)   R2 (PDFs)   KV (cache)   Stripe
```

- **`apps/api`** — single Hono Worker handling all backend logic. No separate microservices.
- **`apps/demoreport`** — Next.js static export. All data fetching via `NEXT_PUBLIC_API_URL`.
- **`apps/grantdata`** — Same pattern.
- **`packages/pdf-generator`** — Shared TypeScript package. Must work inside Cloudflare Workers (no Node.js, no WASM).

---

## Where Things Live

| Concern | File |
|---------|------|
| API routes | `apps/api/src/index.ts` |
| Stripe checkout + webhook | `apps/api/src/stripe.ts` |
| D1 query helpers | `apps/api/src/db.ts` |
| Auth middleware (GrantData JWT) | `apps/api/src/auth.ts` |
| Worker bindings / env | `apps/api/wrangler.toml` |
| PDF generation (all tiers) | `packages/pdf-generator/src/index.ts` |
| Frontend API client | `apps/demoreport/src/lib/api.ts` |
| Frontend types | `apps/demoreport/src/lib/types.ts` |
| ABS data processing | `data/abs/process_abs_data.py` |
| D1 schema | `data/abs/schema.sql` |
| D1 import script | `data/abs/import_to_d1.py` |

---

## Key Conventions

- **TypeScript everywhere** — all source files in `apps/` and `packages/` are `.ts` / `.tsx`.
- **Hono for API routes** — use `app.get()`, `app.post()` etc. in `apps/api/src/index.ts`. Use `c.env` for bindings, `c.req.json()` for body.
- **Static export for Next.js** — both frontends use `output: "export"` in `next.config.js`. This means:
  - No server-side rendering, no `getServerSideProps`.
  - All dynamic behaviour via client-side `useEffect` + fetch.
  - `useSearchParams()` must be wrapped in `<Suspense>`.
  - No `next/headers`, no middleware.
- **Shared packages** — import from `@abs-platform/pdf-generator` (see `package.json` workspace references). Build with `pnpm build` in the package before the Worker can use it.
- **Workers compatibility** — the Worker uses `nodejs_compat` flag. You can use Node built-ins but check compatibility first at https://developers.cloudflare.com/workers/runtime-apis/nodejs/.
- **No WASM in Workers** — `WebAssembly.instantiate()` is blocked at runtime in Cloudflare Workers. Do not introduce any dependency that uses WASM (including `@react-pdf/renderer` which pulls in `yoga-layout`).

---

## How to Add a New API Endpoint

1. Open `apps/api/src/index.ts`.
2. Add your route following the Hono pattern:
   ```typescript
   app.get("/api/my-endpoint", async (c) => {
     const db = c.env.DB; // D1
     const kv = c.env.CACHE; // KV
     // ...
     return c.json({ data: result });
   });
   ```
3. Add any new env bindings to `Env` interface at the top of `index.ts` and to `wrangler.toml`.
4. Test locally with `pnpm dev` in `apps/api` (uses `wrangler dev`).
5. Deploy with `pnpm exec wrangler deploy` from `apps/api`.

**CORS** is handled globally with `app.use("*", cors(...))` — no need to add per-route.

---

## How to Add New ABS Data

1. Download the relevant ABS DataPack (GCP SA2 format) and place in `data/abs/raw/`.
2. Add a processing function to `data/abs/process_abs_data.py` following the pattern of `process_g01()`, `process_g02()` etc.
   - Always filter rows with: `df[df["SA2_CODE_2021"].str.match(r"^\d{9}$")]`
   - This includes all states. Do NOT filter by `^[12]\d{8}$` (NSW/VIC only — historical bug, now fixed).
3. Add the new table to `data/abs/schema.sql`.
4. Register the new CSV in the `IMPORT_ORDER` list in `data/abs/import_to_d1.py`.
5. Re-run the pipeline:
   ```bash
   cd data/abs
   python3 process_abs_data.py
   python3 import_to_d1.py --db-name abs-data-prod
   ```
6. Add D1 queries in `apps/api/src/db.ts` and expose via new endpoint.
7. Update the TypeScript types in `apps/demoreport/src/lib/types.ts`.

---

## PDF Generation

The PDF generator lives in `packages/pdf-generator/src/index.ts` and uses **`pdf-lib`** only.

Three exported functions:
- `generateReport(data)` → 10-page Single report
- `generateComparisonReport(primary, neighbours[])` → 11-page Professional report
- `generateEnterpriseReport(primary, neighbours[])` → 12-page Enterprise report (+ AI narrative)

**Critical:** Do NOT switch to `@react-pdf/renderer`. It uses yoga-layout (WASM) which is blocked in Cloudflare Workers. `pdf-lib` is pure JS and works everywhere.

When editing the PDF generator, rebuild before deploying the Worker:
```bash
cd packages/pdf-generator
pnpm build
cd ../../apps/api
pnpm exec wrangler deploy
```

---

## Deployment Workflow

**Rule: always commit before deploying.**

```bash
# 1. Make changes
# 2. Test locally
cd apps/api && pnpm dev

# 3. Commit first
git add <files> && git commit -m "..."

# 4. Deploy Worker
cd apps/api && pnpm exec wrangler deploy

# 5. Build + deploy frontends
cd apps/demoreport
NEXT_PUBLIC_API_URL=https://api.workswell.com.au pnpm run build
pnpm exec wrangler pages deploy out --project-name demoreport

cd apps/grantdata
NEXT_PUBLIC_API_URL=https://api.workswell.com.au pnpm run build
pnpm exec wrangler pages deploy out --project-name grantdata
```

**Live domains:**
- `https://api.workswell.com.au` — Worker (route registered on CF zone)
- `https://demoreport.workswell.com.au` — Pages project `demoreport`
- `https://grantdata.workswell.com.au` — Pages project `grantdata`

**Fallback .pages.dev URLs** (always work):
- `https://abs-api.eddie-p-halterman.workers.dev`
- `https://demoreport-40p.pages.dev`
- `https://grantdata.pages.dev`

---

## Managing Secrets

Secrets are NOT in `wrangler.toml` — they're set via:
```bash
cd apps/api
pnpm exec wrangler secret put STRIPE_SECRET_KEY
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
pnpm exec wrangler secret put JWT_SECRET
```

Do NOT add Stripe or JWT keys to the `[vars]` section of `wrangler.toml` — this blocks `wrangler secret put` with "Binding name already in use" error.

---

## D1 Database

Database name: `abs-data-prod`
Database ID: `c5989af6-e454-4843-8e27-098eca650e49`

Key tables:
- `sa2_areas` — 2,366 SA2 geographic areas (all states + territories)
- `demographics` — 2,362 rows (population, income, age, language)
- `seifa_scores` — 2,366 rows (IRSD, IRSAD, IER, IEO deciles)
- `housing` — 2,362 rows (tenure, rent, mortgage)
- `age_distribution` — 2,362 rows (9 age bands as percentages)
- `postcode_sa2_mapping` — 5,753 postcode → SA2 mappings
- `reports` — purchase records (session_id, suburb, status, report_type, download_url)

**SA2 code format:** 9-digit string. First digit = state (1=NSW, 2=VIC, 3=QLD, 4=SA, 5=WA, 6=TAS, 7=NT, 8=ACT, 9=Other Territories).

Query D1 directly:
```bash
cd apps/api
pnpm exec wrangler d1 execute abs-data-prod --remote --command "SELECT COUNT(*) FROM demographics;"
```

---

## Common Gotchas

1. **`renderToBuffer` is Node-only** — `@react-pdf/renderer`'s `renderToBuffer` doesn't work in Workers even with `nodejs_compat`. Use `pdf-lib` instead.

2. **WASM blocked in Workers** — `WebAssembly.instantiate()` fails at runtime. Avoid any dependency that uses WASM.

3. **`useSearchParams()` needs Suspense** — In Next.js static export, any component using `useSearchParams()` must be wrapped in `<Suspense>`. Failure to do so causes a build error.

4. **`pnpm exec wrangler` not `npx wrangler`** — wrangler is a project dependency, not global. Always run from inside an `apps/` directory so the correct `wrangler.toml` is picked up.

5. **`python3` not `python`** — macOS ships Python 3 as `python3`. The import script and subprocess calls need `python3` explicitly.

6. **ABS SA2 filter** — when processing ABS DataPacks, filter by `^\d{9}$` (all states). The old pattern `^[12]\d{8}$` only matched NSW and VIC.

7. **Worker secrets vs vars** — never put secrets in `wrangler.toml [vars]`. Use `wrangler secret put`. If a secret name appears in `[vars]`, `wrangler secret put` will fail with "Binding name already in use".

8. **`wrangler pages domain add` removed in v4** — use the Cloudflare API directly:
   ```bash
   curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project}/domains" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"name":"subdomain.example.com"}'
   ```
   Token is in `~/Library/Preferences/.wrangler/config/default.toml` (run any wrangler command first to refresh).

9. **Next.js static export + `next/image`** — use `unoptimized: true` in `next.config.js` or use plain `<img>` tags. The Image Optimization API isn't available in static exports.

10. **D1 import order** — `sa2_areas` must be imported before `demographics`, `housing`, etc. due to foreign key constraints. The `IMPORT_ORDER` list in `import_to_d1.py` enforces this.

---

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Build pdf-generator package
cd packages/pdf-generator && pnpm build

# Type-check all apps
pnpm -r tsc --noEmit

# Build demoreport
cd apps/demoreport && pnpm build

# Build grantdata
cd apps/grantdata && pnpm build

# Run API locally (hot reload)
cd apps/api && pnpm dev

# Run demoreport locally
cd apps/demoreport && pnpm dev

# Check D1 row counts
cd apps/api && pnpm exec wrangler d1 execute abs-data-prod --remote \
  --command "SELECT COUNT(*) FROM demographics;"

# Tail Worker logs
cd apps/api && pnpm exec wrangler tail abs-api --format pretty
```

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
