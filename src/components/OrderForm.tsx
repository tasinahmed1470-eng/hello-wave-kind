import { useState, useCallback } from "react";
import type { SelectedProduct } from "@/components/ColorSelector";
import { useSiteSettings } from "@/hooks/useSiteSettings";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const SHEET_WEBHOOK = "https://script.google.com/macros/s/AKfycbwNizNduR5ilDqQrrzE2yIiIwG91YnFSMduhaVsKVuhQefvgEOX2n6MJ3483sPeY57e/exec";

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
  selections: SelectedProduct[];
  onOrderSubmit: (order: OrderData) => void;
  pageId?: string;
}

const PHONE_REGEX = /^01[0-9]{9}$/;
const BANGLA_PHONE_REGEX = /^০১[০-৯]{9}$/;

function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value) || BANGLA_PHONE_REGEX.test(value);
}

export default function OrderForm({ selections, onOrderSubmit, pageId }: Props) {
  const { settings } = useSiteSettings(pageId);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [note, setNote] = useState("");
  const [delivery, setDelivery] = useState<"outside" | "inside">("outside");

  const hijabPrice = settings.hijab_price;
  const totalProducts = selections.reduce((sum, s) => sum + s.quantity * ((s.unitPrice || settings.product_price) + (s.hijab === "হিজাব সহ" ? hijabPrice : 0)), 0);
  const deliveryCharge = delivery === "outside" ? settings.delivery_outside : settings.delivery_inside;
  const total = selections.length > 0 ? totalProducts + deliveryCharge : 0;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    if (selections.length === 0) return alert("অনুগ্রহ করে একটি কালার সিলেক্ট করুন");

    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "InitiateCheckout", { value: total, currency: "BDT" });
    }

    const orderNotes = selections
      .map((s, i) => `পণ্য ${i + 1}: কালার-${s.color}, সাইজ-${s.size}, ${s.hijab}, পরিমাণ-${s.quantity}`)
      .join(" | ");

    const isSingle = selections.length === 1;
    const first = selections[0];

    const sheetData = {
      name,
      phone,
      district: "",
      address,
      size: isSingle ? first.size : "মাল্টি",
      color: isSingle ? first.color : "মাল্টি",
      total_price: total,
      hijab_status: isSingle ? first.hijab : "মাল্টি",
      notes: orderNotes,
      order_date: new Date().toLocaleString("bn-BD"),
      status: "confirmed",
    };

    fetch(SHEET_WEBHOOK, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(sheetData),
    }).catch(() => {});

    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", { value: total, currency: "BDT", content_name: "Abaya/Borka" });
    }

    onOrderSubmit({ name, address, phone, delivery, selections, total, deliveryCharge });
  }, [name, address, phone, delivery, selections, total, deliveryCharge, onOrderSubmit]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    if (phoneError) setPhoneError(false);
  }, [phoneError]);

  return (
    <section className="mx-auto mt-4 max-w-3xl px-4 pb-12">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">২</span>
        ধাপ ২
      </div>

      <form id="order-form" onSubmit={handleSubmit} className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/5 to-transparent p-6 shadow-[var(--shadow-elevated)]">
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">অর্ডার কনফার্ম করুন</h2>
        <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-primary/30" />

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            নাম <span className="text-destructive">*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="আপনার নাম লিখুন"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all duration-200"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            ঠিকানা <span className="text-destructive">*</span>
          </label>
          <textarea
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="আপনার সম্পূর্ণ ঠিকানা লিখুন (জেলা, থানা, গ্রাম)"
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all duration-200"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            ফোন নাম্বার <span className="text-destructive">*</span>
          </label>
          <input
            required
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="আপনার ফোন নাম্বার লিখুন"
            className={`w-full rounded-xl border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all duration-200 ${
              phoneError ? "border-destructive focus:border-destructive" : "border-input focus:border-primary"
            }`}
          />
          {phoneError && (
            <p className="mt-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
              01** দিয়ে ১১ সংখ্যার একটি বৈধ নাম্বার দিন।
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            নোট <span className="text-muted-foreground text-xs font-normal">(ঐচ্ছিক)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="আপনার কোনো বিশেষ নির্দেশনা থাকলে এখানে লিখুন..."
            rows={2}
            maxLength={500}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all duration-200"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-foreground">
            ডেলিভারি এরিয়া <span className="text-destructive">*</span>
          </label>
          <div className="space-y-2 rounded-xl border border-input bg-background p-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/50">
              <input
                type="radio"
                name="delivery"
                checked={delivery === "outside"}
                onChange={() => setDelivery("outside")}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-foreground">ঢাকা সিটির বাহিরে ({settings.delivery_outside} টাকা)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/50">
              <input
                type="radio"
                name="delivery"
                checked={delivery === "inside"}
                onChange={() => setDelivery("inside")}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-foreground">ঢাকা সিটির ভিতরে ({settings.delivery_inside} টাকা)</span>
            </label>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6 rounded-xl bg-muted/60 p-4 backdrop-blur-sm">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
            🛒 অর্ডার সামারি
          </h3>
          {selections.length > 0 ? (
            <div className="mb-2 space-y-1">
              {selections.map((s) => (
                <p key={s.color} className="text-sm text-foreground">
                  {s.color} — সাইজ {s.size}, {s.hijab}, ×{s.quantity}
                </p>
              ))}
            </div>
          ) : (
            <p className="mb-2 text-sm text-muted-foreground">কোনো পণ্য নির্বাচন করা হয়নি</p>
          )}
          <div className="space-y-1 border-t border-border/60 pt-2">
            <div className="flex justify-between text-sm text-foreground">
              <span>মোট মূল্য:</span>
              <span>{totalProducts > 0 ? `${totalProducts} ৳` : "৳০"}</span>
            </div>
            <div className="flex justify-between text-sm text-foreground">
              <span>ডেলিভারি চার্জ:</span>
              <span>{selections.length > 0 ? `${deliveryCharge} ৳` : "৳০"}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 text-lg font-bold text-primary">
              <span>সর্বমোট:</span>
              <span>{total > 0 ? `${total} ৳` : "৳০"}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-primary py-3.5 text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
        >
          অর্ডার কনফার্ম করুন
        </button>
      </form>
    </section>
  );
}
