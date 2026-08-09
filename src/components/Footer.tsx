import AnimateOnScroll from "@/components/AnimateOnScroll";

export default function Footer() {
  return (
    <AnimateOnScroll>
      <footer className="mt-10 bg-footer-bg py-12 relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />

        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h3 className="text-2xl font-bold text-footer-foreground tracking-wide animate-fade-in">
            NUSU BORKA GALLERY
          </h3>
          <div className="mx-auto mt-3 h-[2px] w-20 rounded-full bg-footer-accent animate-scale-in" />

          <p className="mt-4 text-sm text-footer-muted animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
            প্রিমিয়াম আবায়া ও বোরকা কালেকশন — কোয়ালিটি নিয়ে কোনো আপোষ নেই!!
          </p>

          <div className="mt-6 animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
            <a
              href="tel:+8801834108703"
              className="inline-flex items-center gap-2 text-footer-foreground transition-all duration-300 hover:text-footer-accent hover:scale-105"
            >
              <span className="text-lg">📞</span>
              <span className="text-base font-medium tracking-wide">+8801834108703</span>
            </a>
          </div>

          <p
            className="mt-5 flex items-center justify-center gap-2 text-sm text-footer-muted animate-fade-in"
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
          >
            <span className="text-lg">📍</span>
            <span>Kamrangir char, Dhaka, Bangladesh</span>
          </p>

          <div
            className="mx-auto mt-8 h-px w-32 bg-footer-muted/20 animate-scale-in"
            style={{ animationDelay: "0.35s", animationFillMode: "both" }}
          />

          <p
            className="mt-4 text-xs text-footer-muted/40 animate-fade-in"
            style={{ animationDelay: "0.4s", animationFillMode: "both" }}
          >
            © 2023 NUSU BORKA GALLERY. সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
      </footer>
    </AnimateOnScroll>
  );
}
