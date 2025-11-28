'use client';
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProductImagesProps = {
    images: string[];
    alt?: string;
};

const ProductImages = ({ images, alt = "Product Image" }: ProductImagesProps) => {
    const [currentImage, setCurrentImage] = useState(0);

    if (!images || images.length === 0) return null;

    const goPrev = () => {
        setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };
    
    const goNext = () => {
        setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className="space-y-4">
            {/* main image */}
            <div className="relative aspect-auto w-full overflow-hidden rounded-xl border">
                <Image
                    src={images![currentImage]}
                    alt={`${alt} ${currentImage + 1}`}
                    loading="lazy"
                    width={1000}
                    height={1000}
                    className="min-h-[300px] object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
                    <Button
                        size="icon"
                        variant="outline"
                        className="pointer-events-auto rounded-full bg-white/80 backdrop-blur"
                        onClick={goPrev}
                        type="button"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        className="pointer-events-auto rounded-full bg-white/80 backdrop-blur"
                        onClick={goNext}
                        type="button"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                {/* index indicator */}
                <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                {currentImage + 1} / {images.length}
                </div>
            </div>
            {/* thumbnails */}
            <div>
                <div className="flex">
                    {images!.map((img, index) => (
                        <div key={img} className={cn('border mr-2 cursor-pointer hover:border-orange-600',currentImage===index && 'border-orange-500')}
                        onClick={() => setCurrentImage(index)}
                        >
                            <Image src={img} alt={`${alt} ${index + 1}`} width={100} height={100} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default ProductImages;