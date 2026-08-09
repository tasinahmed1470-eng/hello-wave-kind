import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroProduct from "@/components/HeroProduct";
import CountdownTimer from "@/components/CountdownTimer";
import ColorSelector, { type SelectedProduct } from "@/components/ColorSelector";
import Features from "@/components/Features";
import OrderForm from "@/components/OrderForm";
import OrderSummary from "@/components/OrderSummary";
import AnimateOnScroll from "@/components/AnimateOnScroll";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NUSU BORKA GALLERY — প্রিমিয়াম বোরকা কালেকশন" },
      { name: "description", content: "অরিজিনাল দুবাই সিওয়াই ফেব্রিক্সের প্রিমিয়াম বোরকা। ৩০% ছাড়ে মাত্র ৯৯০ টাকা। ফ্রি হিজাব সহ।" },
      { property: "og:title", content: "NUSU BORKA GALLERY — প্রিমিয়াম বোরকা কালেকশন" },
      { property: "og:description", content: "অরিজিনাল দুবাই সিওয়াই ফেব্রিক্সের প্রিমিয়াম বোরকা। ৩০% ছাড়ে মাত্র ৯৯০ টাকা।" },
    ],
  }),
  component: Index,
});

interface OrderData {
  name: string;
  address: string;
  phone: string;
  delivery: "outside" | "inside";
  selections: SelectedProduct[];
  total: number;
  deliveryCharge: number;
}

function Index() {
  const [selections, setSelections] = useState<SelectedProduct[]>([]);
  const [submittedOrder, setSubmittedOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // No longer restore last order — always show product page on visit

  const handleOrderSubmit = (order: OrderData) => {
    // Save to localStorage — both order list and last order for restore
    try {
      const savedOrders = JSON.parse(localStorage.getItem("nusu_orders") || "[]");
      savedOrders.push({ ...order, timestamp: new Date().toISOString() });
      localStorage.setItem("nusu_orders", JSON.stringify(savedOrders));
      localStorage.setItem("nusu_last_order", JSON.stringify(order));
    } catch {}

    setIsLoading(true);
    window.scrollTo({ top: 0 });

    setTimeout(() => {
      setSubmittedOrder(order);
      setIsLoading(false);
      setShowSummary(true);
      window.history.pushState({ orderSummary: true }, "");
    }, 1000);
  };

  // Handle browser back button from summary → go back to product page
  useEffect(() => {
    const handlePopState = () => {
      if (showSummary) {
        localStorage.removeItem("nusu_last_order");
        setSubmittedOrder(null);
        setShowSummary(false);
        setSelections([]);
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showSummary]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-lg font-semibold text-foreground animate-pulse">অর্ডার প্রসেস হচ্ছে...</p>
      </div>
    );
  }

  if (submittedOrder && showSummary) {
    return (
      <div className="min-h-screen bg-background animate-fade-in">
        <Header />
        <OrderSummary
          order={submittedOrder}
          onGoHome={() => {
            localStorage.removeItem("nusu_last_order");
            setSubmittedOrder(null);
            setShowSummary(false);
            setSelections([]);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AnimateOnScroll>
        <HeroProduct />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.1}>
        <CountdownTimer />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.15}>
        <Features />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.1}>
        <ColorSelector selections={selections} onSelectionsChange={setSelections} />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.1}>
        <OrderForm selections={selections} onOrderSubmit={handleOrderSubmit} />
      </AnimateOnScroll>
      <Footer />
    </div>
  );
}
