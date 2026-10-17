# Verification

## Automated checks

- `npm test`: database-free catalog regression tests using Node 22.6+ TypeScript stripping.
- `npm run typecheck`: strict project TypeScript check with generated Prisma client.
- `npm run lint`: full ESLint; separate pre-existing errors from changed-file regressions.
- `npm run build`: Next.js production compilation, lint/type validation, static param enumeration and prerendering. Requires configured Neon access and Google Fonts access. Do not suppress failing checks globally.

## Manual acceptance

1. Open homepage: Newest selected, GBP prices/range, no duplicate category identities.
2. Sort ascending and descending: inspect numeric order over at least two pages, including equal-price items. No duplicate IDs or endless pagination at the end.
3. Select a populated category and brand; adjust min/max independently and reset. Ensure products match the exact category or its descendants, never sibling path prefixes.
4. Switch filters rapidly on a slow connection. Results and cursor must correspond to the last selection.
5. Simulate a failed products request. Show an error with retry; never silently show empty results for a server error.
6. On a partner product, inspect CTA before selection; select colour/size and inspect the destination URL and availability. Purchase remains on the retailer website.
7. Check a narrow mobile screen: two product columns, accessible sort/range labels, scrollable filter drawer and visible loading/errors.
8. Verify the homepage H1, description and canonical. Confirm cards have image fallback and offscreen images are not all eager-priority.

Unit tests do not prove database execution ordering, feed data accuracy, browser race behavior or a working checkout. Record preview/live acceptance independently.

## Latest run — 2026-10-18

| Check | Result |
|---|---|
| Clean npm ci and Prisma client generation | Pass |
| Catalog regression suite | 8 tests pass |
| Full ESLint | Pass after removing the existing errors/warnings |
| TypeScript | Pass |
| Prisma schema validation | Pass with a non-production placeholder DATABASE_URL; no database connection made |
| Local HTTP endpoint validation | All six invalid queries return 400 with JSON errors |
| Local robots.txt | 200 with text/plain and User-Agent directives |
| Production HTTP smoke suite | 8 pass, 11 fail against the existing unmerged site |
| Full production build | Compiles and validates types/lint; blocked collecting product/category static params without DATABASE_URL |
| PR preview browser tests | Blocked by Vercel authentication; no bypass attempted |
| Authenticated sign-in, account creation, checkout, mobile viewport, feed mutations | Not completed; requires suitable test configuration/accounts and explicit transaction scope |

Reports: [production HTTP results](qa-production-2026-10-18.json) and [local HTTP results](qa-local-http-2026-10-18.json). Raw production HTTP 200 responses for missing products include noindex, so this is recorded as passing rather than a broken 404.

Production failures: missing homepage H1, duplicate products across consecutive sorted pages, six invalid-query acceptance/status failures, and missing robots/sitemap content types. The six inputs are NaN price, negative price, reversed bounds, invalid sort, invalid currency and malformed cursor. Separate browser observations confirm shuffled price results, dollar filter labels, duplicate category names and an empty Dresses result.

Production browser checks confirmed homepage images loaded, cart empty state and sign-in/sign-up navigation rendered. This does not establish working credentials or successful registrations. No accounts, purchases, catalog writes or production database changes were made.

## Repeatable commands

```bash
npm ci
npm test
npm run lint
npm run typecheck
DATABASE_URL=postgresql://test:test@localhost:5432/youwanto_test npx prisma validate
npm run test:http
npm run test:smoke -- https://www.youwanto.com docs/qa-production-2026-10-18.json
npm run build
```

`test:http` starts a temporary local Next.js server, checks HTTP rejection and robots behavior without a database, then stops its server process group. `test:smoke` performs read-only HTTP requests against the explicitly supplied origin and exits nonzero for failures. Use a Vercel preview URL to verify fixes before merge. The production run above is a baseline of the existing deployment, not a report on this branch.

GitHub Actions now runs install, unit tests, full lint, local HTTP checks, TypeScript and schema validation. Vercel remains responsible for builds with its configured database. A full end-to-end test suite and measured mobile/performance acceptance remain open.
