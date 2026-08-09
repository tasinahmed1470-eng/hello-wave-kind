import { useState, useRef, useCallback, type TouchEvent } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductImages } from "@/hooks/useProductImages";
import { useProductColors } from "@/hooks/useProductColors";

const VISIBLE_COUNT = 5;

export default function HeroProduct({ pageId }: { pageId?: string }) {
  const { settings } = useSiteSettings(pageId);
  const { images: productImages } = useProductImages(pageId);
  const { colors: productColors } = useProductColors(pageId);
  const [selected, setSelected] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const touchStartX = useRef(0);

  const thumbnails = [
    ...productImages
      .filter((img) => !!img.image_url)
      .map((img) => ({
        imageUrl: img.image_url,
        productPrice: settings.product_price,
        originalPrice: settings.original_price,
        alt: "প্রিমিয়াম বোরকা",
      })),
    ...productColors
      .filter((color) => !!color.image_url)
      .map((color) => ({
        imageUrl: color.image_url,
        productPrice: color.product_price,
        originalPrice: color.original_price,
        alt: color.name,
      })),
  ];

  const scrollThumbPrev = useCallback(() => setThumbStart((p) => Math.max(0, p - 1)), []);
  const scrollThumbNext = useCallback(() =>
    setThumbStart((p) => Math.min(Math.max(0, thumbnails.length - VISIBLE_COUNT), p + 1)), [thumbnails.length]);
  const visibleThumbs = thumbnails.slice(thumbStart, thumbStart + VISIBLE_COUNT);

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) scrollThumbNext();
    else if (diff < -40) scrollThumbPrev();
  };

  const handleOrderClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById("color-selector");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", window.location.pathname);
    }
  };

  if (thumbnails.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-card flex items-center justify-center h-[480px] shadow-[var(--shadow-elevated)]">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      </section>
    );
  }

  const safeSelected = Math.min(selected, thumbnails.length - 1);
  const activeThumbnail = thumbnails[safeSelected];

  return (
    <section className="mx-auto max-w-3xl px-4 pt-4">
      <div className="relative overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-elevated)]">
        <img
          src={activeThumbnail.imageUrl}
          alt={activeThumbnail.alt}
          className="mx-auto h-[480px] w-full object-contain transition-opacity duration-300"
          width={512}
          height={640}
          fetchPriority="high"
          decoding="async"
        />
        <span className="absolute top-3 left-3 rounded-full bg-sale px-3 py-1.5 text-sm font-bold text-sale-foreground shadow-lg backdrop-blur-sm">
          {settings.discount_badge}
        </span>
      </div>

      {/* Price display */}
      <div className="mt-3 flex items-center justify-center gap-3 rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-card)]">
        <span className="text-base text-price-old line-through">{activeThumbnail.originalPrice} ৳</span>
        <span className="text-2xl font-bold text-price">{activeThumbnail.productPrice} ৳</span>
      </div>

      {/* Thumbnails */}
      {thumbnails.length > 1 && (
        <div
          className="mt-3 flex items-center gap-1"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            onClick={scrollThumbPrev}
            disabled={thumbStart === 0}
            className="shrink-0 px-1 text-2xl text-muted-foreground disabled:opacity-20 transition-opacity"
            aria-label="Previous"
          >
            ‹
          </button>
          <div className="flex flex-1 justify-center gap-2 overflow-hidden">
            {visibleThumbs.map((thumb, i) => {
              const realIndex = thumbStart + i;
              return (
                <button
                  key={realIndex}
                  onClick={() => setSelected(realIndex)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                    safeSelected === realIndex
                      ? "border-primary shadow-[var(--shadow-glow)] scale-105"
                      : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  <img src={thumb.imageUrl} alt="" className="h-full w-full object-cover" loading="eager" decoding="async" width={64} height={64} />
                </button>
              );
            })}
          </div>
          <button
            onClick={scrollThumbNext}
            disabled={thumbStart >= thumbnails.length - VISIBLE_COUNT}
            className="shrink-0 px-1 text-2xl text-muted-foreground disabled:opacity-20 transition-opacity"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      )}

      {/* CTA Button */}
      <div className="mt-4">
        <a
          href="#color-selector"
          onClick={handleOrderClick}
          className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 py-3.5 text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-95"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
          <span className="relative animate-[float_2s_ease-in-out_infinite]">🛒</span>
          <span className="relative">সাইজ বাছাই করুন</span>
        </a>
      </div>

      {/* Rating */}
      <div className="mt-3 flex items-center justify-center gap-1 text-lg">
        <span className="text-warning">{"★".repeat(Math.min(5, Math.max(0, settings.rating_stars)))}</span>
        <span className="text-muted-foreground">{"★".repeat(Math.max(0, 5 - Math.min(5, settings.rating_stars)))}</span>
        <span className="ml-1 font-semibold text-foreground">{settings.rating_text}</span>
      </div>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {settings.review_count_text}
      </p>
    </section>
  );
}
