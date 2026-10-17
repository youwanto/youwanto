# Development roadmap

This is a prioritized backlog, not a statement that all features exist. Branch changes require PR review, deployment and live acceptance before being marked released.

| Priority | Work | Acceptance |
|---|---|---|
| P0 — implemented in this branch | Catalog sort and pagination | No shuffle; stable tie-break; single query; lookahead termination |
| P0 — implemented in this branch | Category identifiers | Path values reach the API; department-qualified labels; show only populated category branches |
| P0 — implemented in this branch | Currency and request consistency | Homepage/filter currency GBP; reject invalid input; stale requests cannot replace current results |
| P0 — implemented in this branch | Partner action | Partner CTA is consistent before/after variant selection; selected link preserved |
| P0 — pending | Enforce Product.price summaries | Reconcile to eligible variant price/currency; cover out-of-stock and mixed-currency rows |
| P0 — pending | Cart integrity and product strategy | Decide role of cart; audit server-authoritative prices, variant IDs, mixed currencies and stock; remove unsupported shipping claims |
| P1 — pending | URL-backed home filters | Reload/share/back/forward preserve filters and sorting; pagination resets appropriately |
| P1 — pending | Search and navigation | Search name/brand/style code; departments; autocomplete; meaningful no-result state |
| P1 — pending | Trust and SEO | Operator/contact/partner disclosure pages and structured data remain pending; product/collection canonicals, sitemap and robots are implemented in branch |
| P1 — pending | Incremental feed import | Preserve stable IDs; validate records before publishing; batch status, freshness and failure alerts; never clear live inventory before a successful import |
| P1 — pending | Collection query scalability | Sort/filter/paginate eligible variant prices inside the database; inspect query plans and indexes |
| P2 — pending | Wishlist and recently viewed | Guest saved items; optional account sync; consistent product availability |
| P2 — pending | Price/restock alerts | Consent, notification preferences, validated price history and unsubscribe |
| P2 — pending | Analytics and performance | Measured discovery funnel; Core Web Vitals; validated image optimization and lazy loading |

Do not add payment checkout until ownership, fulfillment, taxation, returns and payment integration have been explicitly designed. Existing external retailer transactions remain external.
