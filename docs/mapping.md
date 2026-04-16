# YouWanto.com — Feed-to-Store Mapping Rules

> How raw feed data (`RawProduct.rawPayload`) maps to normalized `Product`, `ProductVariant`, and `Category`.
> References field names from [data-model.md](data-model.md) §5 and taxonomy from [taxonomy.md](taxonomy.md).

---

## 1. Mapping Pipeline Overview

```
RawProduct.rawPayload (JSON)
    │
    ├─ extractProduct()     → Product (upsert by source + externalId)
    ├─ extractVariants()    → ProductVariant[] (upsert by productId + externalId)
    ├─ extractCategory()    → Category lookup by path → ProductCategory link
    └─ snapshotPrice()      → ProductPrice (append)
```

---

## 2. Per-Source Field Mapping

### 2.1 Outnet (Partnerize XML)

| Normalized Field | Raw Field | Transform |
|---|---|---|
| **Product.name** | `Product_Name` | Split by `" - "`, take parts `[1]` (skip brand at `[0]`, strip color `[-2]` and size `[-1]`). E.g. `"3.1 Phillip Lim - Nadia leather boots - Black - EU 35"` → `"Nadia Leather Boots"` |
| **Product.slug** | derived | `slugify(name + '-' + brand)` → `"nadia-leather-boots-3-1-phillip-lim"` |
| **Product.brand** | `brand` | As-is: `"3.1 Phillip Lim"` |
| **Product.description** | `description` | As-is. Capitalize first letter if needed |
| **Product.gender** | `gender` | `"Female"` → `FEMALE`, `"Male"` → `MALE` |
| **Product.colors** | `color` | Collect unique values across all variants of same `item_group_id`. Normalize: `"Light gray"` → `"Grey"` |
| **Product.sizes** | `size` | Collect across variants: `["EU 35", "EU 35.5", "EU 36"]` |
| **Product.materials** | `material` | `["100% Lambskin"]` |
| **Product.imageUrl** | `Product_Image` | As-is |
| **Product.images** | `additional_image_link` | Split by `,`, filter empty |
| **Product.source** | — | `OUTNET` |
| **Product.externalId** | `item_group_id` | As-is: `"GB_1647597291614038P"` |
| **Product.groupId** | `item_group_id` | Same as externalId |
| **Product.searchTags** | derived | Extract from category path + material + brand: `["boots", "knee-high", "leather", "lambskin", "3.1 phillip lim"]` |
| **Product.ean** | — | Not available in Outnet feed |
| **Product.mpn** | `mpn` | As-is (Outnet internal numeric ID) |
| | | |
| **Variant.externalId** | `Product_ID` | `"GB_0400660031862"` |
| **Variant.sku** | `Product_ID` | Same |
| **Variant.color** | `color` | `"Black"` |
| **Variant.size** | `size` | `"EU 35"` |
| **Variant.material** | `material` | `"100% Lambskin"` |
| **Variant.price** | `sale_price` | Parse Decimal: `303.00` |
| **Variant.compareAtPrice** | `Product_Value` | Parse Decimal: `865.00` |
| **Variant.currency** | derived | `Product_ID` prefix → `"GB_"` → `"GBP"` |
| **Variant.discountPct** | `percentage_sale` | Strip `%`, parse: `"64.97%"` → `64.97` |
| **Variant.inStock** | `availability` | `> 0` → `true` |
| **Variant.deepLink** | `Product_URL` | As-is (Partnerize affiliate URL) |
| **Variant.imageUrl** | `Product_Image` | As-is |
| **Variant.images** | `additional_image_link` | Split by `,` |
| | | |
| **Category path** | `Product_Category` | `"Shoes > Boots > Knee-High"` → map to `"shoes/boots/knee-high-boots"` (see §3) |

### 2.2 Awin (CSV/gzip)

| Normalized Field | Raw Field | Transform |
|---|---|---|
| **Product.name** | `product_name` | Title-case if all-caps. As-is otherwise |
| **Product.slug** | derived | `slugify(name + '-' + brand_name)` |
| **Product.brand** | `brand_name` | As-is |
| **Product.description** | `description` | As-is. Strip HTML entities (`&amp;` → `&`) |
| **Product.shortDescription** | `product_short_description` | As-is |
| **Product.gender** | `Fashion:suitable_for` | `"female"` → `FEMALE`. If absent → `UNISEX` |
| **Product.colors** | `colour` | Collect unique across variants with same `parent_product_id`. Normalize English spelling |
| **Product.sizes** | `Fashion:size` | Collect across variants. May be absent for non-fashion |
| **Product.materials** | `Fashion:material` | `["Leather"]`. May be absent |
| **Product.imageUrl** | `merchant_image_url` \| `aw_image_url` | Prefer `merchant_image_url` |
| **Product.images** | `alternate_image`, `alternate_image_two`, `alternate_image_three`, `alternate_image_four`, `large_image` | Filter nulls/empty |
| **Product.source** | — | `AWIN` |
| **Product.externalId** | `aw_product_id` | As-is |
| **Product.groupId** | `parent_product_id` | Often empty → fall back to `aw_product_id` |
| **Product.ean** | `ean` \| `product_GTIN` | Normalize to 13 digits: strip leading zeros, validate length |
| **Product.mpn** | `mpn` \| `model_number` | As-is |
| **Product.condition** | `condition` | `"new"` → `NEW` |
| **Product.searchTags** | derived | From `keywords`, category path, brand, material |
| | | |
| **Variant.externalId** | `merchant_product_id` | As-is |
| **Variant.sku** | `merchant_product_id` | Same |
| **Variant.color** | `colour` | As-is |
| **Variant.size** | `Fashion:size` | As-is |
| **Variant.material** | `Fashion:material` | As-is |
| **Variant.price** | `search_price` | Parse Decimal |
| **Variant.compareAtPrice** | `rrp_price` \| `store_price` | Parse Decimal. Null if `0` or equal to `search_price` |
| **Variant.currency** | `currency` | As-is: `"EUR"`, `"GBP"` |
| **Variant.discountPct** | `savings_percent` | Parse: `"20.00"` → `20.00`. Null if `"0.00"` |
| **Variant.inStock** | `in_stock` | `"1"` or `"true"` → `true` |
| **Variant.stockQty** | `stock_quantity` | Parse Int. Null if empty |
| **Variant.deepLink** | `aw_deep_link` | As-is |
| **Variant.imageUrl** | `merchant_image_url` | As-is |
| | | |
| **Category path** | `merchant_product_category_path` \| `merchant_category` \| `category_name` | Priority order. Map via §3 rules |

### 2.3 Rakuten (pipe-delimited TXT)

| Normalized Field | Raw Field (col#) | Transform |
|---|---|---|
| **Product.name** | col2 | As-is. May be in French — store original, consider translation |
| **Product.slug** | derived | `slugify(col2 + '-' + col17)` |
| **Product.brand** | col17 | As-is: `"COACH"` |
| **Product.description** | col10 \| col9 | Prefer long desc (col10), fall back to short (col9) |
| **Product.gender** | col34 | `"Female"` → `FEMALE`. Empty → `UNISEX` |
| **Product.colors** | col33 | Collect unique across variants sharing col29. May be in French (`"Noir"` → `"Black"`) |
| **Product.sizes** | col31 | Collect: `["one size"]`, `["X-Petit", "Petit", "Moyen"]` |
| **Product.materials** | col32 | `["Cuir"]` (French for "Leather") |
| **Product.imageUrl** | col7 | As-is |
| **Product.images** | col27 | Split by `,`, filter empty. Also include col8 if non-empty |
| **Product.source** | — | `RAKUTEN` |
| **Product.externalId** | col29 | Short merchant SKU (group-level) |
| **Product.groupId** | col29 | Same |
| **Product.ean** | col24 | GTIN-14 → strip leading zeros → 13-digit EAN. Validate |
| **Product.mpn** | col3 | Full SKU: `"28190 BLK"` |
| | | |
| **Variant.externalId** | col1 | Long Rakuten product ID |
| **Variant.sku** | col3 | `"28190 BLK"` |
| **Variant.color** | col33 | `"Noir"` |
| **Variant.size** | col31 | `"one size"` |
| **Variant.material** | col32 | `"Métal"`, `"Cuir"` |
| **Variant.price** | col14 | Parse Decimal |
| **Variant.compareAtPrice** | — | Not available in Rakuten feeds |
| **Variant.currency** | col26 | `"EUR"` |
| **Variant.inStock** | col23 | `"in-stock"` → `true` |
| **Variant.deepLink** | col6 | Affiliate URL |
| **Variant.imageUrl** | col7 | As-is |
| | | |
| **Category path** | col30 \| col5 \| col4 | Priority: col30 (merchant path), col5 (split on `~~`), col4 (top-level) |

---

## 3. Category Path Mapping Rules

### Step 1: Extract raw category path

```typescript
function extractRawCategoryPath(raw: RawPayload, source: FeedSource): string | null {
  switch (source) {
    case 'OUTNET':
      return raw.Product_Category;  // "Shoes > Boots > Knee-High"
    case 'AWIN':
      return raw.merchant_product_category_path
          || raw.merchant_category
          || raw.category_name
          || null;
    case 'RAKUTEN':
      return raw.col30
          || raw.col5?.replace('~~', ' > ')
          || raw.col4
          || null;
  }
}
```

### Step 2: Normalize to YouWanto path

```typescript
// Map of known raw paths → YouWanto taxonomy paths
const CATEGORY_MAP: Record<string, string> = {
  // Outnet direct maps
  'Shoes > Boots > Knee-High':           'shoes/boots/knee-high-boots',
  'Shoes > Boots > Ankle':               'shoes/boots/ankle-boots',
  'Shoes > Boots > Chelsea':             'shoes/boots/chelsea-boots',
  'Shoes > Boots > Cowboy':              'shoes/boots/cowboy-boots',
  'Shoes > Boots > Over The Knee':       'shoes/boots/over-the-knee-boots',
  'Shoes > Boots > Rain':                'shoes/boots/rain-boots',
  'Shoes > Boots > Lace-up':             'shoes/boots/combat-boots',
  'Shoes > Sneakers > Fashion':          'shoes/sneakers-trainers/fashion-sneakers',
  'Shoes > Sneakers > Sport':            'shoes/sneakers-trainers/sport-sneakers',
  'Shoes > Flat Shoes > Ballet Flats':   'shoes/flat-shoes/ballet-flats',
  'Shoes > Flat Shoes > Loafers':        'shoes/flat-shoes/loafers',
  'Shoes > Flat Shoes > Lace Ups':       'shoes/flat-shoes/lace-ups',
  'Shoes > Heels > High Heel':           'shoes/heels-pumps/high-heels',
  'Shoes > Heels > Mid Heel':            'shoes/heels-pumps/mid-heels',
  'Shoes > Pumps > Wedges':              'shoes/heels-pumps/wedges',
  'Shoes > Sandals > Flat':              'shoes/sandals/flat-sandals',
  'Shoes > Sandals > Slides':            'shoes/sandals/slides',
  'Shoes > Sandals > Platforms':         'shoes/sandals/platform-sandals',

  // Clothing → Women
  'Clothing > Jackets > Blazers':            'women/outerwear/blazers',
  'Clothing > Jackets > Leather Jackets':    'women/outerwear/leather-jackets',
  'Clothing > Jackets > Bomber Jackets':     'women/outerwear/jackets',
  'Clothing > Jackets > Casual Jackets':     'women/outerwear/jackets',
  'Clothing > Jackets > Puffer Jackets':     'women/outerwear/puffer-down-jackets',
  'Clothing > Jackets > Down Jackets':       'women/outerwear/puffer-down-jackets',
  'Clothing > Jackets > Vests and Gilets':   'women/outerwear/gilets-vests',
  'Clothing > Jackets > Vests And Gilets':   'women/outerwear/gilets-vests',
  'Clothing > Jackets > Capes':             'women/outerwear/capes-ponchos',
  'Clothing > Coats > Trench Coats':        'women/outerwear/trench-coats',
  'Clothing > Coats > Long Coats':          'women/outerwear/coats',
  'Clothing > Coats > Short Coats':         'women/outerwear/coats',
  'Clothing > Coats > Parkas':             'women/outerwear/coats',
  'Clothing > Coats > Overcoats':          'women/outerwear/coats',
  'Clothing > Coats > Leather Coats':      'women/outerwear/leather-jackets',
  'Clothing > Coats > Raincoats & Trench': 'women/outerwear/trench-coats',

  'Clothing > Dresses > Mini Dresses':           'women/dresses/mini-dresses',
  'Clothing > Dresses > Midi Dresses':           'women/dresses/midi-dresses',
  'Clothing > Dresses > Maxi Dresses':           'women/dresses/maxi-dresses',
  'Clothing > Dresses > Cocktail And Party Dresses': 'women/dresses/cocktail-party-dresses',
  'Clothing > Dresses > Gowns':                  'women/dresses/evening-gowns',
  'Clothing > Dresses > Wrap Dresses':           'women/dresses/wrap-dresses',
  'Clothing > Dresses > Knit Dresses':           'women/dresses/knit-dresses',
  'Clothing > Dresses > Slip Dresses':           'women/dresses/slip-dresses',
  'Clothing > Dresses > Work Dresses':           'women/dresses/midi-dresses',
  'Clothing > Dresses > Knee-Length Dresses':    'women/dresses/midi-dresses',
  'Clothing > Dresses > Printed Dresses':        'women/dresses/midi-dresses',
  'Clothing > Dresses > Summer Dresses':         'women/dresses/midi-dresses',

  'Clothing > Tops > Shirts':               'women/tops/shirts',
  'Clothing > Tops > Blouses':              'women/tops/blouses',
  'Clothing > Tops > T-shirts':             'women/tops/t-shirts',
  'Clothing > Tops > T-Shirts':             'women/tops/t-shirts',
  'Clothing > Tops > Sweatshirts':          'women/tops/sweatshirts-hoodies',
  'Clothing > Tops > Tanks and Camis':      'women/tops/tanks-camis',
  'Clothing > Tops > Bodysuits':            'women/tops/bodysuits',
  'Clothing > Tops > Silk Tops':            'women/tops/blouses',
  'Clothing > Tops > Short-Sleeved Tops':   'women/tops/t-shirts',
  'Clothing > Tops > Long-Sleeved Tops':    'women/tops/shirts',

  'Clothing > Knitwear > Cardigans':        'women/knitwear/cardigans',
  'Clothing > Knitwear > Sweaters':         'women/knitwear/sweaters',
  'Clothing > Knitwear > Turtlenecks':      'women/knitwear/turtlenecks',
  'Clothing > Knitwear > Cashmere':         'women/knitwear/cashmere',
  'Clothing > Knitwear > V Necks':          'women/knitwear/v-necks',
  'Clothing > Knitwear > V-Neck Sweaters':  'women/knitwear/v-necks',
  'Clothing > Knitwear > Crew Necks':       'women/knitwear/sweaters',

  'Clothing > Trousers > Wide-Leg Trousers':    'women/trousers-shorts/wide-leg-trousers',
  'Clothing > Trousers > Straight-Leg Trousers': 'women/trousers-shorts/straight-leg-trousers',
  'Clothing > Trousers > Skinny-Leg Trousers':  'women/trousers-shorts/skinny-trousers',
  'Clothing > Trousers > Tailored Trousers':    'women/trousers-shorts/tailored-trousers',
  'Clothing > Trousers > Leggings':             'women/trousers-shorts/leggings',
  'Clothing > Trousers > Culottes':             'women/trousers-shorts/culottes',
  'Clothing > Shorts > Casual':                  'women/trousers-shorts/shorts',
  'Clothing > Shorts > Denim Shorts':            'women/jeans-denim/denim-skirts',

  'Clothing > Skirts > Mini Skirts':         'women/skirts/mini-skirts',
  'Clothing > Skirts > Midi Skirts':         'women/skirts/midi-skirts',
  'Clothing > Skirts > Maxi Skirts':         'women/skirts/maxi-skirts',
  'Clothing > Skirts > Pleated Skirts':      'women/skirts/pleated-skirts',
  'Clothing > Skirts > Pencil Skirts':       'women/skirts/pencil-skirts',

  'Clothing > Jeans > Skinny Jeans':       'women/jeans-denim/skinny-jeans',
  'Clothing > Jeans > Straight Jeans':     'women/jeans-denim/straight-jeans',
  'Clothing > Jeans > Slim Jeans':         'women/jeans-denim/slim-jeans',
  'Clothing > Denim > Jeans':              'women/jeans-denim/straight-jeans',
  'Clothing > Denim > Denim Jackets':      'women/jeans-denim/denim-jackets',

  'Clothing > Jumpsuits > Full-Length Jumpsuits':  'women/jumpsuits-playsuits/full-length-jumpsuits',
  'Clothing > Jumpsuits > Playsuits':              'women/jumpsuits-playsuits/playsuits',

  // Bags
  'Bags > Shoulder Bags > All Shoulder Bags':  'bags/shoulder-bags',
  'Bags > Shoulder Bags > Bucket Bags':        'bags/shoulder-bags/bucket-bags',
  'Bags > Shoulder Bags > Cross-body Bags':    'bags/crossbody-bags',
  'Bags > Cross-body Bags':                     'bags/crossbody-bags',
  'Bags > Tote Bags':                           'bags/tote-bags',
  'Bags > Top Handle Bags > Tote Bags':         'bags/tote-bags',
  'Bags > Mini Bags > Shoulder Bags':           'bags/mini-bags',
  'Bags > Mini Bags > Top Handle Bags':         'bags/mini-bags',
  'Bags > Evening Bags':                        'bags/clutch-evening-bags/evening-bags',
  'Bags > Clutch Bags > Pouches':               'bags/clutch-evening-bags/clutches',
  'Bags > Backpacks':                           'bags/backpacks',
  'Bags > Belt Bags':                           'bags/belt-bags',

  // Accessories
  'Accessories > Jewelry > Earrings':      'accessories/jewelry/earrings',
  'Accessories > Jewelry > Necklaces':     'accessories/jewelry/necklaces',
  'Accessories > Jewelry > Bracelets':     'accessories/jewelry/bracelets',
  'Accessories > Jewelry > Rings':         'accessories/jewelry/rings',
  'Accessories > Jewelry > Brooches':      'accessories/jewelry/brooches',
  'Accessories > Sunglasses > Round':      'accessories/sunglasses',
  'Accessories > Sunglasses > Cat-Eye':    'accessories/sunglasses',
  'Accessories > Sunglasses > Square':     'accessories/sunglasses',
  'Accessories > Sunglasses > Aviator':    'accessories/sunglasses',
  'Accessories > Wallets':                  'accessories/wallets-card-cases/wallets',
  'Accessories > Gloves':                   'accessories/hats-gloves/gloves',

  // Rakuten paths
  'Women > Bags > Women\'s Shoulder Bags':   'bags/shoulder-bags',
  'Women > Bags > Women\'s Cross Body Bags': 'bags/crossbody-bags',
  'Women > Bags > Women\'s Tote Bags':       'bags/tote-bags',
  'Women > Bags > Women\'s Mini Bags':       'bags/mini-bags',
  'Women > Accessories & Jewelry > Belts':   'accessories/belts',
  'Women > Accessories & Jewelry > Sunglasses': 'accessories/sunglasses',
  'Women > Shoes > Boots':                   'shoes/boots/ankle-boots',
  'Women > Shoes > Heels':                   'shoes/heels-pumps/high-heels',
  'Women > Shoes > Flats':                   'shoes/flat-shoes/ballet-flats',
  'Women > Shoes > Loafers':                 'shoes/flat-shoes/loafers',
  'Women > Shoes > Sandals':                 'shoes/sandals/flat-sandals',
  'Women > Shoes > Trainers':                'shoes/sneakers-trainers/fashion-sneakers',
  'Women > Small Leather Goods > Wallets':   'accessories/wallets-card-cases/wallets',
  'Women > Small Leather Goods > Card Cases': 'accessories/wallets-card-cases/card-holders',
  'Women > Ready-To-Wear > Coats & Jackets': 'women/outerwear/jackets',
  'Women > Ready-To-Wear > Dresses':         'women/dresses/midi-dresses',
  'Women > Ready-To-Wear > Tops & T-Shirts': 'women/tops/t-shirts',
  'Womens > Clothing > Coats & Jackets':     'women/outerwear/jackets',
  'Womens > Shoes > Sneakers':               'shoes/sneakers-trainers/fashion-sneakers',
  'Womens > Shoes > Trainers':               'shoes/sneakers-trainers/fashion-sneakers',

  // Awin / generic
  'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets': 'women/outerwear/jackets',
  'Apparel & Accessories > Clothing > Outerwear > Vests':           'women/outerwear/gilets-vests',
};
```

### Step 3: Fallback — keyword-based classification

If the raw path is not in the map (or empty), classify by `product_name` keywords:

```typescript
const KEYWORD_FALLBACKS: [RegExp, string][] = [
  [/\b(jacket|blazer|bomber)\b/i,      'women/outerwear/jackets'],
  [/\b(coat|trench|parka)\b/i,         'women/outerwear/coats'],
  [/\b(gilet|vest|waistcoat)\b/i,      'women/outerwear/gilets-vests'],
  [/\b(boot|boots)\b/i,                'shoes/boots/ankle-boots'],
  [/\b(sneaker|trainer)\b/i,           'shoes/sneakers-trainers/fashion-sneakers'],
  [/\b(sandal|slide|mule)\b/i,         'shoes/sandals/flat-sandals'],
  [/\b(heel|pump)\b/i,                 'shoes/heels-pumps/high-heels'],
  [/\b(dress)\b/i,                     'women/dresses/midi-dresses'],
  [/\b(skirt)\b/i,                     'women/skirts/midi-skirts'],
  [/\b(cardigan)\b/i,                  'women/knitwear/cardigans'],
  [/\b(sweater|pullover|jumper)\b/i,   'women/knitwear/sweaters'],
  [/\b(tote|handbag|shoulder bag)\b/i, 'bags/tote-bags'],
  [/\b(crossbody|cross-body)\b/i,      'bags/crossbody-bags'],
  [/\b(clutch)\b/i,                    'bags/clutch-evening-bags/clutches'],
  [/\b(earring)\b/i,                   'accessories/jewelry/earrings'],
  [/\b(necklace)\b/i,                  'accessories/jewelry/necklaces'],
  [/\b(bracelet)\b/i,                  'accessories/jewelry/bracelets'],
  [/\b(belt)\b/i,                      'accessories/belts'],
  [/\b(scarf|scarve)\b/i,              'accessories/scarves-wraps'],
  [/\b(sunglasses)\b/i,                'accessories/sunglasses'],
  [/\b(wallet|card case|card holder)\b/i, 'accessories/wallets-card-cases/wallets'],
];
```

---

## 4. Before/After Mapping Examples

### Example 1: Outnet — Leather Boots

**Raw (`RawProduct.rawPayload`):**
```json
{
  "Product_ID": "GB_0400660031862",
  "item_group_id": "GB_1647597291614038P",
  "Product_Name": "3.1 Phillip Lim - Nadia leather boots - Black - EU 35",
  "description": "Boots leather stacked Heel almond Toe concealed Zip Fastening Along Back leather/rubber Sole made In Italy",
  "brand": "3.1 Phillip Lim",
  "Product_Category": "Shoes > Boots > Knee-High",
  "color": "Black",
  "size": "EU 35",
  "material": "100% Lambskin",
  "gender": "Female",
  "Product_Value": "865.00",
  "sale_price": "303.00",
  "percentage_sale": "64.97%",
  "availability": "1",
  "Product_Image": "https://www.theoutnet.com/variants/images/1647597291671942/F/w960.jpg",
  "additional_image_link": "https://...R/w960.jpg,https://...E/w960.jpg,https://...D/w960.jpg",
  "Product_URL": "https://prf.hn/click/camref:1011lv58i/...",
  "badges": "SALE,ONLY ONE LEFT"
}
```

**After — Product:**
```json
{
  "name": "Nadia Leather Boots",
  "slug": "nadia-leather-boots-3-1-phillip-lim",
  "brand": "3.1 Phillip Lim",
  "description": "Boots leather stacked Heel almond Toe concealed Zip Fastening Along Back leather/rubber Sole made In Italy",
  "gender": "FEMALE",
  "condition": "NEW",
  "colors": ["Black"],
  "sizes": ["EU 35", "EU 35.5", "EU 36", "EU 36.5", "EU 37", "EU 37.5"],
  "materials": ["100% Lambskin"],
  "source": "OUTNET",
  "externalId": "GB_1647597291614038P",
  "groupId": "GB_1647597291614038P",
  "searchTags": ["boots", "knee-high", "leather", "lambskin", "3.1 phillip lim", "italian"],
  "imageUrl": "https://www.theoutnet.com/variants/images/1647597291671942/F/w960.jpg"
}
```

**After — ProductVariant (one of six):**
```json
{
  "externalId": "GB_0400660031862",
  "sku": "GB_0400660031862",
  "color": "Black",
  "size": "EU 35",
  "material": "100% Lambskin",
  "price": 303.00,
  "compareAtPrice": 865.00,
  "currency": "GBP",
  "discountPct": 64.97,
  "inStock": true,
  "deepLink": "https://prf.hn/click/camref:1011lv58i/..."
}
```

**After — Category:** `shoes/boots/knee-high-boots`

---

### Example 2: Outnet — Blazer

**Raw:**
```json
{
  "Product_Name": "GANNI - Linen-canvas blazer - Neutral - EU 36",
  "brand": "GANNI",
  "Product_Category": "Clothing > Jackets > Blazers",
  "color": "Beige",
  "size": "EU 36",
  "material": "100% Linen",
  "sale_price": "210.00",
  "Product_Value": "350.00",
  "gender": "Female"
}
```

**After — Product:**
```json
{
  "name": "Linen-Canvas Blazer",
  "slug": "linen-canvas-blazer-ganni",
  "brand": "GANNI",
  "gender": "FEMALE",
  "colors": ["Beige"],
  "materials": ["100% Linen"],
  "searchTags": ["blazer", "linen", "ganni", "outerwear"]
}
```

**Category:** `women/outerwear/blazers`

---

### Example 3: Outnet — Knitwear Cardigan

**Raw:**
```json
{
  "Product_Name": "3.1 Phillip Lim - Brushed ribbed-knit cardigan - Gray - S",
  "brand": "3.1 Phillip Lim",
  "Product_Category": "Clothing > Knitwear > Cardigans",
  "color": "Light gray",
  "material": "38% Nylon 36% Wool 25% Alpaca wool 1% Elastane"
}
```

**After — Product:**
```json
{
  "name": "Brushed Ribbed-Knit Cardigan",
  "slug": "brushed-ribbed-knit-cardigan-3-1-phillip-lim",
  "colors": ["Grey"],
  "materials": ["38% Nylon 36% Wool 25% Alpaca wool 1% Elastane"]
}
```

**Note:** `"Light gray"` → normalized to `"Grey"` (British English for YouWanto.com UK audience). Category: `women/knitwear/cardigans`.

---

### Example 4: Rakuten — Shoulder Bag

**Raw (pipe-delimited, extracted to JSON):**
```json
{
  "col1": "42587...",
  "col2": "Sac épaule Juliet 25",
  "col3": "CQ085 B4/TN",
  "col7": "https://coach.scene7.com/is/image/Coach/cq085_b4tn_a0?$desktopProduct$",
  "col14": "395.00",
  "col17": "COACH",
  "col26": "EUR",
  "col29": "CQ085",
  "col30": "Women > Bags > Women's Shoulder Bags",
  "col31": "one size",
  "col32": "Cuir",
  "col33": "Laiton/Érable"
}
```

**After — Product:**
```json
{
  "name": "Sac Épaule Juliet 25",
  "slug": "sac-epaule-juliet-25-coach",
  "brand": "COACH",
  "colors": ["Maple", "Black", "Ash"],
  "materials": ["Leather"],
  "source": "RAKUTEN",
  "externalId": "CQ085",
  "searchTags": ["shoulder bag", "coach", "leather", "juliet"]
}
```

**Category:** `bags/shoulder-bags`

**Note:** French color `"Laiton/Érable"` → normalized to `"Maple"`. Material `"Cuir"` → `"Leather"`.

---

### Example 5: Awin — Fashion Feed (LOOKFANTASTIC fragrance)

**Raw:**
```json
{
  "aw_product_id": "23135366715",
  "product_name": "Armani Code Femme Eau de Parfum - 30ml",
  "brand_name": "Armani",
  "merchant_product_category_path": "Health and Beauty > Fragrance > NULL",
  "search_price": "79.35",
  "rrp_price": "79.35",
  "currency": "EUR",
  "colour": "",
  "Fashion:suitable_for": "female",
  "Fashion:size": "",
  "in_stock": "1",
  "ean": "3360375004049"
}
```

**Decision: SKIP.** This product is a fragrance, not fashion. YouWanto.com is fashion-only.

**Rule:** If `merchant_product_category_path` contains `"Fragrance"`, `"Beauty"`, `"Health"`, `"Parfum"`, `"Tools"`, or `"Home"` at L1 → skip during ingestion. Only ingest products whose raw category maps to a valid YouWanto taxonomy path.

---

## 5. Edge Cases & Rules

### Multi-category products

**Rule:** A product belongs to exactly one leaf category. If the raw path could map to two (e.g. "Leather Coat" → Outerwear or Leather?), use the taxonomy principle: pick the **function** (Outerwear > Coats), not the **material** (Leather).

### Missing raw category path

About 30% of Rakuten `col30` values are empty. Fallback chain:
1. Try `col5` (Rakuten sub-category), split on `~~`
2. Try `col4` (Rakuten top-level)
3. Try keyword matching on `col2` (product name)
4. If still unmapped → assign to a "needs-review" queue; do not publish

### Gender ambiguity

- Outnet: explicit `gender` field → reliable
- Rakuten: `col34` — often empty. If path starts with `Women >` → `FEMALE`. If starts with `Men >` → `MALE`. Otherwise → `UNISEX`.
- Awin: `Fashion:suitable_for` — present only on Fashion-vertical feeds. Missing → infer from `merchant_product_category_path` or default `UNISEX`.

### Duplicate products across sources

- Same product might appear in Outnet AND Awin (Outnet is also in Awin's network).
- Deduplicate by `ean` first (if both have it). If no EAN → `mpn + brand` or `name + brand` fuzzy match.
- When merging: prefer Outnet data for fashion detail (material, size, color are richer). Keep both `RawProduct` rows for audit.

### Color normalization

French → English map for Rakuten feeds:
```typescript
const COLOR_MAP: Record<string, string> = {
  'Noir': 'Black', 'Blanc': 'White', 'Bleu': 'Blue',
  'Rouge': 'Red', 'Vert': 'Green', 'Gris': 'Grey',
  'Beige': 'Beige', 'Rose': 'Pink', 'Violet': 'Purple',
  'Marron': 'Brown', 'Orange': 'Orange', 'Jaune': 'Yellow',
  'Crème': 'Cream', 'Ivoire': 'Ivory', 'Doré': 'Gold',
  'Argenté': 'Silver', 'Craie': 'Chalk', 'Érable': 'Maple',
  'Vanille': 'Vanilla', 'Caramel': 'Caramel',
};
```

### Size normalization

Store as-is from feed. Normalization happens in the search layer:
- `"EU 35"`, `"IT 36"`, `"FR 34"` — keep all, display system converts
- `"one size"`, `"OneSize"`, `"OS"` → normalize to `"One Size"`
- `"S"`, `"M"`, `"L"`, `"XL"` — keep as-is

### Price: zero or null

- If `search_price` / `sale_price` = `0` or empty → **do not publish**. Log as data quality issue.
- If `rrp_price` = `0` or equals `search_price` → set `compareAtPrice` to `null` (no discount display).
