# Current architecture

## Runtime and routes

Next.js 15.5.9, React 19.1, TypeScript, Tailwind 4, Prisma 6 and Auth.js v5 beta are declared in package.json. Use the lockfile for exact transitive versions. Database access uses PrismaNeon in db/prisma.ts and requires a compatible Neon connection.

| Surface | Implementation |
|---|---|
| Homepage | app/(root)/page.tsx → components/product/infinite-product-list.tsx |
| Catalog endpoint | app/api/products/route.ts → lib/catalog.ts → Prisma Product |
| Current detail page | app/products/[slug]/page.tsx → lib/actions/product.ts → components/pdp |
| Category collection | app/[...slug]/page.tsx → lib/actions/collection.ts → components/collection |
| Legacy detail | app/(root)/product/[slug]/page.tsx |
| Authentication | auth.ts, app/api/auth/[...nextauth], lib/actions/user.action.ts |
| Cart | lib/actions/cart.actions.ts, app/(root)/cart, sessionCartId cookie from middleware.ts |

## Catalog data flow

The server homepage and GET endpoint share buildCatalogQuery and catalogPage. The query selects active products within one currency, applies category-path/brand/price constraints, orders by the requested field plus unique ID, then fetches 25 records for a 24-record page. The extra record is only a lookahead. nextCursor is the last displayed ID only when another page exists.

The client cancels old requests, rejects failed HTTP responses, guards request generations, deduplicates appended IDs and offers retry. New filters replace the result set and cursor. Home filter state is still local React state; URL persistence is pending.

Category buttons use level-two paths with department-qualified labels. Their availability comes from active GBP products assigned to those categories or descendants. Direct assignments and descendant paths are both considered. Facet counts are not yet exposed on the homepage.

The homepage sorts on the legacy Product.price summary. Product details/collections use variant pricing. Synchronization of Product.price with eligible in-stock variants remains an ingestion invariant to enforce. This PR does not migrate price storage or introduce currency conversion.

## Data model

`prisma/schema.prisma` is authoritative: Category is a path tree; ProductCategory is the many-to-many join; ProductVariant contains size/colour, stock, price and affiliate deepLink; ProductPrice stores price snapshots; RawProduct retains source records. FeedSource includes AWIN, OUTNET and RAKUTEN. User/Account/Session/VerificationToken support auth; Cart stores JSON line items and totals.

Product-level Decimal values are transformed by db/prisma.ts. Serialize nested variants and dates explicitly before passing data to client components. Some application types still describe dates as Date after JSON serialization; handle this when extending shared types.

## Buying flow

BuyButton identifies partner products from product.externalUrl or variant deepLink values. A partner action stays a partner action before selection. Resolve the selected variant URL first, then a product fallback; disable if selection is incomplete, inventory unavailable or no URL exists. Partner URLs preserve sponsored/nofollow attributes. Non-partner products retain legacy add-to-cart behavior.

## Known limitations

- Collection price sorting loads all candidate variant prices into application memory before slicing. Move this to an indexed SQL query for large inventories.
- Homepage prices use Product summaries; collection and PDP use variants.
- Cart has placeholder delivery copy and a checkout button without a payment/order flow.
- next.config.ts sets image optimization off; improve only after validating retailer image access.
- All product/category static params are queried during build; build requires database connectivity.
- db/seed.ts deletes catalog tables and is not a safe incremental importer.
- No deployed feed scheduler, monitoring or analytics integration is established by this audit.

## SEO endpoints and QA

app/robots.ts provides crawler directives and the sitemap URL. app/sitemap.ts queries active products and populated directly assigned categories at request time. It currently caps entries at 45,000 products and 1,000 categories; introduce sitemap shards before exceeding this size. Product and collection pages now declare canonical paths using the configured SERVER_URL. Collection metadata no longer promises free delivery.

GitHub Actions validates installation, unit tests, HTTP input rejection, lint, types and schema syntax. scripts/smoke-test.mjs records read-only live HTTP checks; scripts/check-local-http.mjs verifies route validation and robots against a temporary local server. No production credentials are required for those local checks.
