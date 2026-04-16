# Schema: Catalog & Commerce Data

Project: YouWanto  
Stack: Next.js + Prisma + PostgreSQL  
Goal: Provide a clear, stable data model for products, variants, raw feed data, users, and carts, optimized for:
- product presentation
- filters & search
- pricing & stock
- future semantic search & recommendations
- analytics & SEO

---

## 1. Product Schema

### 1.1 Purpose

Represents a logical product as seen by the customer (e.g. “Buttoned merino wool and mink jacket”), independent of specific size/color variants.

### 1.2 Fields (current)

Mapped from `prisma/schema.prisma`:

- `id: string` — internal UUID.
- `name: string` — display name for the product.
- `slug: string` — unique slug, used in URLs.
- `category: string` — simple category label (to be refined into a structured taxonomy later).
- `images: string[]` — list of image URLs/paths.
- `brand: string` — brand name.
- `description: string` — long description / marketing copy.
- `styleCode: string?` — optional style or internal code.
- `stock: number` — total stock across all variants.
- `price: Decimal` — base/reference price for the product.
- `currency: string` — 3-letter code, currently default "USD".
- `rating: Decimal` — average rating (0–5, with 2 decimal precision).
- `numReviews: number` — number of reviews contributing to rating.
- `isFeatured: boolean` — whether product is highlighted on the site.
- `isActive: boolean` — whether product is visible and buyable.
- `banner: string?` — optional banner image or asset.
- `externalUrl: string?` — link to external product page when applicable.
- `createdAt: DateTime` — creation timestamp.
- `updatedAt: DateTime` — last update timestamp.

Relations:
- `variants: ProductVariant[]` — list of concrete purchasable variants.

### 1.3 Planned extensions (future)

To support better filters, search, and AI, we will likely add:

- `gender: "men" | "women" | "unisex" | null`
- `categorySlug: string` — normalized category key.
- `materialMain: string?`
- `materialSecondary: string[]`
- `colorFamilies: string[]` — normalized color groups (e.g. ["beige"]).
- `season: "spring" | "summer" | "fall" | "winter" | "all-year" | null`
- `occasion: string[]` — e.g. ["evening", "casual", "office"].
- `tags: string[]` — free-form tags for search and merchandising.
- `searchTokens: string[]` — precomputed terms for search optimization.
- `metadata: Json?` — flexible extra attributes.

We will define these more precisely after auditing the real catalog.

---

## 2. ProductVariant Schema

### 2.1 Purpose

Represents a concrete purchasable unit of a product, usually defined by size and/or color.

### 2.2 Fields (current)

From `ProductVariant`:

- `id: string` — internal UUID.
- `productId: string` — references `Product.id`.
- `sku: string` — unique SKU, required.
- `ean: string?` — optional EAN / barcode.
- `size: string?` — size label (e.g. "S", "M", "L", "38").
- `color: string?` — display color name.
- `price: Decimal` — variant-specific price.
- `currency: string` — currency for this variant.
- `stock: number` — stock for this specific variant.
- `isActive: boolean` — whether this variant is sellable.
- `externalUrl: string?` — external product variant URL.
- `createdAt: DateTime`
- `updatedAt: DateTime`

Relations:
- `product: Product` — parent product.
- `rawProducts: RawProduct[]` — raw feed rows mapped to this variant.

### 2.3 Planned extensions

For stronger filtering and AI search:

- `colorFamily: string?` — normalized color group (e.g. "beige", "black").
- `sizeSortOrder: number?` — numeric ordering for sizes.
- `isDefault: boolean` — whether this is the default variant shown on PDP.

---

## 3. RawProduct Schema

### 3.1 Purpose

Stores raw feed rows from external sources before they are normalized into `Product` and `ProductVariant`. Allows us to debug, re-map, and improve parsing logic over time.

### 3.2 Fields (current)

From `RawProduct`:

- `id: string` — internal UUID.
- `source: string` — feed source identifier (e.g. "yves_salomon").
- `feedBatchId: string?` — batch identifier for imports.
- `rawData: Json` — raw feed payload.
- `sku: string` — SKU from feed.
- `styleCode: string?` — style or grouping code from feed.
- `productIdFeed: string?` — product-level ID from feed.
- `ean: string?` — ean/barcode from feed.
- `createdAt: DateTime`
- `updatedAt: DateTime`

Relations:
- `productVariantId: string?` — foreign key to `ProductVariant`.
- `productVariant: ProductVariant?` — normalized variant mapped to this raw row.

### 3.3 Notes

- This table is essential for debugging data pipelines and for building better mapping rules later.
- It is not directly exposed to the frontend.

---

## 4. User & Auth Schema

(Keep this section shorter, focus is ecommerce.)

### 4.1 User

- `id: string`
- `name: string`
- `email: string`
- `password: string?`
- `role: string` — e.g. "user", "admin".
- `emailVerified: DateTime?`
- `image: string?`
- `address: Json?`
- `paymentMethod: string?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Relations:
- `accounts: Account[]`
- `sessions: Session[]`
- `carts: Cart[]`

### 4.2 Account, Session, VerificationToken

Standard NextAuth entities, used for authentication and session management.

---

## 5. Cart Schema

### 5.1 Purpose

Represents a user’s shopping cart, either user-bound or session-bound.

### 5.2 Fields (current)

From `Cart`:

- `id: string`
- `userId: string?` — optional link to logged-in user.
- `sessionCartId: string` — identifier for anonymous carts.
- `items: Json[]` — array of line items, stored as JSON.
- `itemsPrice: Decimal`
- `taxPrice: Decimal`
- `shippingPrice: Decimal`
- `totalPrice: Decimal`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Relations:
- `user: User?`

### 5.3 Notes

- `items` is currently an unstructured `Json[]`.  
  In the future we may define a clear JSON shape or a separate `CartItem` model for analytics and AI.

---

## 6. Search & SEO Fields

### 6.1 Search-relevant fields (current)

For now, search can rely on:

- `Product.name`
- `Product.slug`
- `Product.brand`
- `Product.category`
- `Product.description`
- `Product.styleCode`
- `Product.price`
- `Product.isActive`
- `Product.isFeatured`
- `Product.rating` / `numReviews`
- `ProductVariant.sku`
- `ProductVariant.size`
- `ProductVariant.color`
- `ProductVariant.price`
- `ProductVariant.isActive`

### 6.2 Gaps for search/filters

We are currently missing:
- a structured category taxonomy
- normalized color families
- explicit material fields
- season/occasion fields
- tag arrays

These will be added in future schema iterations to support:
- faceted search
- semantic search
- similar product recommendations
- collection merchandising

---

## 7. AI & Semantic Search Considerations

To support future semantic search and AI-powered recommendations, we will:

- Use `Product` as the main document for embeddings (title + description + brand + category + key attributes).
- Use `ProductVariant` for size/color-specific queries and highlighting availability.
- Add explicit, structured fields instead of relying only on free-text `description`.
- Maintain stable IDs and slugs for grounding AI responses.
- Keep a clear mapping from catalog entities to search index entities.

---

## 8. Open Questions / TODO

- Define the target category taxonomy (e.g. outerwear, knitwear, accessories, etc.).
- Decide which attributes must be structured vs. remaining in free-text.
- Decide which fields to expose in public APIs.
- Decide whether to normalize brand into a separate table.
- Decide if we want a dedicated `Collection` model instead of only category strings.