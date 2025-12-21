import ProductImages from "@/components/product/product-images";
import ProductPrice from "@/components/shared/product/product-price";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getProductBySlug } from "@/lib/actions/product.actions";
import { notFound } from "next/navigation";
import AddToCart from "@/components/shared/product/add-to-cart";
import { Button } from "@/components/ui/button";
import { ProductVariantSelector } from "@/components/product/product-variant-selector";
import { getMyCart } from "@/lib/actions/cart.actions";

const ProductDetailsPage = async (props: { params: Promise<{ slug: string }>; }) => {
    const params = await props.params;

    const { slug } = params;
    const product = await getProductBySlug(slug);
    if (!product) notFound();

    const variants = (product.variants ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stock,
        price: Number(v.price),
        currency: v.currency || product.currency,
    }));

    const cart = await getMyCart();
    return (
        <>
            <section>
               <div className="grid grid-cols-1 md:grid-cols-5">
                    {/* Product Images Column */}
                    <div className="col-span-2">
                        <ProductImages images={product.images!} alt={product.name} />
                    </div>
                    <div className="col-span-2">{/* Add Product Images */}</div>
                    {/* Product Details Column */}
                    <div className="col-span-2 p-5">
                        <div className="flex flex-col gap-6">
                            <p>
                                {product.brand} {" > "} {product.category}
                            </p>
                            <h1 className="h3-bold">{product.name}</h1>

                            {/* Main price */}
                            {/* <p>{product.rating} of {product.numReviews} reviews</p> */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <ProductPrice value={Number(product.price)} currency={product.currency} className="w-24 rounded-full px-3.5 py-2" />
                            </div>
                            {/* External product link (whole product) */}
                            {product.externalUrl && (
                                <div>
                                    <Button asChild variant="outline" className="mt-2">
                                    <a
                                        href={product.externalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow sponsored"
                                    >
                                        View more details
                                    </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                        <ProductVariantSelector variants={variants} />
                        {/* Description */}
                        <div className="mt-10 space-y-2">
                            <p className="font-medium">Descriptions:</p>
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                                {product.description}
                            </p>
                        </div>
                    </div>

                    {/* Action column */}
                    <div>
                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-2 flex justify-between">
                                    <div>Price</div>
                                    <div>
                                        <ProductPrice value={Number(product.price)} currency={product.currency}/>
                                    </div>
                                </div>
                                <div className="mb-2 flex justify-between">
                                    <div>Status</div>
                                    <div>{product.stock > 0 ? (<Badge variant={"outline"}>In Stock</Badge>) : (<Badge variant={"destructive"}>Unavailable</Badge>)}</div>
                                </div>
                                {product.stock > 0 && (
                                    <div className="flex-center">
                                        <AddToCart 
                                            cart={cart}
                                            item={{ 
                                                productId: product.id,
                                                name: product.name,
                                                quantity: 1, 
                                                slug: product.slug,
                                                price: product.price, 
                                                currency: product.currency,
                                                image: product.images![0], 
                                            }} 
                                        />
                                    </div>
                                ) }
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </>
    );
};
export default ProductDetailsPage;