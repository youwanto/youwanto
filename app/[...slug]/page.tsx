import FacetSidebar from '@/components/collection/FacetSidebar';
import ProductGrid from '@/components/collection/ProductGrid';
import Footer from '@/components/footer';
import Breadcrumb from '@/components/shared/Breadcrumb';
import Header from '@/components/shared/header';
import { CollectionQuery, getCategoryByPath, getCollectionData } from '@/lib/actions/collection';
import { collectionQuerySchema } from '@/lib/validator';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { prisma } from '@/db/prisma';

type CollectionPageProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { path: true } });

  return categories.map((category) => ({ slug: category.path.split('/') }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join('/');
  const category = await getCategoryByPath(path);

  if (!category) return {};

  return {
    title: `${category.name} | YouWanto`,
    description: `Shop ${category.name} at YouWanto. Premium fashion with free delivery.`,
    openGraph: {
      title: `${category.name} | YouWanto`,
      description: `Shop ${category.name} at YouWanto.`,
      url: `https://youwanto.com/${path}`,
    },
  };
}

const CollectionSkeleton = () => {
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <div className="hidden space-y-4 lg:block">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="space-y-5">
        <div className="h-11 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="aspect-[3/4] animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CollectionContent = async ({
  dataPromise,
  query,
}: {
  dataPromise: ReturnType<typeof getCollectionData>;
  query: CollectionQuery;
}) => {
  const data = await dataPromise;

  if (!data) notFound();

  return (
    <>
      <div className="space-y-3 border-b pb-6">
        <Breadcrumb items={data.breadcrumb.map((category) => ({ label: category.name, href: `/${category.path}` }))} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h1-bold">{data.category.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.total.toLocaleString('en-GB')} pieces selected for this collection.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <FacetSidebar facets={data.facets} query={query} />
        <ProductGrid
          products={data.products}
          query={query}
          total={data.total}
          page={data.page}
          totalPages={data.totalPages}
        />
      </div>
    </>
  );
};

const CollectionPage = async ({ params, searchParams }: CollectionPageProps) => {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const path = slug.join('/');
  const query = collectionQuerySchema.parse({ ...rawSearchParams, path });
  const dataPromise = getCollectionData(query);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="wrapper flex-1 space-y-8 py-8">
        <Suspense fallback={<CollectionSkeleton />}>
          <CollectionContent dataPromise={dataPromise} query={query} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default CollectionPage;