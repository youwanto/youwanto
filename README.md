# YouWanto

English product-discovery storefront at https://www.youwanto.com, built with Next.js App Router, React, TypeScript, Prisma, PostgreSQL through the Neon adapter, Tailwind and Auth.js credentials authentication.

## Development

Use Node 22.6+ (Node 24 recommended) and npm. The test runner uses Node's built-in TypeScript stripping. Exact dependency resolutions live in package-lock.json.

```bash
npm ci
cp .env.example .env.local
# Fill in a disposable development Neon DATABASE_URL and generate AUTH_SECRET locally.
npm run dev
```

Next.js reads `.env.local`; Prisma CLI reads `.env` or exported environment variables. For CLI database commands, explicitly load the same development variables in your shell. Never point a local seed at the production database.

A new development database needs the checked-in migration applied with `npx prisma migrate deploy` after exporting DATABASE_URL. `npm ci` generates the Prisma client via postinstall. Credentials auth additionally requires AUTH_SECRET. No provider credentials belong in source control.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover catalog query validation, ordering, currency isolation and pagination without a database. Type checking needs the generated Prisma client. A full build requires database access because product and category routes enumerate records in generateStaticParams, and Google Fonts access for Inter. See [verification](docs/verification.md) for known baseline failures and browser acceptance.

## Product behavior

- `/`: GBP catalog with newest/price/name sorting, category and brand filtering, price range and infinite scroll.
- `/products/[slug]`: product gallery, variant selection, prices, availability, description and related products.
- `/[...slug]`: hierarchical category collections and facets.
- `/product/[slug]`: older detail route; retained for existing links.
- `/sign-in`, `/sign-up`: credentials authentication.
- `/cart`: legacy cart interface. There is no implemented payment/order checkout.
- `/api/products`: validated, deterministic catalog pagination.

Partner products open the retailer's website. The retailer handles the transaction, final availability, shipping and returns. Do not describe the existing cart as a complete ecommerce checkout.

## Documentation

Start with [documentation index](docs/README.md), [architecture](docs/architecture.md), [development workflow](docs/development.md), [roadmap](docs/roadmap.md), and [UX audit](docs/ux-audit.md). Repository instructions are in [AGENTS.md](AGENTS.md).
