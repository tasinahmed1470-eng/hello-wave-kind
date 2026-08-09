import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useProductColors } from "@/hooks/useProductColors";

const defaultSizes = ["52", "54", "56"];
const hijabOptions = ["হিজাব ছাড়া", "হিজাব সহ"] as const;

export interface SelectedProduct {
  color: string;
  imageUrl?: string;
  size: string;
  hijab: "হিজাব ছাড়া" | "হিজাব সহ";
  quantity: number;
  unitPrice: number;
}

interface Props {
  selections: SelectedProduct[];
  onSelectionsChange: (selections: SelectedProduct[]) => void;
  pageId?: string;
}

function CollapsibleWrapper({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}

export default function ColorSelector({ selections, onSelectionsChange, pageId }: Props) {
  const { settings } = useSiteSettings(pageId);
  const { colors: dbColors } = useProductColors(pageId);
  const sizes: string[] = Array.isArray(settings.sizes) ? (settings.sizes as string[]) : defaultSizes;
  const [localSelections, setLocalSelections] = useState<SelectedProduct[]>(selections);

  useEffect(() => {
    onSelectionsChange(localSelections);
  }, [localSelections, onSelectionsChange]);

  useEffect(() => {
    if (dbColors.length === 0) return;
    setLocalSelections((current) =>
      current.map((item) => {
        const matchedColor = dbColors.find((color) => color.name === item.color);
        if (!matchedColor) return item;
        return {
          ...item,
          unitPrice: matchedColor.product_price,
          imageUrl: matchedColor.image_url || item.imageUrl,
        };
      }),
    );
  }, [dbColors]);

  const getSelection = useCallback((name: string) => localSelections.find((item) => item.color === name), [localSelections]);

  const toggleColor = useCallback((name: string, unitPrice: number, imageUrl: string) => {
    setLocalSelections((current) => {
      const exists = current.some((item) => item.color === name);
      if (exists) return current.filter((item) => item.color !== name);
      return [...current, { color: name, imageUrl, size: sizes[0] || "52", hijab: "হিজাব ছাড়া", quantity: 1, unitPrice }];
    });
  }, [sizes]);

  const updateSelection = useCallback((name: string, updates: Partial<SelectedProduct>) => {
    setLocalSelections((current) =>
      current.map((item) => (item.color === name ? { ...item, ...updates } : item)),
    );
  }, []);

  const colorList = dbColors.length > 0
    ? dbColors
        .filter((c) => c.name.trim() !== "")
        .map((c) => ({
          name: c.name,
          img: c.image_url || "",
          productPrice: c.product_price,
          originalPrice: c.original_price,
        }))
    : [];

  return (
    <section id="color-selector" className="mx-auto mt-6 max-w-3xl px-4 scroll-mt-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">১</span>
        ধাপ ১
      </div>
      <h2 className="mb-4 rounded-xl bg-primary/10 py-2.5 text-center text-xl font-bold text-primary">
        ✨ পছন্দের পণ্যটি সিলেক্ট করুন
      </h2>

      <div className="space-y-3">
        {colorList.map((color) => {
          const selection = getSelection(color.name);
          const active = !!selection;

          return (
            <div
              key={color.name}
              className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                active
                  ? "border-primary/30 bg-muted/40 shadow-[var(--shadow-elevated)]"
                  : "border-border/60 bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)]"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleColor(color.name, color.productPrice, color.img)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    active ? "border-primary bg-primary scale-110" : "border-muted-foreground/50"
                  }`}
                  aria-hidden="true"
                >
                  {active ? <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground" /> : null}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-foreground">{color.name}</p>
                  <p className="text-sm">
                    <span className="text-price-old line-through">{color.originalPrice}৳</span>{" "}
                    <span className="font-bold text-price">{color.productPrice} ৳</span>
                  </p>
                </div>

                <img
                  src={color.img}
                  alt={color.name}
                  className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-sm"
                  loading="lazy"
                  width={80}
                  height={80}
                />
              </button>

              <CollapsibleWrapper open={active}>
                {selection ? (
                  <div className="border-t border-border/40 px-4 pb-4 pt-4">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">সাইজ:</span>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((size) => (
                          <OptionButton
                            key={size}
                            active={selection.size === size}
                            onClick={() => updateSelection(color.name, { size })}
                          >
                            {size}
                          </OptionButton>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">হিজাব:</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {hijabOptions.map((hijab) => (
                          <OptionButton
                            key={hijab}
                            active={selection.hijab === hijab}
                            onClick={() => updateSelection(color.name, { hijab })}
                          >
                            {hijab}
                          </OptionButton>
                        ))}
                        {selection.hijab === "হিজাব সহ" && (
                          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                            +{settings.hijab_price} ৳
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">পরিমান:</span>
                      <div className="flex items-center overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                        <button
                          type="button"
                          onClick={() =>
                            updateSelection(color.name, {
                              quantity: Math.max(1, selection.quantity - 1),
                            })
                          }
                          className="flex h-9 w-10 items-center justify-center text-lg font-bold text-foreground transition-colors hover:bg-muted active:bg-muted/80"
                        >
                          −
                        </button>
                        <span className="flex h-9 w-12 items-center justify-center border-x border-border text-sm font-semibold text-foreground">
                          {selection.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelection(color.name, {
                              quantity: selection.quantity + 1,
                            })
                          }
                          className="flex h-9 w-10 items-center justify-center text-lg font-bold text-foreground transition-colors hover:bg-muted active:bg-muted/80"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CollapsibleWrapper>
            </div>
          );
        })}
      </div>
    </section>
  );
}
