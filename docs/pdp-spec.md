# Product Detail Page (PDP) Spec — YouWanto.com

> 把这整份文档直接发给 Copilot / Claude，它会根据这份 spec 生成所有代码文件。

---

## Copilot / Claude 指令

```
You are building a Next.js 14 App Router e-commerce site called YouWanto.com.
Stack: Next.js 14, TypeScript, Prisma, PostgreSQL, Tailwind CSS.

Using the spec below, generate the following files:
1. app/products/[slug]/page.tsx          — PDP page (Server Component)
2. lib/actions/product.ts                — data fetching functions
3. components/pdp/ImageGallery.tsx       — image gallery (Client Component)
4. components/pdp/VariantSelector.tsx    — colour + size selector (Client Component)
5. components/pdp/PriceBlock.tsx         — price display (Client Component, receives selected variant)
6. components/pdp/BuyButton.tsx          — CTA button (Client Component)
7. components/pdp/RelatedProducts.tsx    — related products grid (Server Component)
8. components/shared/Breadcrumb.tsx      — reusable breadcrumb (shared with collection page)

Rules:
- Server Components fetch data directly via Prisma
- Client Components only for interactive parts (variant selector, gallery, buy button)
- Use Tailwind CSS for all styling — no inline styles
- Mobile-first: BuyButton is a sticky bottom bar on mobile
- All images use next/image with width, height, alt, priority on hero image
- Affiliate links (deepLink) always open in _blank with rel="noopener noreferrer"
- Handle missing images gracefully (grey placeholder background)
```

---

## 1. Route 路由

File: `app/products/[slug]/page.tsx`

- `slug` 匹配 `Product.slug`（数据库中 unique 字段）
- 如果商品不存在 → 调用 `notFound()`

示例 URL：
```
/products/nadia-leather-boots-abc123
/products/ganni-linen-canvas-blazer-xyz456
```

---

## 2. 数据层

### 2.1 文件位置

`lib/actions/product.ts` — server-side（`"use server"`）

### 2.2 主查询函数

```typescript
export async function getProductBySlug(slug: string): Promise<ProductDetail | null>
```

Prisma 查询：

```typescript
prisma.product.findUnique({
  where: { slug },
  include: {
    variants: {
      orderBy: { price: 'asc' },
    },
    categories: {
      include: { category: true },
    },
  },
})
```

### 2.3 相关商品函数

```typescript
export async function getRelatedProducts(
  productId: string,
  categoryPath: string,
  limit = 8
): Promise<ProductWithVariant[]>
```

逻辑：
- 找同一 L3 分类下的其他商品
- 若 L3 结果不足 4 个，改用 L2
- 排除当前商品（`id != productId`）
- 按 `createdAt DESC` 排序
- 每个商品 include 最便宜的在售 variant

### 2.4 返回类型

```typescript
type ProductDetail = Product & {
  variants:   ProductVariant[]
  categories: { category: Category }[]
  breadcrumb: Category[]   // 由 category path 推导出祖先列表
}
```

---

## 3. 页面组件结构

```
app/products/[slug]/page.tsx
├── Breadcrumb                    — Women > Outerwear > Jackets > 商品名
├── PDPLayout                     — 桌面双栏 / 移动单栏
│   ├── ImageGallery              — 左栏
│   │   ├── MainImage             — 大图（3:4 比例）
│   │   └── ThumbnailStrip        — 缩略图列表，点击切换主图
│   └── ProductInfo               — 右栏
│       ├── Brand                 — 品牌名（大写，灰色，小字）
│       ├── ProductName           — h1
│       ├── PriceBlock            — 当前价 + 划线原价 + 折扣 badge
│       ├── VariantSelector
│       │   ├── ColorSelector     — 颜色圆点（所有 variant 颜色）
│       │   └── SizeSelector      — 尺码按钮（缺货灰色+划线）
│       ├── StockStatus           — In stock / Low stock / Out of stock
│       ├── BuyButton             — "Go to Store →" 或 "Add to Cart"
│       ├── Description           — 默认折叠3行，有"Read more"展开
│       └── ProductMeta           — 材质 / 品牌 / 新旧 / EAN（pill 标签）
└── RelatedProducts               — "You may also like" 横向滚动
```

---

## 4. 组件详情

### 4.1 ImageGallery（Client Component）

- 图片来源：`product.images[]` + 当前选中 variant 的 `imageUrl`
- 主图：`next/image`，`priority`，宽高比 `3:4`
- 缩略图：桌面端垂直排列在左侧；移动端水平滚动在主图下方
- 点击缩略图 → 切换主图（不刷新页面）
- 只有一张图时隐藏缩略图区域
- 图片加载失败 → 显示灰色占位背景

### 4.2 PriceBlock（Client Component）

显示效果：
```
£ 285.00   ~~£ 570.00~~   -50%
```

逻辑：
- 当前价格：来自选中 variant 的 `variant.price`
- 划线原价：`variant.compareAtPrice`（仅在 `compareAtPrice > price` 时显示）
- 折扣 badge：`Math.round((1 - price / compareAtPrice) * 100)%`
- 货币：`variant.currency`（默认 GBP）
- 未选中 variant 时：显示"from £X"（最低价）

### 4.3 VariantSelector（Client Component）

- 先按颜色分组，再按尺码分组
- **颜色圆点**：选中状态加边框；该颜色无可用尺码时加斜线
- **尺码按钮**：网格布局；`inStock: false` 的尺码灰色 + 划线
- 选择颜色 → 筛选尺码按钮只显示该颜色的 variants
- 选择尺码 → 更新 `PriceBlock` 和 `BuyButton`
- 状态存在 VariantSelector 内，通过 callback 传递选中的 variant

### 4.4 BuyButton（Client Component）

- 若 `variant.deepLink` 存在 → 显示"Go to Store →"，`target="_blank" rel="noopener noreferrer"`
- 否则 → 显示"Add to Cart"，触发 `addToCart` server action
- 若商品有尺码，未选择尺码时禁用按钮
- 操作进行中显示 loading spinner
- **移动端**：固定在页面底部（`sticky bottom-0`），全宽

### 4.5 Description

- 默认折叠为 3 行，下方显示"Read more"按钮
- 展开后显示完整 `product.description`
- 描述下方用 pill 标签显示关键属性：材质 / 品牌 / 新旧状态

### 4.6 RelatedProducts（Server Component）

- 移动端：横向滚动
- 桌面端：4 列网格
- 每张卡片样式与 collection 页的 `ProductCard` 一致
- 标题：若同品牌 → "More from [Brand]"；否则 → "You may also like"

---

## 5. Variant 选择逻辑（完整状态流）

```
初始状态：
  颜色未选 / 尺码未选
  → PriceBlock 显示 "from £X"（最低 variant 价格）
  → BuyButton 禁用

选择颜色后：
  → 筛选尺码按钮，只显示该颜色的 variants
  → PriceBlock 更新为该颜色最便宜在售尺码的价格
  → BuyButton 仍禁用（需要选尺码）

选择尺码后：
  → 锁定具体 variant
  → PriceBlock 显示精确价格
  → BuyButton 启用
  → 若 variant.imageUrl 存在 → 主图更新为 variant 图片
```

---

## 6. SEO Metadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug)
  if (!product) return {}
  return {
    title: `${product.name} | ${product.brand} | YouWanto`,
    description: product.shortDescription ?? product.description?.slice(0, 155),
    openGraph: {
      title: `${product.name} | ${product.brand}`,
      images: [{ url: product.imageUrl ?? product.images[0] }],
      url: `https://youwanto.com/products/${product.slug}`,
    },
  }
}
```

---

## 7. 静态生成 (ISR)

```typescript
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
  })
  return products.map(p => ({ slug: p.slug }))
}

export const revalidate = 3600  // 每小时重新生成
```

---

## 8. 移动端布局要点

- 单栏，图片在上
- ImageGallery：主图下方水平滚动缩略图
- ProductInfo 在图片下方
- SizeSelector：全宽按钮
- BuyButton：`sticky bottom-0`，全宽，覆盖在内容上方
- RelatedProducts：横向滚动
