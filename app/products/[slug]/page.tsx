import Footer from '@/components/footer';
import ProductDetailClient from '@/components/pdp/ProductDetailClient';
import RelatedProducts from '@/components/pdp/RelatedProducts';
import Breadcrumb from '@/components/shared/Breadcrumb';
import Header from '@/components/shared/header';
import { prisma } from '@/db/prisma';
import { APP_NAME } from '@/lib/constants';
import { buildBreadcrumbJsonLd, buildProductJsonLd, serializeJsonLd } from '@/lib/seo';
import { getProductBySlug } from '@/lib/actions/product';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 3600;

// Pre-rendering every product does not scale: 5,000 pages added ~12 minutes to a deployment,
// and the catalogue is now several times larger. Only the products a visitor meets first are
// built up front: the top of the home feed, in the same order as the home page shows them.
// Every other product page is rendered on its first visit and then cached like the rest
// (see `revalidate`), so only that first visitor waits for the database.
const PRERENDERED_PRODUCTS = Number(process.env.PRERENDER_PRODUCT_COUNT ?? 200);

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
    // Same order as the home feed (app/(root)/page.tsx)
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: PRERENDERED_PRODUCTS,
  });

  return products.map((product) => ({ slug: product.slug }));
}

// The metadata and the page both need the product: load it once per request
const loadProduct = cache((slug: string) => getProductBySlug(slug));

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  const image = product.imageUrl ?? product.images[0];
  // The root layout appends the site name via the title template
  const title = product.brand ? `${product.name} | ${product.brand}` : product.name;
  const description =
    product.shortDescription ?? product.description?.slice(0, 155) ?? `Shop ${product.name} at ${APP_NAME}.`;
  const canonical = `/products/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      url: canonical,
    },
  };
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) notFound();

  const primaryCategory = [...product.categories]
    .map((row) => row.category)
    .sort((left, right) => right.level - left.level || left.sortOrder - right.sortOrder)[0];
  const breadcrumbItems = [
    ...product.breadcrumb.map((category) => ({ label: category.name, href: `/${category.path}` })),
    { label: product.name },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="wrapper flex-1 space-y-8 py-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd([buildProductJsonLd(product), buildBreadcrumbJsonLd(breadcrumbItems)]),
          }}
        />
        <Breadcrumb items={breadcrumbItems} />
        <ProductDetailClient product={product} />
        {primaryCategory ? (
          <RelatedProducts productId={product.id} categoryPath={primaryCategory.path} productBrand={product.brand} />
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

export default ProductPage;