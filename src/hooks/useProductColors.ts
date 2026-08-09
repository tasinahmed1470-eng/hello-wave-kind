import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProductColor = Database["public"]["Tables"]["product_colors"]["Row"];

const cacheByPage: Record<string, ProductColor[]> = {};

export function useProductColors(pageId?: string) {
  const cacheKey = pageId || "__default__";
  const [colors, setColors] = useState<ProductColor[]>(cacheByPage[cacheKey] || []);
  const [loading, setLoading] = useState(!cacheByPage[cacheKey]);

  useEffect(() => {
    if (cacheByPage[cacheKey]) {
      setColors(cacheByPage[cacheKey]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("product_colors")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (pageId) {
      query = query.eq("page_id", pageId);
    }

    query.then(({ data }) => {
      const result = data || [];
      cacheByPage[cacheKey] = result;
      setColors(result);
      setLoading(false);
      result.forEach((color) => {
        if (color.image_url) {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "image";
          link.href = color.image_url;
          document.head.appendChild(link);
        }
      });
    });
  }, [cacheKey, pageId]);

  const refresh = async () => {
    let query = supabase
      .from("product_colors")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (pageId) {
      query = query.eq("page_id", pageId);
    }
    const { data } = await query;
    const result = data || [];
    cacheByPage[cacheKey] = result;
    setColors(result);
  };

  return { colors, loading, refresh };
}

export function invalidateProductColorsCache(pageId?: string) {
  if (pageId) {
    delete cacheByPage[pageId];
  } else {
    Object.keys(cacheByPage).forEach((k) => delete cacheByPage[k]);
  }
}
