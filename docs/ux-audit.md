# Storefront audit — 2026-10-17

Scope: public desktop homepage, sorting, Dresses filter, a Yves Salomon product's variants, and empty cart. No payment, account creation, mobile viewport or measured performance test was performed.

| Observation | Source-confirmed cause / follow-up |
|---|---|
| Price sort mixed cheap and expensive products | API appended older records then shuffled the entire response. Replaced in this branch with a single ordered query. |
| Repeated category labels | Homepage sent names; API matched path prefixes. Replaced with populated path options and department-qualified labels. |
| Dresses filter returned no results | Name/path mismatch is confirmed; actual remaining inventory must be verified after deployment. |
| Dollar filter with pound cards | Hardcoded dollar characters. Replaced with currency formatting and explicit GBP queries. |
| Initial newest results with low-price sort selected | SSR/client defaults disagreed. Both now use newest. |
| Product CTA changed from Add to Cart to Go to Store | Partner mode depended on selected variant. Product-level partner detection now keeps the mode consistent. |
| Full-page loading on route navigation | app/loading.tsx exists; progressive loading and route-level skeleton improvement remains pending. |
| No visible homepage search | Search is not implemented; backlog P1. |
| Minimal footer and generic description | Default description improved in branch; operator/contact/policies remain pending. |
| Homepage no H1/canonical detected | H1 and homepage canonical added in branch; broader SEO remains pending. |

All branch fixes need preview/live acceptance. Do not treat source-code changes as evidence the production site is already fixed.
