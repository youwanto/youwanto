'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type ImageGalleryProps = {
  images: string[];
  selectedImageUrl?: string | null;
  alt: string;
};

const ImagePlaceholder = ({ className }: { className?: string }) => {
  return <div className={cn('flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground', className)}>No image</div>;
};

const ImageGallery = ({ images, selectedImageUrl, alt }: ImageGalleryProps) => {
  const galleryImages = useMemo(() => {
    const deduped = new Set<string>();
    [...(selectedImageUrl ? [selectedImageUrl] : []), ...images]
      .filter(Boolean)
      .forEach((image) => deduped.add(image));
    return Array.from(deduped);
  }, [images, selectedImageUrl]);
  const [currentImage, setCurrentImage] = useState(galleryImages[0] ?? null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedImageUrl) {
      setCurrentImage(selectedImageUrl);
      return;
    }
    setCurrentImage((current) => current ?? galleryImages[0] ?? null);
  }, [galleryImages, selectedImageUrl]);

  const markFailed = (image: string) => {
    setFailedImages((current) => new Set(current).add(image));
  };

  if (galleryImages.length === 0 || !currentImage || failedImages.has(currentImage)) {
    return <ImagePlaceholder className="aspect-[3/4] rounded-md" />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-[72px_1fr]">
      {galleryImages.length > 1 ? (
        <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
          {galleryImages.map((image, index) => (
            <Button
              key={`${image}-${index}`}
              type="button"
              variant="outline"
              className={cn(
                'relative h-20 w-16 shrink-0 overflow-hidden rounded-md p-0 md:h-24 md:w-full',
                currentImage === image && 'ring-2 ring-foreground ring-offset-2'
              )}
              onClick={() => setCurrentImage(image)}
              aria-label={`Show product image ${index + 1}`}
            >
              {failedImages.has(image) ? (
                <ImagePlaceholder />
              ) : (
                <Image
                  src={image}
                  alt={`${alt} thumbnail ${index + 1}`}
                  width={96}
                  height={128}
                  className="h-full w-full object-cover"
                  onError={() => markFailed(image)}
                />
              )}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="relative order-1 aspect-[3/4] overflow-hidden rounded-md bg-muted md:order-2">
        <Image
          src={currentImage}
          alt={alt}
          width={900}
          height={1200}
          priority
          className="h-full w-full object-cover"
          sizes="(min-width: 1024px) 48vw, 100vw"
          onError={() => markFailed(currentImage)}
        />
      </div>
    </div>
  );
};

export default ImageGallery;