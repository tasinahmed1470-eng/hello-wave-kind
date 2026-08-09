import { useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import type { SelectedProduct } from "@/components/ColorSelector";
import { useProductColors } from "@/hooks/useProductColors";

interface OrderData {
  name: string;
  address: string;
  phone: string;
  delivery: "outside" | "inside";
  selections: SelectedProduct[];
  total: number;
  deliveryCharge: number;
}

interface Props {
  order: OrderData;
  onGoHome: () => void;
  pageId?: string;
}

export default function OrderSummary({ order, onGoHome, pageId }: Props) {
  const hijabPrice = 250;
  const captureRef = useRef<HTMLDivElement>(null);
  const hasDownloaded = useRef(false);
  const { colors: productColors } = useProductColors(pageId);

  const getProductImage = (selection: SelectedProduct) =>
    selection.imageUrl || productColors.find((color) => color.name === selection.color)?.image_url || "";

  const downloadAsImage = async () => {
    const el = captureRef.current;
    if (!el) return;
    try {
      const imgs = Array.from(el.querySelectorAll("img"));
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.onload = res;
                  img.onerror = res;
                })
        )
      );
      const canvas = await html2canvas(el, {
        backgroundColor: "#f5f0e8",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `NUSU-Order-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    if (hasDownloaded.current) return;
    hasDownloaded.current = true;
    const timer = setTimeout(downloadAsImage, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
      <div ref={captureRef} className="rounded-xl bg-card p-4 animate-scale-in">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/20">
            <svg className="h-10 w-10 text-warning" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        </div>

        <h1 className="mt-4 text-center text-xl font-bold text-foreground">
          সাবমিট হয়েছে, অর্ডারটি কনফার্ম করতে কল করা হবে
        </h1>

        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center text-xs text-destructive">
          🚨 নোট : অর্ডার কনফার্ম এর পর পার্সেল না নিলে ডেলিভারি চার্জ দেওয়া বাধ্যতামূলক। দয়া করে দায়িত্বশীলতার সাথে অর্ডার করুন, ফেক/ভুয়া অর্ডারকারীদের বিরুদ্ধে আইনি ব্যবস্থা নেওয়া হবে।
        </p>

        {order.selections.map((s) => {
          const productImage = getProductImage(s);

          return (
            <div key={s.color} className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-background p-4">
              {productImage ? (
                <img
                  src={productImage}
                  alt={s.color}
                  className="h-20 w-16 rounded-lg object-cover"
                  crossOrigin="anonymous"
                  width={64}
                  height={80}
                />
              ) : (
                <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-muted text-center text-[11px] text-muted-foreground">
                  ইমেজ
                </div>
              )}
              <div>
                <p className="flex items-center gap-1.5 font-bold text-foreground">
                  <span className="text-primary">📦</span> আপনার অর্ডার করা পণ্য
                </p>
                <p className="text-sm text-foreground">কালার: <span className="font-semibold">{s.color}</span></p>
                <p className="text-sm text-foreground">সাইজ: <span className="font-semibold">{s.size}</span></p>
                <p className="text-sm text-foreground">হিজাব: <span className="font-semibold">{s.hijab}</span></p>
                {s.quantity > 1 && <p className="text-sm text-foreground">পরিমাণ: <span className="font-semibold">{s.quantity}</span></p>}
              </div>
            </div>
          );
        })}

        <div className="mt-6 rounded-xl border border-border bg-background p-5">
          <h2 className="mb-4 text-xl font-bold text-foreground">অর্ডার সামারি</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">নাম:</span>
              <span className="font-semibold text-foreground">{order.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">মোবাইল:</span>
              <span className="font-semibold text-foreground">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ঠিকানা:</span>
              <span className="font-semibold text-foreground text-right max-w-[60%]">{order.address}</span>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            {order.selections.map((s) => (
              <div key={s.color} className="flex justify-between">
                <span className="text-muted-foreground">আবায়া মূল্য ({s.color}):</span>
                <span className="font-semibold text-foreground">৳{(s.unitPrice || 990) * s.quantity}</span>
              </div>
            ))}
            {order.selections.some((s) => s.hijab === "হিজাব সহ") && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">হিজাব:</span>
                <span className="font-semibold text-foreground">
                  ৳{order.selections.filter((s) => s.hijab === "হিজাব সহ").reduce((sum, s) => sum + hijabPrice * s.quantity, 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">ডেলিভারি চার্জ:</span>
              <span className="font-semibold text-foreground">৳{order.deliveryCharge}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-bold">
            <span className="text-foreground">মোট বিল:</span>
            <span className="text-primary">৳{order.total}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onGoHome}
        className="mt-6 w-full rounded-xl bg-primary py-3.5 text-lg font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
      >
        হোম পেজে ফিরে যান
      </button>
    </section>
  );
}
