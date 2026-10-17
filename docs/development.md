# Development workflow

## Setup and configuration

Follow README.md and .env.example. Use Node 22.6+; Node 24 is recommended. Install through npm ci. Prisma client generation runs during postinstall. Export DATABASE_URL for Prisma CLI; `.env.local` is loaded by Next.js but not automatically by Prisma CLI. Use a disposable Neon database, apply the checked-in migration and create any needed test fixtures there.

Required variables: DATABASE_URL and AUTH_SECRET. AUTH_URL is useful for local auth origins. APP_NAME, APP_DESCRIPTION, SERVER_URL and LATEST_PRODUCTS_LIMIT are supported configuration values. Set SERVER_URL=https://www.youwanto.com in production. Generate secrets locally rather than pasting them into chat or committing them.

Never run db/seed.ts against production. It deletes product-category joins, variants, products and raw products. Rework it into a validated incremental import before using it for routine feed updates.

## GET /api/products

| Parameter | Contract |
|---|---|
| sort | newest (default), price-asc, price-desc, name-asc |
| currency | GBP (default), EUR, USD, JPY; compare within a currency |
| category | Full category path, e.g. women/dresses; exact category and descendants |
| brand | Exact stored brand string |
| minPrice / maxPrice | Optional finite nonnegative bounds; inclusive; min cannot exceed max |
| cursor | Optional Product UUID returned by the previous page |

Returns `{ items, nextCursor }`; up to 24 products. A null cursor terminates pagination. Invalid filters return 400 with a safe error message; query failures return 500. Reset the cursor whenever any filter or sort changes. API currencies do not imply conversion or a market selector exists. The homepage uses GBP only.

`lib/catalog.ts` is shared by SSR and the endpoint; keep it free of runtime database and framework dependencies so regression tests run without credentials.

## Working on a change

1. Read AGENTS.md, relevant docs and code; reproduce the reported behavior.
2. Create a focused branch from the current base. Avoid modifying unrelated user work.
3. Implement a bounded change. Preserve routes, affiliate attribution and exact category identifiers.
4. Add regression coverage for behavior with meaningful failure modes.
5. Run the documented checks and inspect desktop/mobile behavior where possible.
6. Update behavior/architecture docs and backlog status. Record blocked checks precisely.
7. Commit and open a PR with problem, behavior and validation. Keep merging/deployment with the user unless requested.

## Release acceptance

Review the Vercel preview using a non-production test database where writes are needed. Check sort continuity across two pages, filters, error/retry, mobile filter scrolling, selected variants and outbound retailer destinations. After merge/deploy, repeat read-only production checks. A local test pass does not establish production acceptance.

## Reusable assistant workflow

The personal `$develop-youwanto` skill supports repository inspection, scoped implementation, documentation upkeep and PR preparation. Repository instructions remain in AGENTS.md so other tools can follow the same invariants. Invoke the skill with a specific backlog item, for example: “Use $develop-youwanto to implement URL-backed homepage filters.”
