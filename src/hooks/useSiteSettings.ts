import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SiteSettings = Database["public"]["Tables"]["site_settings"]["Row"];

const defaultSettings: SiteSettings = {
  id: "",
  store_name: "NUSU BORKA GALLERY",
  whatsapp_number: "8801834108703",
  hero_image_url: "",
  product_price: 990,
  original_price: 1420,
  discount_badge: "৩০% ছাড়!",
  hijab_price: 250,
  delivery_inside: 80,
  delivery_outside: 150,
  timer_hours: 0,
  timer_minutes: 27,
  timer_seconds: 7,
  timer_label: "অফার শেষ!!",
  rating_stars: 4,
  rating_text: "(সর্বোচ্চ রেটিং)",
  review_count_text: "৩৭৩+ জন কাস্টমার এই প্রোডাক্টে সন্তুষ্ট",
  borka_details_json: [],
  updated_at: "",
  page_id: null,
  sizes: ["52", "54", "56"],
  timer_enabled: true,
};

const cacheByPage: Record<string, SiteSettings> = {};
const fetchPromiseByPage: Record<string, Promise<SiteSettings>> = {};

async function fetchSettings(pageId?: string): Promise<SiteSettings> {
  let query = supabase.from("site_settings").select("*");
  if (pageId) {
    query = query.eq("page_id", pageId);
  }
  const { data } = await query.limit(1).single();
  return data || defaultSettings;
}

export function useSiteSettings(pageId?: string) {
  const cacheKey = pageId || "__default__";
  const [settings, setSettings] = useState<SiteSettings>(cacheByPage[cacheKey] || defaultSettings);
  const [loading, setLoading] = useState(!cacheByPage[cacheKey]);

  useEffect(() => {
    if (cacheByPage[cacheKey]) {
      setSettings(cacheByPage[cacheKey]);
      setLoading(false);
      return;
    }

    if (!fetchPromiseByPage[cacheKey]) {
      fetchPromiseByPage[cacheKey] = fetchSettings(pageId);
    }

    fetchPromiseByPage[cacheKey].then((data) => {
      cacheByPage[cacheKey] = data;
      setSettings(data);
      setLoading(false);
    });
  }, [cacheKey, pageId]);

  const refresh = async () => {
    delete fetchPromiseByPage[cacheKey];
    const data = await fetchSettings(pageId);
    cacheByPage[cacheKey] = data;
    setSettings(data);
  };

  return { settings, loading, refresh };
}

export function invalidateSiteSettingsCache(pageId?: string) {
  if (pageId) {
    delete cacheByPage[pageId];
    delete fetchPromiseByPage[pageId];
  } else {
    // Clear all
    Object.keys(cacheByPage).forEach((k) => delete cacheByPage[k]);
    Object.keys(fetchPromiseByPage).forEach((k) => delete fetchPromiseByPage[k]);
  }
}
