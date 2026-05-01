import ProductCard from '@/components/collection/ProductCard';
import { getRelatedProducts } from '@/lib/actions/product';

type RelatedProductsProps = {
  productId: string;
  categoryPath: string;
  productBrand?: string | null;
};

const RelatedProducts = async ({ productId, categoryPath, productBrand }: RelatedProductsProps) => {
  const products = await getRelatedProducts(productId, categoryPath);

  if (products.length === 0) return null;

  const hasSameBrand = productBrand ? products.some((product) => product.brand === productBrand) : false;

  return (
    <section className="space-y-4">
      <h2 className="h2-bold">{hasSameBrand ? `More from ${productBrand}` : 'You may also like'}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
        {products.map((product) => (
          <div key={product.id} className="w-44 shrink-0 md:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RelatedProducts;