# Documentation index

Verified against repository code on 2026-10-17. Production observations and proposed improvements are recorded separately from implementation.

| Document | Purpose / status |
|---|---|
| [Vision](vision.md) | Product direction and current transaction model |
| [Architecture](architecture.md) | Implemented routes, components, data flow and constraints |
| [Development](development.md) | Setup, API contract, working rules and release workflow |
| [Verification](verification.md) | Automated checks and manual acceptance |
| [Roadmap](roadmap.md) | Ordered backlog with acceptance criteria |
| [UX audit](ux-audit.md) | Live observations and source-confirmed causes |
| [Schema](schema.md) | Existing schema design reference; Prisma schema remains authoritative |
| [Data model](data-model.md) | Feed analysis and proposed normalization; not proof all importers exist |
| [Mapping](mapping.md) | Feed mapping design reference |
| [Taxonomy](taxonomy.md) | Taxonomy design reference |
| [Collection spec](collection-page-spec.md) | Historical design proposal; contains old Next.js version and unverified delivery copy |
| [PDP spec](pdp-spec.md) | Historical product-page proposal; verify against current components |
| [Prompts](prompts.md) | Historical implementation prompts, not runtime instructions |

Use `prisma/schema.prisma`, `package.json`, and actual routes as the source of truth where older documents disagree. Do not copy free-delivery promises from a design spec into partner product UI without retailer evidence.
