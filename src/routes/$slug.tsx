import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroProduct from "@/components/HeroProduct";
import CountdownTimer from "@/components/CountdownTimer";
import ColorSelector, { type SelectedProduct } from "@/components/ColorSelector";
import Features from "@/components/Features";
import OrderForm from "@/components/OrderForm";
import OrderSummary from "@/components/OrderSummary";
import AnimateOnScroll from "@/components/AnimateOnScroll";

export const Route = createFileRoute("/$slug")({
  component: SlugPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
      <h1 className="text-2xl font-bold text-foreground">পেজ পাওয়া যায়নি</h1>
      <Link to="/" className="rounded-lg bg-primary px-6 py-2 text-primary-foreground font-medium">হোম পেজে যান</Link>
    </div>
  ),
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

function SlugPage() {
  const { slug } = Route.useParams();
  const [pageId, setPageId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<SelectedProduct[]>([]);
  const [submittedOrder, setSubmittedOrder] = useState<OrderData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    supabase
      .from("pages")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPageId(data.id);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [slug]);

  // Handle browser back button from summary → go back to product page
  useEffect(() => {
    const handlePopState = () => {
      if (showSummary) {
        setSubmittedOrder(null);
        setShowSummary(false);
        setSelections([]);
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showSummary]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !pageId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold text-foreground">পেজ পাওয়া যায়নি</h1>
        <Link to="/" className="rounded-lg bg-primary px-6 py-2 text-primary-foreground font-medium">হোম পেজে যান</Link>
      </div>
    );
  }

  const handleOrderSubmit = (order: OrderData) => {
    try {
      const savedOrders = JSON.parse(localStorage.getItem("nusu_orders") || "[]");
      savedOrders.push({ ...order, timestamp: new Date().toISOString(), slug });
      localStorage.setItem("nusu_orders", JSON.stringify(savedOrders));
    } catch {}

    setIsProcessing(true);
    window.scrollTo({ top: 0 });

    setTimeout(() => {
      setSubmittedOrder(order);
      setIsProcessing(false);
      setShowSummary(true);
      window.history.pushState({ orderSummary: true }, "");
    }, 1000);
  };

  if (isProcessing) {
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
        <Header pageId={pageId} />
        <OrderSummary
          order={submittedOrder}
          pageId={pageId}
          onGoHome={() => {
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
      <Header pageId={pageId} />
      <AnimateOnScroll>
        <HeroProduct pageId={pageId} />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.1}>
        <CountdownTimer pageId={pageId} />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.15}>
        <Features pageId={pageId} />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.1}>
        <ColorSelector selections={selections} onSelectionsChange={setSelections} pageId={pageId} />
      </AnimateOnScroll>
      <AnimateOnScroll delay={0.1}>
        <OrderForm selections={selections} onOrderSubmit={handleOrderSubmit} pageId={pageId} />
      </AnimateOnScroll>
      <Footer />
    </div>
  );
}
