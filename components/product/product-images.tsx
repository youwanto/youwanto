'use client';
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

const ProductImages = ({ images }: { images: string[] }) => {
    const [currentImage, setCurrentImage] = useState(0);

    return (
        <div className="space-y-4">
            <Image
                src={images![currentImage]}
                alt={`Product Image ${currentImage + 1}`}
                loading="lazy"
                width={1000}
                height={1000}
                className="min-h-[300px] object-cover object-center"
            />
            <div className="flex">
                {images!.map((img, index) => (
                    <div key={img} className={cn('border mr-2 cursor-pointer hover:border-orange-600',currentImage===index && 'border-orange-500')}
                    onClick={() => setCurrentImage(index)}
                    >
                        <Image src={img} alt={`Product Image ${index + 1}`} width={100} height={100} />
                    </div>
                ))}
            </div>
        </div>
    );
};
export default ProductImages;