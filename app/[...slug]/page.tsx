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
import { APP_NAME } from '@/lib/constants';

const DEFAULT_PAGE_SIZE = 24;

type CollectionPageProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { path: true } });

  return categories.map((category) => ({ slug: category.path.split('/') }));
}

// Invalid query strings (e.g. ?page=abc) fall back to the unfiltered collection instead of erroring
const parseCollectionQuery = (
  rawSearchParams: Record<string, string | string[] | undefined>,
  path: string
): CollectionQuery => {
  const parsed = collectionQuerySchema.safeParse({ ...rawSearchParams, path });
  return parsed.success ? parsed.data : collectionQuerySchema.parse({ path });
};

export async function generateMetadata({ params, searchParams }: CollectionPageProps): Promise<Metadata> {
  const [{ slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const path = slug.join('/');
  const category = await getCategoryByPath(path);

  if (!category) notFound();

  const query = parseCollectionQuery(rawSearchParams, path);
  const isFilteredView =
    query.colors.length > 0 ||
    query.sizes.length > 0 ||
    query.materials.length > 0 ||
    query.brands.length > 0 ||
    query.minPrice !== undefined ||
    query.maxPrice !== undefined ||
    query.inStock ||
    query.sort !== 'newest' ||
    query.limit !== DEFAULT_PAGE_SIZE;
  const canonical = query.page > 1 ? `/${path}?page=${query.page}` : `/${path}`;
  const description = `Shop ${category.name} at ${APP_NAME}. Premium fashion with free delivery.`;

  return {
    // The root layout appends the site name via the title template
    title: query.page > 1 ? `${category.name} - Page ${query.page}` : category.name,
    description,
    alternates: { canonical },
    // Filtered/sorted variants are duplicates of the base collection: keep them out of the index
    ...(isFilteredView ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: category.name,
      description,
      url: canonical,
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

  // Resolve the category before streaming starts so unknown URLs are real 404s
  const category = await getCategoryByPath(path);
  if (!category) notFound();

  const query = parseCollectionQuery(rawSearchParams, path);
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