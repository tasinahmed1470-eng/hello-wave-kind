import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

const cacheByPage: Record<string, ProductImage[]> = {};

export function useProductImages(pageId?: string) {
  const cacheKey = pageId || "__default__";
  const [images, setImages] = useState<ProductImage[]>(cacheByPage[cacheKey] || []);
  const [loading, setLoading] = useState(!cacheByPage[cacheKey]);

  useEffect(() => {
    if (cacheByPage[cacheKey]) {
      setImages(cacheByPage[cacheKey]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("product_images")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (pageId) {
      query = query.eq("page_id", pageId);
    }

    query.then(({ data }) => {
      const result = data || [];
      cacheByPage[cacheKey] = result;
      setImages(result);
      setLoading(false);
      result.forEach((img) => {
        if (img.image_url) {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.as = "image";
          link.href = img.image_url;
          document.head.appendChild(link);
        }
      });
    });
  }, [cacheKey, pageId]);

  return { images, loading };
}

export function invalidateProductImagesCache(pageId?: string) {
  if (pageId) {
    delete cacheByPage[pageId];
  } else {
    Object.keys(cacheByPage).forEach((k) => delete cacheByPage[k]);
  }
}
