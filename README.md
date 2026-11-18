# YouWanto

English fashion ecommerce site built with Next.js (App Router), TypeScript, Prisma and Neon Postgres, deployed on Vercel.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
npx prisma migrate deploy
npx prisma db seed     # optional: sample catalogue
npm run dev
```

## Environment variables

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | NextAuth secret |
| `SERVER_URL` | Canonical site origin, used for canonical URLs, Open Graph, sitemap and robots (default `https://youwanto.com`) |
| `APP_NAME`, `APP_DESCRIPTION` | Site name (appended to every page title) and default meta description |
| `TAX_RATE`, `SHIPPING_PRICE`, `FREE_SHIPPING_THRESHOLD` | Optional cart pricing rules (defaults: `0.15`, `10`, `100`) |

## Routes

| Route | Description |
|---|---|
| `/` | Homepage product feed |
| `/{category-path}` | Collection page, e.g. `/women/outerwear/jackets` |
| `/products/{slug}` | Product detail page (`/product/{slug}` permanently redirects here) |
| `/cart` | Shopping cart |
| `/sign-in`, `/sign-up` | Authentication |
| `/sitemap.xml`, `/robots.txt` | Generated from the catalogue |

## Importing discounted products

`npm run import:deals` loads the discounted products from the downloaded affiliate feeds
(Rakuten and The Outnet) into the catalogue. It is safe to run every day:

- products are matched on source + merchant + style, so a re-run updates prices and stock instead of duplicating;
- products that are no longer discounted, or left the feed, are switched off (`isActive = false`), never deleted;
- affiliate tracking links are stored untouched;
- a feed older than 3 days is skipped, and a merchant whose range mostly disappeared is not switched off without `--force`;
- products whose feed text mentions Black Friday get the `black-friday` search tag, and the log line counts them.

```bash
# Read and map the feeds, write nothing
npm run import:deals -- --feeds /path/to/raw_data --dry-run

# Import
npm run import:deals -- --feeds /path/to/raw_data
```

`--feeds` is the folder that holds `rakuten/` and `partnerize_outnet/` (or set `FEED_RAW_DIR`).
Other options are listed at the top of [`scripts/import-deals.ts`](scripts/import-deals.ts);
the mapping rules live in [`lib/feeds/`](lib/feeds).

Only the first `PRERENDER_PRODUCT_COUNT` product pages (default 200) are built at deploy time;
the rest are rendered on their first visit and cached for an hour.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Specs and data-model notes live in [`docs/`](docs).
