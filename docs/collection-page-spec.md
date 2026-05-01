# Collection Page Spec — YouWanto.com

> 把这整份文档直接发给 Copilot / Claude，它会根据这份 spec 生成所有代码文件。

---

## Copilot / Claude 指令

```
You are building a Next.js 14 App Router e-commerce site called YouWanto.com.
Stack: Next.js 14, TypeScript, Prisma, PostgreSQL, Tailwind CSS.

Using the spec below, generate the following files:
1. app/[...slug]/page.tsx              — collection page (Server Component)
2. lib/actions/collection.ts           — all data fetching functions
3. components/collection/FacetSidebar.tsx   — filter sidebar (Client Component)
4. components/collection/ProductGrid.tsx    — product grid (Server Component)
5. components/collection/ProductCard.tsx    — single product card
6. components/collection/SortBar.tsx        — sort + result count (Client Component)
7. components/collection/ActiveFilters.tsx  — active filter pills (Client Component)
8. components/collection/Pagination.tsx     — page navigation

Rules:
- Server Components fetch data directly via Prisma (no API routes needed)
- Client Components only for interactive parts (facets, sort, active filters)
- Use collectionQuerySchema from lib/validator.ts to parse URL params
- Use Tailwind CSS for all styling — no inline styles
- Mobile-first responsive design
- All images use next/image with width, height, alt
- Loading states use Suspense + skeleton components
```

---

## 1. Route 路由

File: `app/[...slug]/page.tsx`

- `slug` 是 string 数组，用 `/` 拼接得到 category path
- 支持 L1、L2、L3 三种深度：`/women`、`/women/outerwear`、`/women/outerwear/jackets`
- 如果 path 对应的 category 不存在 → 调用 `notFound()`

---

## 2. URL Query Parameters

| 参数 | 类型 | 示例 | 说明 |
|---|---|---|---|
| `colors` | `string[]` | `?colors=Black&colors=White` | 多选 |
| `sizes` | `string[]` | `?sizes=EU+36&sizes=S` | 多选 |
| `materials` | `string[]` | `?materials=Leather` | 多选 |
| `brands` | `string[]` | `?brands=Ganni&brands=Sandro` | 多选 |
| `minPrice` | `number` | `?minPrice=50` | GBP |
| `maxPrice` | `number` | `?maxPrice=500` | GBP |
| `inStock` | `boolean` | `?inStock=true` | 默认 false |
| `sort` | `string` | `?sort=price_asc` | `price_asc` / `price_desc` / `newest` |
| `page` | `number` | `?page=2` | 默认 1 |

用 `lib/validator.ts` 里的 `collectionQuerySchema` 解析和验证所有参数。

---

## 3. 数据层

### 3.1 文件位置

`lib/actions/collection.ts` — 所有函数都是 server-side（`"use server"`）

### 3.2 主查询函数

```typescript
export async function getCollectionData(params: CollectionQuery): Promise<CollectionResult>
```

执行步骤：
1. 通过 `category.path` 精确查找 `Category`
2. 如果是 L1 或 L2，用 `path LIKE 'women/outerwear%'` 查所有子分类
3. 通过 `ProductCategory` → `Category` join 查询 `Product`
4. 应用筛选条件：
   - `colors`: `{ colors: { hasSome: params.colors } }`
   - `sizes`: `{ sizes: { hasSome: params.sizes } }`
   - `materials`: `{ materials: { hasSome: params.materials } }`
   - `brands`: `{ brand: { in: params.brands } }`
   - `inStock`: join variants 中 `inStock: true`
5. 价格筛选通过 variant join：`variants.some({ price: { gte, lte }, inStock: true })`
6. 排序：`price_asc` / `price_desc` → variant price；`newest` → `createdAt DESC`
7. 分页：`skip: (page - 1) * limit`，`take: limit`

### 3.3 Facet 计数函数

```typescript
export async function getCollectionFacets(path: string): Promise<FacetCounts>
```

返回当前 path 下可用的筛选值 + 数量：

```typescript
type FacetCounts = {
  colors:    { value: string; count: number }[]
  sizes:     { value: string; count: number }[]
  materials: { value: string; count: number }[]
  brands:    { value: string; count: number }[]
  priceRange:{ min: number; max: number }
}
```

用 raw SQL + `unnest()` + `GROUP BY` 处理数组字段：

```sql
SELECT unnest(colors) as value, COUNT(*) as count
FROM products p
JOIN product_categories pc ON pc.product_id = p.id
JOIN categories c ON c.id = pc.category_id
WHERE c.path LIKE $1
GROUP BY 1
ORDER BY count DESC
```

### 3.4 面包屑函数

```typescript
export async function getBreadcrumb(path: string): Promise<Category[]>
```

将 path 按 `/` 分割，生成所有祖先路径，一次查询返回：

```sql
SELECT * FROM categories
WHERE path IN ('women', 'women/outerwear', 'women/outerwear/jackets')
ORDER BY level
```

### 3.5 返回类型

```typescript
type CollectionResult = {
  category:   Category
  products:   ProductWithVariant[]
  facets:     FacetCounts
  breadcrumb: Category[]
  total:      number
  page:       number
  totalPages: number
}

type ProductWithVariant = Product & {
  categories: { category: Category }[]
  variants:   ProductVariant[]   // 只返回最便宜的在售 variant
}
```

---

## 4. 页面组件结构

```
app/[...slug]/page.tsx
├── CollectionHeader        — 分类名 + 商品数量
├── Breadcrumb              — Women > Outerwear > Jackets
└── CollectionLayout        — 双栏布局
    ├── FacetSidebar        — 左栏（桌面端）/ 底部弹出（移动端）
    │   ├── FacetGroup (Colors)
    │   ├── FacetGroup (Sizes)
    │   ├── FacetGroup (Materials)
    │   ├── FacetGroup (Brands)
    │   └── PriceRangeSlider
    └── ProductGrid         — 右栏
        ├── SortBar         — 排序下拉 + 结果数
        ├── ActiveFilters   — 当前筛选条件 pills
        ├── ProductCard[]
        └── Pagination
```

### 4.1 ProductCard

- 商品图片（取 `images[]` 第一张，fallback 用 `imageUrl`）
- 品牌名（小字，灰色）
- 商品名
- 最低在售 variant 价格（`variant.price`）
- 若 `compareAtPrice > price` → 显示划线原价 + 折扣百分比
- Hover 时切换到第二张图（若有）
- 点击跳转 `/products/[slug]`

### 4.2 FacetSidebar

- 桌面端：固定左栏，宽 240px，sticky 定位
- 移动端：默认隐藏，点击"Filter"按钮从底部弹出
- 每个 `FacetGroup` 可折叠，前 3 个默认展开
- 选中筛选条件 → 用 `router.replace` 更新 URL params（不整页刷新）
- 每个值旁显示数量：`Black (14)`

### 4.3 SortBar

- 下拉菜单：Newest / Price: Low to High / Price: High to Low
- 结果数量：`124 items`
- 移动端：Sort 和 Filter 两个按钮并排

### 4.4 ActiveFilters

- 显示当前所有筛选条件的 pill：`Black ×`、`EU 36 ×`、`Under £500 ×`
- 有任何筛选时显示"Clear all"按钮
- 点击 `×` → 从 URL params 中移除该筛选

### 4.5 Pagination

- 上一页 / 下一页 + 页码
- 通过 URL param `?page=2` 控制（不用 client state）

---

## 5. SEO Metadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const path = params.slug.join('/')
  const category = await getCategoryByPath(path)
  return {
    title: `${category.name} | YouWanto`,
    description: `Shop ${category.name} at YouWanto. Premium fashion with free delivery.`,
    openGraph: {
      title: `${category.name} | YouWanto`,
      description: `Shop ${category.name} at YouWanto.`,
      url: `https://youwanto.com/${path}`,
    },
  }
}
```

---

## 6. 静态生成 (ISR)

```typescript
export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { path: true } })
  return categories.map(c => ({ slug: c.path.split('/') }))
}

export const revalidate = 3600  // 每小时重新生成，feed 每天更新
```
