"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GalleryItem } from "@/types";

interface LightboxProps {
  items: GalleryItem[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

function isBeforeAfter(item: GalleryItem) {
  return !!(item.beforeImage && item.afterImage);
}

export function Lightbox({
  items,
  currentIndex,
  open,
  onOpenChange,
  onNavigate,
}: LightboxProps) {
  const item = items[currentIndex];

  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goNext, goPrev]);

  if (!item) return null;

  const hasBeforeAfter = isBeforeAfter(item);
  const singleImage = item.image || item.afterImage || item.beforeImage || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
        <div className="relative">
          {hasBeforeAfter ? (
            /* Before & After side-by-side */
            <div className="flex flex-col">
              <div className="grid grid-cols-2 gap-1">
                <div className="relative aspect-[4/3]">
                  <Image
                    src={item.beforeImage!}
                    alt={`${item.title} - Before`}
                    fill
                    className="object-cover rounded-tl-lg"
                    sizes="50vw"
                  />
                  <div className="absolute bottom-3 left-3 bg-red-500/90 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Before
                  </div>
                </div>
                <div className="relative aspect-[4/3]">
                  <Image
                    src={item.afterImage!}
                    alt={`${item.title} - After`}
                    fill
                    className="object-cover rounded-tr-lg"
                    sizes="50vw"
                  />
                  <div className="absolute bottom-3 right-3 bg-primary/90 text-white text-xs font-bold px-3 py-1 rounded-full">
                    After
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-white/90 text-lg font-medium">
                  {item.title}
                </p>
                <p className="text-white/50 text-sm mt-0.5 capitalize">
                  {item.category.replace("-", " ")}
                </p>
              </div>
            </div>
          ) : (
            /* Single image */
            <div className="flex flex-col">
              <div className="relative aspect-[4/3]">
                <Image
                  src={singleImage}
                  alt={item.title}
                  fill
                  className="object-cover rounded-t-lg"
                  sizes="(max-width: 1024px) 100vw, 80vw"
                />
              </div>
              <div className="px-5 py-4 text-center">
                <p className="text-white/90 text-lg font-medium">
                  {item.title}
                </p>
                <p className="text-white/50 text-sm mt-0.5 capitalize">
                  {item.category.replace("-", " ")}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 bg-black/30"
            onClick={goPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 bg-black/30"
            onClick={goNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Counter */}
          <div className="absolute top-3 right-3 bg-black/50 text-white/70 text-xs px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {items.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
