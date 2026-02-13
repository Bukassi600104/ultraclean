"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Lightbox } from "@/components/gallery/Lightbox";
import type { GalleryItem } from "@/types";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "deep-cleaning", label: "Deep Cleaning" },
  { value: "move-in-out", label: "Move-In/Out" },
  { value: "post-construction", label: "Post-Construction" },
];

function isBeforeAfter(item: GalleryItem) {
  return !!(item.beforeImage && item.afterImage);
}

function getDisplayImage(item: GalleryItem) {
  return item.afterImage || item.image || item.beforeImage || "";
}

interface GalleryGridProps {
  items: GalleryItem[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  const [filter, setFilter] = useState("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.category === filter),
    [items, filter]
  );

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 justify-center mb-12">
        {FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? "default" : "outline"}
            size="sm"
            className={`rounded-full px-5 transition-all ${
              filter === option.value
                ? "shadow-md shadow-primary/20"
                : "hover:border-primary/30"
            }`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📸</span>
          </div>
          <p className="text-muted-foreground">
            No items in this category yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              className="group aspect-[4/3] rounded-2xl overflow-hidden relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-md hover:shadow-xl transition-all duration-300"
              onClick={() => openLightbox(index)}
            >
              <Image
                src={getDisplayImage(item)}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Before & After badge */}
              {isBeforeAfter(item) && (
                <div className="absolute top-3 left-3 bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                  Before & After
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-white font-heading font-bold">
                  {item.title}
                </p>
                <p className="text-white/60 text-sm mt-0.5 capitalize">
                  {item.category.replace("-", " ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Lightbox
        items={filtered}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
