import Footer from '@/components/footer';
import ProductDetailClient from '@/components/pdp/ProductDetailClient';
import RelatedProducts from '@/components/pdp/RelatedProducts';
import Breadcrumb from '@/components/shared/Breadcrumb';
import Header from '@/components/shared/header';
import { prisma } from '@/db/prisma';
import { getProductBySlug } from '@/lib/actions/product';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
  });

  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  const image = product.imageUrl ?? product.images[0];

  return {
    title: `${product.name} | ${product.brand ?? 'YouWanto'}`,
    description: product.shortDescription ?? product.description?.slice(0, 155) ?? `Shop ${product.name} at YouWanto.`,
    openGraph: {
      title: `${product.name} | ${product.brand ?? 'YouWanto'}`,
      images: image ? [{ url: image }] : undefined,
      url: `https://youwanto.com/products/${product.slug}`,
    },
  };
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

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