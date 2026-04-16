# YouWanto.com — Fashion Taxonomy

> Canonical 3-level category tree for navigation, facets, and SEO URLs.
> Derived from real feed inspection: 259 Outnet categories, ~120 Rakuten category paths, Awin Fashion-vertical feeds.

---

## 1. Design Principles

| Principle | Rule |
|---|---|
| **Depth** | 3 levels max: Department → Category → Subcategory |
| **Breadth** | Broad & shallow — aim for 5–8 categories per department, 5–15 subcategories per category |
| **Mutually exclusive** | Every product maps to exactly one leaf. No product appears in two subcategories |
| **Customer-friendly** | Plain English names a shopper would search for. No internal jargon |
| **SEO slugs** | Lowercase, hyphenated, unique at each level: `/women/outerwear/jackets` |
| **3-click navigation** | Department (L1) → Category (L2) → Subcategory (L3). Every product reachable in ≤3 clicks |
| **No duplicates** | If an item fits two paths (e.g. "Denim Jacket" → Denim or Outerwear), pick the one customers expect: Outerwear |
| **Extensible** | Adding a new L3 subcategory never breaks URLs or existing mappings |

---

## 2. Category Tree

### Department: **Women** (`/women`)

| L2 Category | Slug | L3 Subcategories | Slug |
|---|---|---|---|
| **Outerwear** | `outerwear` | Jackets | `jackets` |
| | | Blazers | `blazers` |
| | | Coats | `coats` |
| | | Gilets & Vests | `gilets-vests` |
| | | Puffer & Down Jackets | `puffer-down-jackets` |
| | | Leather Jackets | `leather-jackets` |
| | | Capes & Ponchos | `capes-ponchos` |
| | | Trench Coats | `trench-coats` |
| **Dresses** | `dresses` | Mini Dresses | `mini-dresses` |
| | | Midi Dresses | `midi-dresses` |
| | | Maxi Dresses | `maxi-dresses` |
| | | Cocktail & Party Dresses | `cocktail-party-dresses` |
| | | Evening Gowns | `evening-gowns` |
| | | Wrap Dresses | `wrap-dresses` |
| | | Knit Dresses | `knit-dresses` |
| | | Slip Dresses | `slip-dresses` |
| **Tops** | `tops` | T-Shirts | `t-shirts` |
| | | Blouses | `blouses` |
| | | Shirts | `shirts` |
| | | Tanks & Camis | `tanks-camis` |
| | | Bodysuits | `bodysuits` |
| | | Sweatshirts & Hoodies | `sweatshirts-hoodies` |
| | | Crop Tops | `crop-tops` |
| **Knitwear** | `knitwear` | Sweaters | `sweaters` |
| | | Cardigans | `cardigans` |
| | | Turtlenecks | `turtlenecks` |
| | | Cashmere | `cashmere` |
| | | V-Necks | `v-necks` |
| **Trousers & Shorts** | `trousers-shorts` | Wide-Leg Trousers | `wide-leg-trousers` |
| | | Straight-Leg Trousers | `straight-leg-trousers` |
| | | Skinny Trousers | `skinny-trousers` |
| | | Tailored Trousers | `tailored-trousers` |
| | | Leggings | `leggings` |
| | | Shorts | `shorts` |
| | | Culottes | `culottes` |
| **Jeans & Denim** | `jeans-denim` | Skinny Jeans | `skinny-jeans` |
| | | Straight Jeans | `straight-jeans` |
| | | Slim Jeans | `slim-jeans` |
| | | Wide-Leg Jeans | `wide-leg-jeans` |
| | | Denim Jackets | `denim-jackets` |
| | | Denim Skirts | `denim-skirts` |
| **Skirts** | `skirts` | Mini Skirts | `mini-skirts` |
| | | Midi Skirts | `midi-skirts` |
| | | Maxi Skirts | `maxi-skirts` |
| | | Pleated Skirts | `pleated-skirts` |
| | | Pencil Skirts | `pencil-skirts` |
| **Jumpsuits & Playsuits** | `jumpsuits-playsuits` | Full-Length Jumpsuits | `full-length-jumpsuits` |
| | | Cropped Jumpsuits | `cropped-jumpsuits` |
| | | Playsuits | `playsuits` |
| **Suits & Tailoring** | `suits-tailoring` | Suit Jackets | `suit-jackets` |
| | | Suit Trousers | `suit-trousers` |
| | | Waistcoats | `waistcoats` |
| **Lingerie & Loungewear** | `lingerie-loungewear` | Bras & Bralettes | `bras-bralettes` |
| | | Briefs | `briefs` |
| | | Robes | `robes` |
| | | Bodysuits | `lingerie-bodysuits` |
| | | Loungewear | `loungewear` |
| **Swimwear** | `swimwear` | Bikinis | `bikinis` |
| | | One-Pieces | `one-pieces` |
| | | Coverups | `coverups` |
| **Activewear** | `activewear` | Sports Bras | `sports-bras` |
| | | Leggings | `active-leggings` |
| | | Tops | `active-tops` |
| | | Skiwear | `skiwear` |

### Department: **Men** (`/men`)

| L2 Category | Slug | L3 Subcategories | Slug |
|---|---|---|---|
| **Outerwear** | `outerwear` | Jackets | `jackets` |
| | | Blazers | `blazers` |
| | | Coats | `coats` |
| | | Gilets & Vests | `gilets-vests` |
| | | Puffer & Down Jackets | `puffer-down-jackets` |
| | | Leather Jackets | `leather-jackets` |
| **Tops** | `tops` | T-Shirts | `t-shirts` |
| | | Shirts | `shirts` |
| | | Polo Shirts | `polo-shirts` |
| | | Sweatshirts & Hoodies | `sweatshirts-hoodies` |
| **Knitwear** | `knitwear` | Sweaters | `sweaters` |
| | | Cardigans | `cardigans` |
| | | Turtlenecks | `turtlenecks` |
| **Trousers & Shorts** | `trousers-shorts` | Trousers | `trousers` |
| | | Shorts | `shorts` |
| | | Chinos | `chinos` |
| **Jeans & Denim** | `jeans-denim` | Jeans | `jeans` |
| **Suits & Tailoring** | `suits-tailoring` | Blazers | `blazers` |
| | | Formal Trousers | `formal-trousers` |
| | | Waistcoats | `waistcoats` |

### Department: **Shoes** (`/shoes`)

| L2 Category | Slug | L3 Subcategories | Slug |
|---|---|---|---|
| **Boots** | `boots` | Ankle Boots | `ankle-boots` |
| | | Knee-High Boots | `knee-high-boots` |
| | | Over-the-Knee Boots | `over-the-knee-boots` |
| | | Chelsea Boots | `chelsea-boots` |
| | | Combat Boots | `combat-boots` |
| | | Cowboy Boots | `cowboy-boots` |
| | | Rain Boots | `rain-boots` |
| **Heels & Pumps** | `heels-pumps` | High Heels | `high-heels` |
| | | Mid Heels | `mid-heels` |
| | | Wedges | `wedges` |
| **Flat Shoes** | `flat-shoes` | Ballet Flats | `ballet-flats` |
| | | Loafers | `loafers` |
| | | Lace-Ups | `lace-ups` |
| | | Slippers | `slippers` |
| **Sneakers & Trainers** | `sneakers-trainers` | Fashion Sneakers | `fashion-sneakers` |
| | | Sport Sneakers | `sport-sneakers` |
| **Sandals** | `sandals` | Flat Sandals | `flat-sandals` |
| | | Heeled Sandals | `heeled-sandals` |
| | | Slides | `slides` |
| | | Platform Sandals | `platform-sandals` |

### Department: **Bags** (`/bags`)

| L2 Category | Slug | L3 Subcategories | Slug |
|---|---|---|---|
| **Shoulder Bags** | `shoulder-bags` | All Shoulder Bags | `all-shoulder-bags` |
| | | Bucket Bags | `bucket-bags` |
| **Crossbody Bags** | `crossbody-bags` | — | — |
| **Tote Bags** | `tote-bags` | — | — |
| **Mini Bags** | `mini-bags` | — | — |
| **Clutch & Evening Bags** | `clutch-evening-bags` | Clutches | `clutches` |
| | | Evening Bags | `evening-bags` |
| **Backpacks** | `backpacks` | — | — |
| **Top Handle Bags** | `top-handle-bags` | — | — |
| **Belt Bags** | `belt-bags` | — | — |
| **Luggage & Travel** | `luggage-travel` | Weekend Bags | `weekend-bags` |

### Department: **Accessories** (`/accessories`)

| L2 Category | Slug | L3 Subcategories | Slug |
|---|---|---|---|
| **Jewelry** | `jewelry` | Necklaces | `necklaces` |
| | | Earrings | `earrings` |
| | | Bracelets | `bracelets` |
| | | Rings | `rings` |
| | | Brooches | `brooches` |
| **Scarves & Wraps** | `scarves-wraps` | — | — |
| **Belts** | `belts` | — | — |
| **Hats & Gloves** | `hats-gloves` | Hats | `hats` |
| | | Gloves | `gloves` |
| **Sunglasses** | `sunglasses` | — | — |
| **Watches** | `watches` | — | — |
| **Wallets & Card Cases** | `wallets-card-cases` | Wallets | `wallets` |
| | | Card Holders | `card-holders` |
| | | Wristlets | `wristlets` |
| **Hair Accessories** | `hair-accessories` | — | — |
| **Tech Accessories** | `tech-accessories` | Phone Cases | `phone-cases` |
| | | Headphone Cases | `headphone-cases` |
| **Keychains & Charms** | `keychains-charms` | — | — |

---

## 3. URL Pattern

```
https://youwanto.com/{department}/{category}/{subcategory}

Examples:
  /women/outerwear/jackets
  /shoes/boots/ankle-boots
  /bags/crossbody-bags
  /accessories/jewelry/earrings
  /men/knitwear/sweaters
```

If a category has no L3 children (e.g. `/bags/backpacks`), the L2 page is the leaf listing.

---

## 4. Product-to-Taxonomy Mapping — 10 Real Examples

| # | Raw Product | Source | Raw Category Path | → YouWanto Path |
|---|---|---|---|---|
| 1 | **3.1 Phillip Lim — Nadia leather boots** (Black, EU 35, 100% Lambskin) | Outnet | `Shoes > Boots > Knee-High` | `/shoes/boots/knee-high-boots` |
| 2 | **GANNI — Linen-canvas blazer** (Beige, EU 36, 100% Linen) | Outnet | `Clothing > Jackets > Blazers` | `/women/outerwear/blazers` |
| 3 | **Zimmermann — Slub linen blazer** (Ivory, size 3, 100% Linen) | Outnet | `Clothing > Jackets > Blazers` | `/women/outerwear/blazers` |
| 4 | **Sandro — Pleated crepe midi wrap dress** (Black, FR 34, Polyester) | Outnet | `Clothing > Dresses > Work Dresses` | `/women/dresses/midi-dresses` |
| 5 | **3.1 Phillip Lim — Brushed ribbed-knit cardigan** (Gray, S, Nylon/Wool/Alpaca) | Outnet | `Clothing > Knitwear > Cardigans` | `/women/knitwear/cardigans` |
| 6 | **Kenzo — Glossed-leather combat boots** (White, EU 40, Bovine leather) | Outnet | `Shoes > Boots > Ankle` | `/shoes/boots/combat-boots` |
| 7 | **MICHAEL Michael Kors — Basketweave clutch** (Ecru, OneSize) | Outnet | `Bags > Evening Bags` | `/bags/clutch-evening-bags/evening-bags` |
| 8 | **COACH — Sac épaule Juliet 25** (Laiton/Érable, one size, Cuir) | Rakuten | `Women > Bags > Women's Shoulder Bags` | `/bags/shoulder-bags` |
| 9 | **COACH — Ceinture Réversible Harness 25mm** (Laiton/Craie, Large, PVC) | Rakuten | `Women > Accessories & Jewelry > Belts` | `/accessories/belts` |
| 10 | **Jacquemus — Terra cropped poplin shirt** (Black, FR 32, Polyamide) | Outnet | `Clothing > Tops > Shirts` | `/women/tops/shirts` |

### Mapping decision notes:
- **#4 (Sandro wrap dress)**: Raw path says "Work Dresses" — YouWanto maps by silhouette: "Midi Dresses". Work/occasion is a tag, not a category.
- **#6 (Kenzo combat boots)**: Raw "Ankle" is too generic. Combat boots have their own subcategory because the feed `description` mentions "combat boots".
- **#8 (Coach shoulder bag)**: Rakuten path starts with `Women >` — ignore the gender prefix; Bags is gender-neutral in our tree.
- **#9 (Coach belt)**: Rakuten `Women > Accessories & Jewelry > Belts` → flattened to `/accessories/belts`.

---

## 5. Facets per L2 Category

| L2 Category | Color | Size | Brand | Material | Price | Extra Facets |
|---|---|---|---|---|---|---|
| **Outerwear** | Yes | XS–XL / EU 34-48 | Yes | Yes (Wool, Leather, Linen, Down) | Yes | Sleeve length |
| **Dresses** | Yes | XS–XL / FR 34-44 / IT 36-48 | Yes | Yes (Silk, Cotton, Polyester) | Yes | Length (Mini/Midi/Maxi) |
| **Tops** | Yes | XS–XL | Yes | Yes (Cotton, Silk, Linen) | Yes | Sleeve length, Neckline |
| **Knitwear** | Yes | XS–XL | Yes | Yes (Cashmere, Wool, Cotton) | Yes | Neckline |
| **Trousers & Shorts** | Yes | Waist 24–36 / XS–XL | Yes | Yes | Yes | Leg shape |
| **Skirts** | Yes | XS–XL | Yes | Yes | Yes | Length |
| **Boots** | Yes | EU 35–42 / US 5–12 | Yes | Yes (Leather, Suede, Rubber) | Yes | Heel height, Shaft height |
| **Heels & Pumps** | Yes | EU 35–42 | Yes | Yes | Yes | Heel height |
| **Flat Shoes** | Yes | EU 35–42 | Yes | Yes | Yes | — |
| **Sneakers** | Yes | EU 35–46 | Yes | Yes | Yes | — |
| **Sandals** | Yes | EU 35–42 | Yes | Yes | Yes | Heel height |
| **Shoulder Bags** | Yes | OneSize | Yes | Yes (Leather, Canvas, PVC) | Yes | — |
| **Crossbody Bags** | Yes | OneSize | Yes | Yes | Yes | — |
| **Jewelry** | Yes (Metal color) | OneSize | Yes | Yes (Gold, Silver, Brass) | Yes | Type |
| **Sunglasses** | Yes (Frame color) | OneSize | Yes | Yes (Acetate, Metal) | Yes | Shape |
| **Belts** | Yes | XS–XL / cm | Yes | Yes | Yes | Width |
| **Wallets & Card Cases** | Yes | OneSize | Yes | Yes | Yes | — |

### Facet source mapping

| Facet | Awin field | Outnet field | Rakuten field |
|---|---|---|---|
| **Color** | `colour` | `color` | col33 |
| **Size** | `Fashion:size` | `size` | col31 |
| **Brand** | `brand_name` | `brand` | col17 |
| **Material** | `Fashion:material` | `material` | col32 |
| **Price** | `search_price` + `currency` | `sale_price` (GBP) | col14 + col26 |
| **Discount %** | `savings_percent` | `percentage_sale` | — |

---

## 6. Best Practices & Rules

1. **Broad over deep.** If a subcategory has fewer than 20 products, merge it into its parent or a sibling. Don't create subcategories just because the raw feed has them.
2. **Mutually exclusive categories.** "Denim Jackets" lives under `Jeans & Denim`, not under `Outerwear`. Pick one home.
3. **Occasion is not a category.** "Work Dresses", "Evening Tops" → these are tags/filters on the experience layer, not tree nodes.
4. **Gender in departments, not categories.** Shoes and Bags are shared across genders. Use `Women` / `Men` departments for clothing only. If Men's offerings grow, add gender-specific L3 nodes under Shoes/Bags later.
5. **Map raw fields to tree, not descriptions.** Use `merchant_product_category_path` (Awin), `Product_Category` (Outnet), col30 (Rakuten) first. Fall back to `product_name` keyword matching only when raw category is empty.
6. **Slug immutability.** Once a slug is published, never rename it. Add redirects instead. Slugs form permanent URLs.
7. **Full materialized path.** Store `path` as `women/outerwear/jackets` on each `Category` row for fast URL routing and breadcrumb rendering without recursive queries.
8. **Sort order.** Each node has `sortOrder` for deterministic rendering. Departments: Women=1, Men=2, Shoes=3, Bags=4, Accessories=5.
