# YouWanto.com — Prisma Schema Design

> Prisma + PostgreSQL schema for Category tree, Product, Variant, and search/facet fields.
> References [data-model.md](data-model.md) Layer 2/3 and [taxonomy.md](taxonomy.md) tree structure.

---

## 1. Entity Relationship Overview

```
Category (self-referencing tree)
    │
    ├──< ProductCategory >── Product ──< ProductVariant
    │          (M2M)           │              │
    │                          │              ├── size, color, sku
    │                          │              ├── price, compareAtPrice
    │                          │              └── stock, inStock
    │                          │
    │                          ├── brand, material[], color[], searchTags[]
    │                          ├── descriptionTokens (tsvector via raw SQL)
    │                          └── RawProduct (1:M — keeps raw feed audit trail)
    │
    └── parent (self-ref)
```

---

## 2. Models

### 2.1 Category

Self-referencing adjacency list + materialized `path` for fast URL routing.

```prisma
model Category {
  id        String     @id @default(cuid())
  name      String     // Customer-facing: "Ankle Boots"
  slug      String     // URL-safe: "ankle-boots"
  level     Int        // 1 = Department, 2 = Category, 3 = Subcategory
  path      String     @unique // Materialized: "shoes/boots/ankle-boots"
  sortOrder Int        @default(0)

  parentId  String?
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")

  products  ProductCategory[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([parentId, slug])
  @@index([level])
  @@index([parentId])
  @@map("categories")
}
```

**Key design decisions:**
- `path` is denormalized (`"women/outerwear/jackets"`) — set on insert, never computed at query time. Used for URL routing: `WHERE path = $slug`.
- `@@unique([parentId, slug])` prevents duplicate slugs under the same parent while allowing the same slug name in different parents (e.g. `women/outerwear/blazers` vs `men/suits-tailoring/blazers`).
- `level` is indexed for fast "give me all L1 departments" queries.

### 2.2 Product

Parent-level entity (color-agnostic when possible). Many-to-many with Category.

```prisma
model Product {
  id                String   @id @default(cuid())
  name              String   // Cleaned: "Nadia Leather Boots"
  slug              String   @unique // "nadia-leather-boots-3-1-phillip-lim"
  description       String?  @db.Text
  shortDescription  String?

  brand             String?  // "3.1 Phillip Lim"
  gender            Gender   @default(UNISEX)
  condition         Condition @default(NEW)

  // Facet fields — arrays for multi-value attributes
  colors            String[] // ["Black", "White"] — normalized English
  sizes             String[] // ["EU 35", "EU 36", "S", "M"]
  materials         String[] // ["100% Lambskin", "Leather"]

  // Identifiers
  ean               String?  // 13-digit EAN, normalized
  mpn               String?  // Manufacturer part number

  // Images (product-level hero images)
  imageUrl          String?
  images            String[]

  // Search support
  searchTags        String[] // ["boots", "knee-high", "leather", "winter"]

  // Source tracking
  source            FeedSource
  merchantId        String?
  externalId        String   // Source product/group ID
  groupId           String?  // parent_product_id / item_group_id

  // Relations
  categories        ProductCategory[]
  variants          ProductVariant[]
  rawProducts       RawProduct[]
  priceHistory      ProductPrice[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([source, externalId])
  @@index([brand])
  @@index([gender])
  @@index([source, merchantId])
  @@index([ean])
  @@map("products")
}
```

### 2.3 ProductCategory (M2M join)

```prisma
model ProductCategory {
  productId  String
  categoryId String

  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([productId, categoryId])
  @@index([categoryId])
  @@map("product_categories")
}
```

### 2.4 ProductVariant

SKU-level: one per (product × size × color) combination.

```prisma
model ProductVariant {
  id          String  @id @default(cuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  sku         String? // Merchant short SKU
  externalId  String  // Source variant-level ID (aw_product_id, Product_ID, col1)

  // Variant-specific attributes
  color       String? // Normalized English: "Black"
  size        String? // As-is from feed: "EU 35", "S", "one size"
  material    String? // "100% Lambskin"

  // Pricing (current snapshot)
  price          Decimal  @db.Decimal(10, 2) // Current selling price
  compareAtPrice Decimal? @db.Decimal(10, 2) // RRP / original price
  currency       String   @default("GBP")   // ISO 4217
  discountPct    Decimal? @db.Decimal(5, 2)

  // Stock
  inStock     Boolean @default(true)
  stockQty    Int?

  // Affiliate link
  deepLink    String? @db.Text

  // Variant images (may differ per color)
  imageUrl    String?
  images      String[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  priceHistory ProductPrice[]

  @@unique([productId, externalId])
  @@index([productId])
  @@index([color])
  @@index([size])
  @@index([inStock])
  @@map("product_variants")
}
```

### 2.5 ProductPrice (time-series)

```prisma
model ProductPrice {
  id         String   @id @default(cuid())
  variantId  String
  variant    ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  currency     String  // ISO 4217
  currentPrice Decimal @db.Decimal(10, 2)
  rrpPrice     Decimal? @db.Decimal(10, 2)
  discountPct  Decimal? @db.Decimal(5, 2)
  capturedAt   DateTime @default(now())

  @@index([variantId, capturedAt])
  @@index([productId, capturedAt])
  @@map("product_prices")
}
```

### 2.6 RawProduct (Layer 1 — audit trail)

```prisma
model RawProduct {
  id         String     @id @default(cuid())
  source     FeedSource
  merchantId String
  feedId     String?    // Awin feed ID
  productId  String     // Source variant-level ID
  feedDate   DateTime   @db.Date
  rawPayload Json       // Entire row as key-value map
  ingestedAt DateTime   @default(now())

  // Optional link to normalized product
  normalizedProductId String?
  normalizedProduct   Product? @relation(fields: [normalizedProductId], references: [id])

  @@unique([source, merchantId, productId, feedDate])
  @@index([source, feedDate])
  @@index([normalizedProductId])
  @@map("raw_products")
}
```

### 2.7 Enums

```prisma
enum FeedSource {
  AWIN
  OUTNET
  RAKUTEN
}

enum Gender {
  FEMALE
  MALE
  UNISEX
}

enum Condition {
  NEW
  USED
  REFURBISHED
}
```

---

## 3. Indexes for Search & Facets

### GIN indexes (for array facets — requires raw SQL migration)

```sql
-- After prisma migrate, run via a custom migration:
CREATE INDEX idx_products_colors ON products USING GIN (colors);
CREATE INDEX idx_products_sizes ON products USING GIN (sizes);
CREATE INDEX idx_products_materials ON products USING GIN (materials);
CREATE INDEX idx_products_search_tags ON products USING GIN ("searchTags");
```

### Full-text search (tsvector — add via raw SQL)

```sql
-- Add a generated tsvector column for full-text search
ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce("shortDescription", '')), 'B')
  ) STORED;

CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- Query example:
-- SELECT * FROM products
-- WHERE search_vector @@ plainto_tsquery('english', 'leather jacket black')
-- ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'leather jacket black')) DESC;
```

---

## 4. Collection / Listing Queries

### Category page with facets

```sql
-- /women/outerwear/jackets → Get products + available facet values
SELECT p.id, p.name, p.slug, p.brand, p.colors, p.sizes, p.materials,
       v.price, v.compare_at_price, v.currency, v.in_stock,
       v.image_url
FROM products p
JOIN product_categories pc ON pc.product_id = p.id
JOIN categories c ON c.id = pc.category_id
JOIN product_variants v ON v.product_id = p.id AND v.in_stock = true
WHERE c.path = 'women/outerwear/jackets'
  AND 'Black' = ANY(p.colors)           -- color facet
  AND p.brand = '3.1 Phillip Lim'       -- brand facet
ORDER BY v.price ASC;
```

### Breadcrumb from path

```sql
-- Given path "women/outerwear/jackets", get all ancestors:
SELECT * FROM categories
WHERE path IN ('women', 'women/outerwear', 'women/outerwear/jackets')
ORDER BY level;
```

---

## 5. Migration Steps

### Step 1: Generate initial migration

```bash
npx prisma migrate dev --name init_category_product_schema
```

### Step 2: Apply GIN indexes + tsvector (custom SQL migration)

```bash
npx prisma migrate dev --create-only --name add_gin_and_fts_indexes
# Edit the generated SQL file to add the GIN + tsvector statements from Section 3
npx prisma migrate dev
```

### Step 3: Seed categories

```bash
npx prisma db seed
```

Seed script outline (in `prisma/seed.ts`):

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TAXONOMY = [
  // L1 Departments
  { name: 'Women',       slug: 'women',       level: 1, path: 'women',       sortOrder: 1 },
  { name: 'Men',         slug: 'men',         level: 1, path: 'men',         sortOrder: 2 },
  { name: 'Shoes',       slug: 'shoes',       level: 1, path: 'shoes',       sortOrder: 3 },
  { name: 'Bags',        slug: 'bags',        level: 1, path: 'bags',        sortOrder: 4 },
  { name: 'Accessories', slug: 'accessories', level: 1, path: 'accessories', sortOrder: 5 },
  // L2 under Women
  { name: 'Outerwear',          slug: 'outerwear',          level: 2, path: 'women/outerwear',          parentSlug: 'women',       sortOrder: 1 },
  { name: 'Dresses',            slug: 'dresses',            level: 2, path: 'women/dresses',            parentSlug: 'women',       sortOrder: 2 },
  { name: 'Tops',               slug: 'tops',               level: 2, path: 'women/tops',               parentSlug: 'women',       sortOrder: 3 },
  { name: 'Knitwear',           slug: 'knitwear',           level: 2, path: 'women/knitwear',           parentSlug: 'women',       sortOrder: 4 },
  // L3 under Women > Outerwear
  { name: 'Jackets',            slug: 'jackets',            level: 3, path: 'women/outerwear/jackets',  parentSlug: 'outerwear',   sortOrder: 1 },
  { name: 'Blazers',            slug: 'blazers',            level: 3, path: 'women/outerwear/blazers',  parentSlug: 'outerwear',   sortOrder: 2 },
  { name: 'Coats',              slug: 'coats',              level: 3, path: 'women/outerwear/coats',    parentSlug: 'outerwear',   sortOrder: 3 },
  { name: 'Gilets & Vests',     slug: 'gilets-vests',       level: 3, path: 'women/outerwear/gilets-vests', parentSlug: 'outerwear', sortOrder: 4 },
  // ... (full tree from taxonomy.md — truncated for brevity)
];

async function main() {
  // Phase 1: Create L1
  const l1Nodes = TAXONOMY.filter(n => n.level === 1);
  for (const node of l1Nodes) {
    await prisma.category.upsert({
      where: { path: node.path },
      update: { name: node.name, sortOrder: node.sortOrder },
      create: { name: node.name, slug: node.slug, level: node.level, path: node.path, sortOrder: node.sortOrder },
    });
  }

  // Phase 2: Create L2 (lookup parent by path)
  const l2Nodes = TAXONOMY.filter(n => n.level === 2);
  for (const node of l2Nodes) {
    const parentPath = node.path.split('/').slice(0, -1).join('/');
    const parent = await prisma.category.findUnique({ where: { path: parentPath } });
    await prisma.category.upsert({
      where: { path: node.path },
      update: { name: node.name, sortOrder: node.sortOrder },
      create: {
        name: node.name, slug: node.slug, level: node.level,
        path: node.path, sortOrder: node.sortOrder,
        parentId: parent!.id,
      },
    });
  }

  // Phase 3: Create L3 (same pattern)
  const l3Nodes = TAXONOMY.filter(n => n.level === 3);
  for (const node of l3Nodes) {
    const parentPath = node.path.split('/').slice(0, -1).join('/');
    const parent = await prisma.category.findUnique({ where: { path: parentPath } });
    await prisma.category.upsert({
      where: { path: node.path },
      update: { name: node.name, sortOrder: node.sortOrder },
      create: {
        name: node.name, slug: node.slug, level: node.level,
        path: node.path, sortOrder: node.sortOrder,
        parentId: parent!.id,
      },
    });
  }

  console.log(`Seeded ${TAXONOMY.length} category nodes`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 6. Scaling Notes (1K → 10K SKUs)

| Concern | Design decision |
|---|---|
| **Category page speed** | Materialized `path` → single `WHERE path = ?` instead of recursive CTE. O(1) routing. |
| **Facet counts** | Use `SELECT unnest(colors), count(*) ... GROUP BY 1` with GIN index. Fast up to 100K rows. |
| **Price range slider** | `min(price)` / `max(price)` on `product_variants` with category join. Add a materialized view if > 50K variants. |
| **Full-text search** | PostgreSQL `tsvector` handles 10K products easily. Switch to Meilisearch/Typesense only if autocomplete latency > 50ms. |
| **Daily feed updates** | Upsert by `@@unique([source, externalId])` — idempotent. RawProduct grows ~10K rows/day; partition by `feedDate` if it exceeds 1M rows. |
| **Multi-currency** | Store `currency` per variant. Convert to display currency in the application layer using a daily exchange rate table. |
