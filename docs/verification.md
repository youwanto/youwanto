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

## Latest run

On this branch (2026-10-17):

- Eight catalog tests pass.
- Type checking and changed-file ESLint pass.
- Lockfile repaired; npm ci dry-run passes.
- Full ESLint reports three existing no-explicit-any errors: auth.ts:55 and db/seed.ts:350,398, plus five existing unused-variable warnings.
- Production build compiles successfully and passes Next.js lint/type validation, then fails collecting category static params because DATABASE_URL is not configured (ERR_INVALID_URL). This is a blocked build, not a passing build.
- No local/preview browser acceptance or database integration tests completed; no production data was modified.

The initial SSR page is retained on hydration; API requests start only when filters change or subsequent pages are requested. Regression coverage for this browser behavior remains manual.
