# YouWanto development instructions

Read README.md, docs/development.md, docs/architecture.md and relevant implementation before editing. Use docs/roadmap.md to select scoped work. Existing design specs are proposals unless verified against code.

- Use the current package.json and lockfile; do not infer the Next.js version from old specs.
- Keep `/products/[slug]` stable. Review old `/product/[slug]` links before consolidating routes.
- Preserve exact category paths and segment boundaries. Never pass display labels as database identifiers.
- Apply explicit sorting before pagination with a unique secondary order. Never mix randomized products into sorted results.
- Compare prices within one currency. The homepage intentionally uses GBP until currency/market selection is implemented.
- Cancel outdated catalog fetches, check HTTP status and provide visible errors/retry.
- Keep partner product actions consistent before and after variant selection. Preserve affiliate URLs and sponsored link attributes. Never imply that YouWanto fulfills partner orders.
- Serialize Prisma Decimal/Date values at server/client boundaries. Keep secrets and database clients on the server.
- Treat db/seed.ts as destructive: it deletes catalog data. Never run against production as a setup or verification step.
- Keep changes on a branch and prepare a PR. Do not merge, deploy, or change production data unless requested.
- Run npm test, npm run typecheck and targeted ESLint. Attempt full lint/build and report existing failures separately from regressions. Do not mask failures by disabling checks globally.
- Update docs with the resulting behavior, checks and limitations. Do not mark planned features complete without implementation evidence.
