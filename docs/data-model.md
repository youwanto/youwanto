# Feed Data Analysis & Normalized Schema Design

> Generated from inspection of raw feeds: Awin (CSV/gzip), Partnerize/Outnet (XML), Rakuten (pipe-delimited TXT)

---

## 1. Raw Feed Patterns

### 1.1 Awin — gzipped CSV per merchant, daily

**Ingestion pipeline:**
- `Awin_{date}.csv` → merchant list (~259 rows on 2026-04-13) with `Advertiser ID`, `Advertiser Name`, `Feed ID`, `Last Imported`, `URL`
- `awin_merchant.py` downloads each feed where `Last Imported == today` → `{date}_{advertiserId}_{feedId}.gz`
- Each `.gz` is a CSV with a **custom column set per merchant** (123 unique header schemas observed)

**Header structure — base set (all feeds):**
```
data_feed_id, merchant_id, merchant_name, aw_product_id, aw_deep_link,
aw_image_url, aw_thumb_url, category_id, category_name, brand_id, brand_name,
merchant_product_id, merchant_category, ean, mpn, product_name, description,
merchant_deep_link, merchant_image_url, search_price, delivery_cost, in_stock,
stock_status
```

**Extended base set (most feeds add):**
```
product_short_description, specifications, condition, product_model, model_number,
dimensions, keywords, promotional_text, product_type, commission_group,
merchant_product_category_path, merchant_product_second_category,
merchant_product_third_category, rrp_price, saving, savings_percent,
base_price, base_price_amount, base_price_text,
product_price_old, delivery_restrictions, delivery_weight, warranty,
delivery_time, stock_quantity, valid_from, valid_to, is_for_sale,
web_offer, pre_order, size_stock_status, size_stock_amount,
merchant_thumb_url, large_image, alternate_image, alternate_image_two,
alternate_image_three, alternate_image_four, reviews, average_rating, rating,
number_available, custom_1..9, isbn, upc, parent_product_id, product_GTIN,
basket_link, colour, store_price, currency, language, last_updated,
brand_id, category_id
```

**Vertical extension columns (optional, per feed):**
- `Fashion:category`, `Fashion:material`, `Fashion:pattern`, `Fashion:size`, `Fashion:suitable_for`, `Fashion:swatch`
- `ShoppingNL:energy_label`, `ShoppingNL:google_taxonomy`, `ShoppingNL:material`, `ShoppingNL:pattern`, `ShoppingNL:size`
- `Telcos:connectivity`, `Telcos:contract_type`, `Telcos:deal_*`, `Telcos:device_*`, ...

**Observed merchants / verticals:**
| Merchant | Vertical | Notes |
|---|---|---|
| LOOKFANTASTIC International | Beauty & Fragrance | `base_price_text` = volume (e.g. "50 ml"), `Fashion:suitable_for` => gender |
| Perfumeza IT | Fragrance | Italian-language descriptions |
| Bella Storia PL | Home / Bedding | Polish-language descriptions |
| Tooled Up | Tools & Hardware | Large catalog (~84k rows) |
| + 250 others | Mixed | |

**Key observations:**
- `parent_product_id` groups colour/size variants under a canonical product (often empty)
- `ean` and `product_GTIN` often hold the same 13-digit EAN barcode
- `search_price` = the current purchasable price; `rrp_price` = RRP
- `size_stock_status` / `size_stock_amount` are comma-separated multi-value fields (one entry per size)
- `base_price_amount` + `base_price_text` encode "30 ml", "100 g" style unit pricing

---

### 1.2 Partnerize / The Outnet — XML, daily

**Source:** Single global product feed from theoutnet.com (luxury fashion outlet), GBP

**XML structure:**
```xml
<products>
  <product>
    <Product_ID>         <!-- SKU-level variant ID, e.g. GB_0400660031862 -->
    <item_group_id>      <!-- product group, e.g. GB_1647597291614038P -->
    <Product_Name>       <!-- "{Brand} - {Title} - {Color} - {Size}" -->
    <description>
    <brand>
    <Product_Category>   <!-- "Shoes > Boots > Knee-High" -->
    <color>
    <size>               <!-- EU sizing, e.g. "EU 35" -->
    <material>           <!-- "100% Lambskin" -->
    <gender>             <!-- "Female" -->
    <age_group>          <!-- "Adult" -->
    <condition>          <!-- "New" -->
    <availability>       <!-- numeric: 1=limited, 2=available -->
    <Product_Value>      <!-- original price, GBP -->
    <sale_price>         <!-- current sale price, GBP -->
    <percentage_sale>    <!-- "64.97%" -->
    <Product_Image>      <!-- primary image URL -->
    <additional_image_link> <!-- comma-separated extra images -->
    <Product_URL>        <!-- Partnerize affiliate URL -->
    <mpn>                <!-- Outnet internal long numeric ID -->
    <shipping>           <!-- "GB::Free Express Delivery On All Orders" -->
    <badges>             <!-- "SALE,ONLY ONE LEFT" -->
  </product>
</products>
```

**Key observations:**
- **One row = one variant** (product × size combination)
- `item_group_id` groups all sizes of a product → use as `product.groupId`
- `Product_ID` prefix (`GB_`) indicates the market (GB = GBP)
- `Product_Name` encodes brand + title + color + size → must be parsed to extract clean product title
- `availability` is numeric (1-2); 0 would mean out of stock — never send OOS variants
- `percentage_sale` is always present (outlet model: everything on sale)
- `badges` contains business signals: SALE, ONLY ONE LEFT, etc.
- No explicit currency field — derived from `Product_ID` prefix (`GB_` → GBP)

---

### 1.3 Rakuten / LinkSynergy — pipe-delimited TXT, daily, per merchant

**Source:** FTP download from `aftp.linksynergy.com`

**File naming:** `{date}_{merchantId}_{publisherId}_mp.txt`
- `_mp.txt` = full catalog
- `_delta.txt` = changes since last full
- `_template.txt`  = full catalog (with placeholder affiliate IDs `<LSN EID>`, `<LSN OID>`)
- `_deltatemplate.txt` = delta with placeholders

**File structure:** First line = `HDR|{merchantId}|{merchantName}|{date}`, subsequent lines are pipe-delimited product rows (no column-name header row).

**Observed merchants (2026-04-13, ~20 merchants):**
`42587` Coach (ES/IT/FR), `42904` Zadig & Voltaire, `43264`, `44328`, `44544`, `45694`, `45901`, `46387`, `46401`, `46614`, `46716`, `46717`, `46900`, `47328`, `47342`, `47534`, `47597`, `48150`, `49029`, `49199`

**Field map (38 pipe positions; Rakuten MSP standard layout):**
| # | Field | Example (Coach) | Example (Z&V) |
|---|---|---|---|
| 1 | Rakuten Product ID | `4258717317486483054384314` | `429042630084021772107335` |
| 2 | Product Name | `Épinglette Souvenir Numéro 8` | `Parfum This is Her! 50ML` |
| 3 | SKU / MPN | `28190 BLK` | `HEREDT50F_1` |
| 4 | Category (L1) | `Apparel & Accessories` | `Parfums` |
| 5 | Category (L2, `~~` separated) | `Jewelry~~Brooches & Lapel Pins` | _(empty)_ |
| 6 | Affiliate URL | `https://click.linksynergy.com/...` | |
| 7 | Primary Image URL | `https://coach.scene7.com/...` | `https://channableusercontent.com/...` |
| 8 | Secondary Image | _(empty)_ | _(empty)_ |
| 9 | Short Description | `COACH Épinglette... Métal` | `Eau de parfum...` |
| 10 | Long Description | _(same as col 9 for Coach)_ | |
| 11-13 | _(empty)_ | | |
| 14 | Price | `20.00` | `95.00` |
| 15-16 | _(empty)_ | | |
| 17 | Brand Name | `COACH` | `Zadig & Voltaire` |
| 18 | Shipping Cost | `5.00` | `4.90` |
| 19 | _(empty)_ | | |
| 20 | EAN-13 (without leading zeros) | `191202418066` | `HEREDT50F_1` |
| 21 | Brand (repeat) | `COACH` | `Zadig & Voltaire` |
| 22 | Shipping details | `FR:5.00 EUR:1:1:1:3` | _(empty)_ |
| 23 | Availability | `in-stock` | `in-stock` |
| 24 | UPC / EAN-14 (with leading zeros) | `00191202418066` | `03423474891757` |
| 25 | Commission rate (%) | `60` | _(empty)_ |
| 26 | Currency | `EUR` | `EUR` |
| 27 | Additional Images (comma-sep) | _(empty)_ | `https://coach.scene7.com/...,` |
| 28 | Impression pixel URL | `https://ad.linksynergy.com/...` | |
| 29 | Merchant short SKU | `28190` | `HEREDT50F` |
| 30 | Merchant category path | `Women > Accessories & Jewelry > Tech & Travel` | _(empty)_ |
| 31 | Size | `one size` | _(empty)_ |
| 32 | Material | `Métal` | _(empty)_ |
| 33 | Color | `Noir` | _(empty)_ |
| 34 | Gender | `Female` | _(empty)_ |
| 35 | _(empty)_ | | |
| 36 | Age Group | `adult` | _(empty)_ |
| 37-38 | _(flags/empty)_ | | |

**Key observations:**
- No column-name header — positional parsing required
- Col 20 vs col 24: col 24 is the canonical GTIN-14 (EAN13 with leading zero prefix); strip leading zeros to get EAN-13
- Col 4/5 vs col 30: col 4/5 = Rakuten's own taxonomy; col 30 = merchant's category path — prefer col 30 for normalization
- Col 22 shipping format: `{country}:{cost} {currency}:{flag1}:{flag2}:{flag3}:{flag4}`
- Many fields empty for simpler merchants (Z&V vs Coach)

---

## 2. Stable Business Attributes (present across all 3 sources)

| Attribute | Awin | Outnet | Rakuten |
|---|---|---|---|
| **Product ID (variant)** | `aw_product_id` | `Product_ID` | col1 |
| **Product group ID** | `parent_product_id` | `item_group_id` | derived from col29 prefix |
| **Product name** | `product_name` | parse `Product_Name` | col2 |
| **Description** | `description` | `description` | col9 (short) / col10 (long) |
| **Brand** | `brand_name` | `brand` | col17 |
| **Affiliate/deep link** | `aw_deep_link` | `Product_URL` | col6 |
| **Primary image** | `merchant_image_url` | `Product_Image` | col7 |
| **Additional images** | `alternate_image*`, `large_image` | `additional_image_link` (CSV) | col27 (CSV) |
| **Category path** | `merchant_product_category_path` | `Product_Category` | col30 |
| **Current price** | `search_price` | `sale_price` | col14 |
| **Original / RRP price** | `rrp_price` / `store_price` | `Product_Value` | _(absent)_ |
| **Currency** | `currency` | derived from `Product_ID` prefix | col26 |
| **EAN / GTIN** | `ean` / `product_GTIN` | _(absent — only `mpn`)_ | col24 (GTIN-14) |
| **MPN / SKU** | `mpn` / `merchant_product_id` | `mpn` | col3 / col29 |
| **Color** | `colour` | `color` | col33 |
| **Size** | `Fashion:size` (optional) | `size` | col31 |
| **Material** | `Fashion:material` (optional) | `material` | col32 |
| **Gender** | `Fashion:suitable_for` (optional) | `gender` | col34 |
| **Age group** | _(absent)_ | `age_group` | col36 |
| **Availability / in-stock** | `in_stock` (0/1) | `availability` (>0 = in stock) | col23 (`"in-stock"`) |
| **Stock quantity** | `stock_quantity` | _(absent)_ | _(absent)_ |
| **Condition** | `condition` | `condition` | _(absent)_ |
| **Shipping** | `delivery_cost` / `delivery_time` | `shipping` | col18 / col22 |
| **Discount %** | `savings_percent` | `percentage_sale` | _(absent)_ |
| **Badges / flags** | `stock_status`, `size_stock_status` | `badges` | col23 (`"in-stock"`) |
| **Reviews** | `reviews`, `average_rating`, `rating` | _(absent)_ | _(absent)_ |
| **Unit pricing** | `base_price_amount` + `base_price_text` | _(absent)_ | _(absent)_ |
| **Merchant source** | `merchant_id` + `merchant_name` | `"The Outnet"` | HDR col2 + col3 |

---

## 3. Taxonomy

Data spans multiple verticals. Observed categories:

### From Outnet (luxury fashion — clean hierarchy):
```
Shoes > Boots > Knee-High
Shoes > Sneakers
Clothing > Dresses > Mini
Clothing > Tops & T-Shirts
Bags > Handbags > Mini
Accessories > Jewelry
```

### From Rakuten (luxury fashion + fragrance):
```
Apparel & Accessories > Jewelry > Brooches & Lapel Pins
Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips
Parfums (top-level)
Women > Small Leather Goods > Wallets
Women > Accessories & Jewelry > Tech & Travel
```

### From Awin / LOOKFANTASTIC:
```
Health and Beauty > Fragrance
Fragrance (Awin standard category_name)
```

### From Awin / Bella Storia:
```
Prześcieradła > Prześcieradła z jerseyu  (Polish)
Pościele > Pościel flanelowa
```

### Proposed canonical taxonomy (L1 → L2 → L3):
```
Fashion & Apparel
  Clothing
    Tops & T-Shirts
    Dresses
    Jumpsuits & Playsuits
    Jackets & Coats
    Knitwear
    Trousers & Shorts
    Skirts
    Swimwear
    Suits & Tailoring
  Shoes & Footwear
    Boots (Ankle, Knee-High, Over-the-Knee)
    Heels & Pumps
    Sneakers & Trainers
    Sandals & Mules
    Flats & Loafers
  Bags & Luggage
    Handbags
    Shoulder & Crossbody
    Clutches & Evening Bags
    Backpacks
    Wallets & Small Leather Goods
    Luggage & Travel
  Accessories & Jewelry
    Jewelry (Rings, Necklaces, Earrings, Bracelets, Brooches)
    Belts & Scarves
    Hats & Gloves
    Sunglasses & Eyewear
    Watches

Beauty & Fragrance
  Fragrance (Eau de Parfum, Eau de Toilette, Perfume Oil)
  Skincare
  Haircare
  Makeup

Home & Living
  Bedding & Textiles (Sheets, Duvets, Pillowcases)
  Bath & Towels
  Cushions & Throws
  Home Décor

Tools & Hardware
  Power Tools
  Hand Tools
  Garden Tools

Other / Uncategorized
```

---

## 4. Normalized Schema (3 layers)

### Layer 1 — Raw Ingestion (keep as-is, append-only)

Store raw rows exactly as received, keyed for deduplication. No transformation.

```
raw_product {
  id           String  (uuid)
  source       Enum    AWIN | OUTNET | RAKUTEN
  merchantId   String  (source merchant identifier)
  feedId       String? (Awin feed ID)
  productId    String  (source variant-level ID)
  ingestedAt   DateTime
  feedDate     Date    (date of the file)
  rawPayload   Json    (entire row as key-value map)
}
```

### Layer 2 — Normalized Commerce Layer

#### Merchant
```
merchant {
  id          String  (uuid)
  source      Enum    AWIN | OUTNET | RAKUTEN
  externalId  String  (source merchant ID)
  name        String
  url         String?
  // composite unique: (source, externalId)
}
```

#### Product (parent/group — color-agnostic)
```
product {
  id          String  (uuid)
  merchantId  String  → merchant.id
  groupId     String? (source group ID: parent_product_id / item_group_id / derived)
  externalId  String  (source product ID)
  name        String  (cleaned — strip color/size suffix if present)
  description String?
  brand       String?
  ean         String? (13-digit, normalized)
  mpn         String? (merchant part number / SKU root)
  condition   Enum    NEW | USED | REFURBISHED
  ingestedAt  DateTime
  updatedAt   DateTime
}
```

#### ProductVariant (SKU-level — size + color specific)
```
productVariant {
  id          String  (uuid)
  productId   String  → product.id
  externalId  String  (source SKU-level ID)
  sku         String? (merchant short SKU)
  color       String?
  size        String?
  material    String?
  gender      Enum    FEMALE | MALE | UNISEX | KIDS
  ageGroup    Enum    ADULT | KIDS
  inStock     Boolean
  stockQty    Int?
  deepLink    String  (affiliate URL)
  imageUrl    String  (primary image)
  images      String[] (additional images)
  ingestedAt  DateTime
  updatedAt   DateTime
}
```

#### ProductPrice (time-series — one row per capture)
```
productPrice {
  id            String  (uuid)
  variantId     String  → productVariant.id
  currency      String  (ISO 4217: GBP, EUR, PLN…)
  currentPrice  Decimal
  rrpPrice      Decimal?
  discountPct   Decimal?
  capturedAt    DateTime
}
```

> Rationale: prices change daily. Keep history for trending and alerting.

#### ProductCategory
```
productCategory {
  variantId     String  → productVariant.id
  source        Enum    (which source provided the path)
  rawPath       String  (e.g. "Shoes > Boots > Knee-High")
  normalizedId  String? → taxonomyNode.id  (mapped after ingestion)
}
```

#### ProductShipping
```
productShipping {
  variantId    String  → productVariant.id
  country      String? (ISO alpha-2, e.g. "GB", "FR")
  cost         Decimal?
  currency     String?
  description  String? (raw shipping text)
}
```

### Layer 3 — Experience / Search Layer

#### TaxonomyNode (canonical category tree)
```
taxonomyNode {
  id       String  (uuid)
  slug     String  (e.g. "shoes-boots-knee-high")
  name     String  (e.g. "Knee-High Boots")
  parentId String? → taxonomyNode.id
  level    Int     (1=L1, 2=L2, 3=L3)
}
```

#### ProductSearchIndex (denormalized for search / filter)
```
productSearchIndex {
  variantId       String  → productVariant.id
  taxonomyIds     String[] (L1/L2/L3 node IDs)
  filterBrand     String
  filterColor     String? (normalized: "Black" not "Noir")
  filterSize      String? (normalized: "EU 35" / "M" / "50 ml")
  filterGender    String?
  filterMaterial  String?
  priceMin        Decimal (current sale price in display currency)
  priceMax        Decimal (rrp price, for range facets)
  currency        String
  discountPct     Decimal?
  badges          String[] (SALE, LOW_STOCK, NEW_ARRIVAL…)
  inStock         Boolean
  seoTitle        String?
  seoDescription  String?
  updatedAt       DateTime
}
```

---

## 5. Field Mapping Rules (Source → Normalized)

### 5.1 Awin

```yaml
merchant:
  source:      "AWIN"
  externalId:  merchant_id
  name:        merchant_name

product:
  externalId:  aw_product_id
  groupId:     parent_product_id  # often empty; use merchant_product_id prefix as fallback
  name:        product_name
  description: description | product_short_description
  brand:       brand_name
  ean:         ean | product_GTIN    # prefer 13-digit; strip leading zeros if needed
  mpn:         mpn | model_number
  condition:   condition            # "new" → NEW, "used" → USED, "refurbished" → REFURBISHED

productVariant:
  externalId:  merchant_product_id
  sku:         merchant_product_id
  color:       colour
  size:        "Fashion:size"       # may be absent on non-fashion feeds
  material:    "Fashion:material"
  gender:      "Fashion:suitable_for"  # normalize: "female" → FEMALE
  ageGroup:    # not present in Awin; default ADULT for adult-content feeds
  inStock:     in_stock             # "1" or "true" → true
  stockQty:    stock_quantity
  deepLink:    aw_deep_link
  imageUrl:    merchant_image_url | aw_image_url
  images:      [alternate_image, alternate_image_two, alternate_image_three,
                alternate_image_four, large_image]  # filter nulls

productPrice:
  currentPrice: search_price        # parse Decimal
  rrpPrice:     rrp_price | store_price
  currency:     currency
  discountPct:  savings_percent     # "20.00" → 20.00

productCategory:
  rawPath:  merchant_product_category_path
            | merchant_category
            | category_name         # priority order
```

### 5.2 Partnerize / The Outnet

```yaml
merchant:
  source:      "OUTNET"
  externalId:  "theoutnet"
  name:        "The Outnet"

product:
  externalId:  item_group_id
  groupId:     item_group_id
  name:        # strip " - {Color} - {Size}" suffix from Product_Name
               # Pattern: split by " - ", take parts[0] + " - " + parts[1]
  description: description
  brand:       brand
  ean:         # not present; mpn is Outnet's internal ID, not an EAN
  mpn:         mpn

productVariant:
  externalId:  Product_ID
  sku:         Product_ID
  color:       color
  size:        size                  # "EU 35" → store as-is; normalize separately
  material:    material              # "100% Lambskin"
  gender:      gender                # "Female" → FEMALE
  ageGroup:    age_group             # "Adult" → ADULT
  inStock:     availability > 0     # 1 or 2 → true; edge-case 0 → false
  deepLink:    Product_URL
  imageUrl:    Product_Image
  images:      split(additional_image_link, ",")

productPrice:
  currentPrice: sale_price
  rrpPrice:     Product_Value
  currency:     # derive from Product_ID prefix: "GB_" → "GBP"
  discountPct:  parse_pct(percentage_sale)  # "64.97%" → 64.97

productCategory:
  rawPath:  Product_Category  # "Shoes > Boots > Knee-High"

badges:  split(badges, ",")   # store in productSearchIndex.badges
         # known values: SALE, ONLY ONE LEFT → LOW_STOCK
```

### 5.3 Rakuten

```yaml
# Header row: HDR|{mid}|{name}|{date}
merchant:
  source:      "RAKUTEN"
  externalId:  header_col2   # e.g. "42587"
  name:        header_col3   # e.g. "Coach (ES/IT/FR)"

product:
  externalId:  col29         # short merchant SKU (root of variant ID)
  groupId:     col29         # no explicit group ID; use SKU root
  name:        col2
  description: col10 | col9  # long desc preferred, fall back to short
  brand:       col17
  ean:         # col24 is GTIN-14 (14 digits with leading zeros)
               # strip leading zeros for EAN-13: col24.lstrip("0")[-13:]
               # col20 may be EAN-13 directly (validate length)
  mpn:         col3          # e.g. "28190 BLK"
  condition:   NEW           # Rakuten luxury brands = always new

productVariant:
  externalId:  col1          # Rakuten composite product ID
  sku:         col3          # full SKU including variant suffix
  color:       col33
  size:        col31
  material:    col32
  gender:      col34         # "Female" → FEMALE; empty → UNISEX
  ageGroup:    col36         # "adult" → ADULT
  inStock:     col23 == "in-stock"
  deepLink:    col6
  imageUrl:    col7
  images:      split(col27, ",") | [col8]  # filter empty

productPrice:
  currentPrice: col14
  currency:     col26
  # no rrpPrice in Rakuten feeds
  shippingCost: col18
  shippingDetails: col22    # "FR:5.00 EUR:1:1:1:3"

productCategory:
  rawPath:  col30            # "Women > Small Leather Goods > Wallets"
            | col5           # Rakuten sub-category (split on "~~" for L2/L3)
            | col4           # Rakuten top-level category
```

---

## 6. Cross-Source Entity Resolution

The same physical product may appear in multiple sources. The resolution key priority:

1. **EAN-13 / product_GTIN** — most reliable global identifier (not present in Outnet)
2. **MPN + Brand** — meaningful within a brand's catalog
3. **Product name + Brand** — fuzzy last resort

For Outnet: `item_group_id` is their internal group ID. No EAN available → can only deduplicate within Outnet.

---

## 7. Known Data Quality Issues

| Issue | Source | Handling |
|---|---|---|
| 123 different column schemas | Awin | Parse by header row; use robust `csv.DictReader` |
| Variant-level size in `Product_Name` | Outnet | Regex-strip suffix: `r" - [A-Z]{2,3} \d{2}\.?\d?$"` |
| No column header row | Rakuten | Map by fixed position; validate field count == 38 |
| Mixed currency codes | Awin | Always store; convert to display currency in Layer 3 |
| `savings_percent` as string | Awin | Parse as Decimal, `"0.00"` → null |
| `percentage_sale` as `"64.97%"` | Outnet | Strip `%`, parse Decimal |
| EAN with/without leading zeros | Rakuten col20/col24 | Normalize to 13 digits: strip zeros, validate Luhn-like check |
| Empty `parent_product_id` | Awin | Derive group from `aw_product_id` base ID or treat each as standalone |
| Multi-language descriptions | Awin | Store `language` field; index language per feed |
| Size-stock as comma-separated | Awin | Parse `size_stock_status`/`size_stock_amount` as arrays → one row per size variant |
| `availability` numeric in Outnet | Outnet | 1 = "Low Stock" badge; 2 = "In Stock"; treat both as in-stock |
