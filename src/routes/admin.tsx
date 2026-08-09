import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { invalidateSiteSettingsCache } from "@/hooks/useSiteSettings";
import { invalidateProductColorsCache } from "@/hooks/useProductColors";

type SiteSettings = Database["public"]["Tables"]["site_settings"]["Row"];
type ProductColor = Database["public"]["Tables"]["product_colors"]["Row"];
type Page = Database["public"]["Tables"]["pages"]["Row"];

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState("pages");
  const [newPageSlug, setNewPageSlug] = useState("");

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      if (session?.user) checkAdmin(session.user.id);
      setAuthLoading(false);
    });
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadPages();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedPageId) return;
    loadPageData(selectedPageId);
  }, [selectedPageId]);

  const loadPages = async () => {
    const { data } = await supabase.from("pages").select("*").order("created_at");
    if (data) {
      setPages(data);
      // Auto-select first page if none selected
      if (!selectedPageId && data.length > 0) {
        setSelectedPageId(data[0].id);
      }
    }
  };

  const loadPageData = async (pageId: string) => {
    const [settingsRes, colorsRes] = await Promise.all([
      supabase.from("site_settings").select("*").eq("page_id", pageId).limit(1).single(),
      supabase.from("product_colors").select("*").eq("page_id", pageId).order("sort_order"),
    ]);
    if (settingsRes.data) setSettings(settingsRes.data);
    else setSettings(null);
    if (colorsRes.data) setColors(colorsRes.data);
    else setColors([]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: "admin@nusuborka.com", password });
    if (error) setAuthError("ভুল পাসওয়ার্ড!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, updated_at, ...rest } = settings;
    await supabase.from("site_settings").update(rest).eq("id", id);
    invalidateSiteSettingsCache();
    setSaveMsg("সেভ হয়েছে! ✅");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const saveColor = async (color: ProductColor) => {
    await supabase.from("product_colors").update({
      name: color.name,
      image_url: color.image_url,
      sort_order: color.sort_order,
      is_active: color.is_active,
      product_price: color.product_price,
      original_price: color.original_price,
    }).eq("id", color.id);
    invalidateProductColorsCache();
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const filePath = `${path}/${Date.now()}.${ext}`;
    await supabase.storage.from("product-images").upload(filePath, file);
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const createPage = async () => {
    if (!newPageSlug.trim()) return;
    const slug = newPageSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    
    // Create page
    const { data: page, error } = await supabase.from("pages").insert({ slug }).select().single();
    if (error || !page) {
      setSaveMsg("এই slug আগে থেকে আছে!");
      setTimeout(() => setSaveMsg(""), 2000);
      return;
    }

    // Find main page to copy data from
    const mainPage = pages.find((p) => p.slug === "main");
    
    if (mainPage) {
      // Copy settings from main page
      const { data: mainSettings } = await supabase
        .from("site_settings")
        .select("*")
        .eq("page_id", mainPage.id)
        .single();

      if (mainSettings) {
        const { id, page_id, updated_at, ...settingsData } = mainSettings;
        await supabase.from("site_settings").insert({ ...settingsData, page_id: page.id });
      } else {
        await supabase.from("site_settings").insert({ page_id: page.id });
      }

      // Copy colors from main page
      const { data: mainColors } = await supabase
        .from("product_colors")
        .select("*")
        .eq("page_id", mainPage.id)
        .order("sort_order");

      if (mainColors && mainColors.length > 0) {
        const colorInserts = mainColors.map(({ id, created_at, page_id, ...c }) => ({
          ...c,
          page_id: page.id,
        }));
        await supabase.from("product_colors").insert(colorInserts);
      }

      // Copy images from main page
      const { data: mainImages } = await supabase
        .from("product_images")
        .select("*")
        .eq("page_id", mainPage.id)
        .order("sort_order");

      if (mainImages && mainImages.length > 0) {
        const imageInserts = mainImages.map(({ id, created_at, page_id, ...img }) => ({
          ...img,
          page_id: page.id,
        }));
        await supabase.from("product_images").insert(imageInserts);
      }
    } else {
      await supabase.from("site_settings").insert({ page_id: page.id });
    }

    setPages([...pages, page]);
    setSelectedPageId(page.id);
    setNewPageSlug("");
    setActiveTab("general");
    setSaveMsg("নতুন পেজ তৈরি হয়েছে! ✅");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const deletePage = async (pageId: string) => {
    if (!confirm("এই পেজ এবং এর সব ডাটা মুছে যাবে। আপনি কি নিশ্চিত?")) return;
    await supabase.from("pages").delete().eq("id", pageId);
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (selectedPageId === pageId) {
      setSelectedPageId(remaining.length > 0 ? remaining[0].id : null);
      setSettings(null);
      setColors([]);
    }
    invalidateSiteSettingsCache();
    invalidateProductColorsCache();
    setSaveMsg("পেজ ডিলিট হয়েছে!");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
          <h1 className="text-center text-2xl font-bold text-foreground">🔒 Admin Login</h1>
          {authError && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{authError}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="পাসওয়ার্ড দিন"
            required
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button type="submit" className="w-full rounded-lg bg-primary py-2.5 font-bold text-primary-foreground">
            Login
          </button>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-lg font-semibold text-destructive">আপনার Admin অ্যাক্সেস নেই।</p>
        <button onClick={handleLogout} className="rounded-lg bg-muted px-4 py-2 text-foreground">Logout</button>
      </div>
    );
  }

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  const tabs = [
    { id: "pages", label: "📄 পেজ" },
    { id: "general", label: "🏪 সাধারণ" },
    { id: "pricing", label: "💰 মূল্য" },
    { id: "timer", label: "⏰ টাইমার" },
    { id: "rating", label: "⭐ রেটিং" },
    { id: "colors", label: "🎨 কালার/ইমেজ" },
    { id: "sizes", label: "📏 সাইজ" },
    { id: "content", label: "📝 কন্টেন্ট" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <h1 className="text-lg font-bold text-foreground">🛠️ Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            {saveMsg && <span className="text-sm font-semibold text-primary">{saveMsg}</span>}
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <button onClick={handleLogout} className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              Logout
            </button>
          </div>
        </div>
        {/* Page selector */}
        {selectedPage && activeTab !== "pages" && (
          <div className="mx-auto max-w-4xl border-t border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">পেজ:</span>
              <select
                value={selectedPageId || ""}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.slug} {p.slug === "main" ? "(মেইন)" : ""}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                URL: /{selectedPage.slug === "main" ? "" : selectedPage.slug}
              </span>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-4xl px-4 py-4">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pages Management */}
        {activeTab === "pages" && (
          <Section title="পেজ ম্যানেজমেন্ট">
            <p className="text-sm text-muted-foreground">এখান থেকে নতুন ল্যান্ডিং পেজ তৈরি করুন। প্রতিটি পেজের নিজস্ব URL, প্রোডাক্ট, প্রাইস এবং সেটিংস থাকবে।</p>
            
            {/* Create new page */}
            <div className="flex gap-2">
              <input
                value={newPageSlug}
                onChange={(e) => setNewPageSlug(e.target.value)}
                placeholder="পেজ URL দিন (e.g. test01)"
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                onClick={createPage}
                className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground"
              >
                + তৈরি করুন
              </button>
            </div>

            {/* Page list */}
            <div className="space-y-3">
              {pages.map((page) => (
                <div key={page.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <p className="font-semibold text-foreground">/{page.slug}</p>
                    <p className="text-xs text-muted-foreground">
                      {page.slug === "main" ? "মেইন পেজ (হোম)" : `domain.com/${page.slug}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedPageId(page.id);
                        setActiveTab("general");
                      }}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      ✏️ Edit
                    </button>
                    {page.slug !== "main" && (
                      <button
                        onClick={() => deletePage(page.id)}
                        className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* The rest of the tabs require a selected page with settings */}
        {activeTab !== "pages" && !settings && selectedPageId && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {activeTab !== "pages" && settings && (
          <>
            {/* General Settings */}
            {activeTab === "general" && (
              <Section title="সাধারণ সেটিংস">
                <Field label="স্টোরের নাম" value={settings.store_name} onChange={(v) => updateSetting("store_name", v)} />
                <Field label="WhatsApp নাম্বার" value={settings.whatsapp_number} onChange={(v) => updateSetting("whatsapp_number", v)} />
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">প্রোডাক্ট হিরো ইমেজ</label>
                  {settings.hero_image_url ? (
                    <img src={settings.hero_image_url} alt="Hero" className="h-40 w-full rounded-xl object-contain border border-border bg-muted/30" />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                      <span className="text-muted-foreground text-sm">কোনো হিরো ইমেজ আপলোড করা হয়নি</span>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
                    <span>📷</span>
                    <span>{settings.hero_image_url ? "ইমেজ পরিবর্তন করুন" : "হিরো ইমেজ আপলোড করুন"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadImage(file, "hero");
                        updateSetting("hero_image_url", url);
                      }}
                    />
                  </label>
                </div>
                <SaveButton onClick={saveSettings} saving={saving} />
              </Section>
            )}

            {/* Pricing */}
            {activeTab === "pricing" && (
              <Section title="মূল্য সেটিংস">
                <p className="text-sm text-muted-foreground">⚠️ প্রতিটি বোরকার আলাদা দাম "কালার" ট্যাব থেকে সেট করুন।</p>
                <Field label="ডিসকাউন্ট ব্যাজ" value={settings.discount_badge} onChange={(v) => updateSetting("discount_badge", v)} />
                <NumberField label="হিজাব মূল্য (৳)" value={settings.hijab_price} onChange={(v) => updateSetting("hijab_price", v)} />
                <NumberField label="ঢাকার ভিতরে ডেলিভারি (৳)" value={settings.delivery_inside} onChange={(v) => updateSetting("delivery_inside", v)} />
                <NumberField label="ঢাকার বাহিরে ডেলিভারি (৳)" value={settings.delivery_outside} onChange={(v) => updateSetting("delivery_outside", v)} />
                <SaveButton onClick={saveSettings} saving={saving} />
              </Section>
            )}

            {/* Timer */}
            {activeTab === "timer" && (
              <Section title="টাইমার সেটিংস">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3 mb-4">
                  <span className="text-sm font-semibold text-foreground">টাইমার চালু/বন্ধ</span>
                  <button
                    type="button"
                    onClick={() => updateSetting("timer_enabled", !settings.timer_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.timer_enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.timer_enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {settings.timer_enabled && (
                  <>
                    <Field label="টাইমার লেবেল" value={settings.timer_label} onChange={(v) => updateSetting("timer_label", v)} />
                    <NumberField label="ঘণ্টা" value={settings.timer_hours} onChange={(v) => updateSetting("timer_hours", v)} />
                    <NumberField label="মিনিট" value={settings.timer_minutes} onChange={(v) => updateSetting("timer_minutes", v)} />
                    <NumberField label="সেকেন্ড" value={settings.timer_seconds} onChange={(v) => updateSetting("timer_seconds", v)} />
                  </>
                )}
                <SaveButton onClick={saveSettings} saving={saving} />
              </Section>
            )}

            {/* Rating */}
            {activeTab === "rating" && (
              <Section title="রেটিং সেটিংস">
                <NumberField label="স্টার সংখ্যা (১-৫)" value={settings.rating_stars} onChange={(v) => updateSetting("rating_stars", v)} />
                <Field label="রেটিং টেক্সট" value={settings.rating_text} onChange={(v) => updateSetting("rating_text", v)} />
                <Field label="রিভিউ কাউন্ট টেক্সট" value={settings.review_count_text} onChange={(v) => updateSetting("review_count_text", v)} />
                <SaveButton onClick={saveSettings} saving={saving} />
              </Section>
            )}

            {/* Sizes */}
            {activeTab === "sizes" && (
              <Section title="সাইজ ম্যানেজমেন্ট">
                <p className="text-sm text-muted-foreground">প্রোডাক্টের জন্য যে সাইজগুলো দেখাবে সেগুলো এখানে যোগ/মুছুন।</p>
                <SizesManager
                  sizes={Array.isArray(settings.sizes) ? (settings.sizes as string[]) : ["50", "52", "54", "56"]}
                  onChange={(newSizes) => updateSetting("sizes", newSizes)}
                />
                <SaveButton onClick={saveSettings} saving={saving} />
              </Section>
            )}

            {/* Colors */}
            {activeTab === "colors" && (
              <Section title="কালার / ইমেজ ম্যানেজমেন্ট">
                <p className="text-sm text-muted-foreground">
                  কালারের নাম দিলে → হিরো গ্যালারি + কালার সিলেক্টর দুটোতেই দেখাবে।<br />
                  নাম খালি রাখলে → শুধু হিরো গ্যালারিতে দেখাবে, কালার অপশনে যাবে না।
                </p>
                <div className="space-y-4">
                  {colors.map((color, idx) => (
                    <div key={color.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex gap-4">
                        <div className="shrink-0">
                          {color.image_url ? (
                            <img src={color.image_url} alt={color.name} className="h-24 w-24 rounded-xl object-cover border border-border shadow-sm" />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50">
                              <span className="text-3xl opacity-40">🖼️</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            value={color.name}
                            onChange={(e) => {
                              const updated = [...colors];
                              updated[idx] = { ...color, name: e.target.value };
                              setColors(updated);
                            }}
                            placeholder="খালি রাখলে শুধু গ্যালারিতে দেখাবে"
                            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-semibold text-foreground"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground">ক্রম:</label>
                            <input
                              type="number"
                              value={color.sort_order}
                              onChange={(e) => {
                                const updated = [...colors];
                                updated[idx] = { ...color, sort_order: Number(e.target.value) };
                                setColors(updated);
                              }}
                              className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground"
                            />
                            <label className="flex items-center gap-1 text-sm text-foreground">
                              <input
                                type="checkbox"
                                checked={color.is_active}
                                onChange={(e) => {
                                  const updated = [...colors];
                                  updated[idx] = { ...color, is_active: e.target.checked };
                                  setColors(updated);
                                }}
                                className="accent-primary"
                              />
                              Active
                            </label>
                          </div>
                          {!color.image_url && (
                            <p className="text-xs text-destructive font-medium">⚠️ ইমেজ আপলোড করুন</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs text-muted-foreground">বিক্রয় মূল্য (৳)</label>
                          <input
                            type="number"
                            value={color.product_price}
                            onChange={(e) => {
                              const updated = [...colors];
                              updated[idx] = { ...color, product_price: Number(e.target.value) };
                              setColors(updated);
                            }}
                            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-bold text-primary"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-xs text-muted-foreground">আসল মূল্য (৳)</label>
                          <input
                            type="number"
                            value={color.original_price}
                            onChange={(e) => {
                              const updated = [...colors];
                              updated[idx] = { ...color, original_price: Number(e.target.value) };
                              setColors(updated);
                            }}
                            className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground line-through"
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
                        <span>📷</span>
                        <span>{color.image_url ? "ইমেজ পরিবর্তন করুন" : "ইমেজ আপলোড করুন"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await uploadImage(file, "colors");
                            const updated = [...colors];
                            updated[idx] = { ...color, image_url: url };
                            setColors(updated);
                          }}
                        />
                      </label>

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await saveColor(colors[idx]);
                            setSaveMsg("কালার সেভ হয়েছে! ✅");
                            setTimeout(() => setSaveMsg(""), 2000);
                          }}
                          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                        >
                          💾 সেভ করুন
                        </button>
                        <button
                          onClick={async () => {
                            await supabase.from("product_colors").delete().eq("id", color.id);
                            setColors(colors.filter((c) => c.id !== color.id));
                            invalidateProductColorsCache();
                            setSaveMsg("কালার ডিলিট হয়েছে!");
                            setTimeout(() => setSaveMsg(""), 2000);
                          }}
                          className="rounded-lg bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const { data } = await supabase
                      .from("product_colors")
                      .insert({ name: "", sort_order: colors.length + 1, page_id: selectedPageId! })
                      .select()
                      .single();
                    if (data) {
                      setColors([...colors, data]);
                      invalidateProductColorsCache();
                    }
                  }}
                  className="mt-4 rounded-lg border-2 border-dashed border-primary/40 px-4 py-2 text-sm font-semibold text-primary"
                >
                  + নতুন কালার/ইমেজ যোগ করুন
                </button>
              </Section>
            )}

            {/* Content */}
            {activeTab === "content" && (
              <Section title="বোরকা ডিটেইলস কন্টেন্ট">
                <BorkaDetailsEditor
                  value={settings.borka_details_json as unknown as BorkaDetail[]}
                  onChange={(v) => updateSetting("borka_details_json", v as unknown as Database["public"]["Tables"]["site_settings"]["Row"]["borka_details_json"])}
                />
                <SaveButton onClick={saveSettings} saving={saving} />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Sub-components

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="rounded-lg bg-primary px-6 py-2.5 font-bold text-primary-foreground disabled:opacity-50"
    >
      {saving ? "সেভ হচ্ছে..." : "💾 সেভ করুন"}
    </button>
  );
}

function SizesManager({ sizes, onChange }: { sizes: string[]; onChange: (sizes: string[]) => void }) {
  const [newSize, setNewSize] = useState("");
  const addSize = () => {
    const trimmed = newSize.trim();
    if (!trimmed || sizes.includes(trimmed)) return;
    onChange([...sizes, trimmed]);
    setNewSize("");
  };
  const removeSize = (idx: number) => {
    onChange(sizes.filter((_, i) => i !== idx));
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sizes.map((size, idx) => (
          <div key={idx} className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
            <span className="text-sm font-semibold text-foreground">{size}</span>
            <button type="button" onClick={() => removeSize(idx)} className="ml-1 text-destructive hover:text-destructive/80 text-lg leading-none">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
          placeholder="নতুন সাইজ লিখুন (e.g. 58)"
          className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button type="button" onClick={addSize} className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground">+ যোগ করুন</button>
      </div>
    </div>
  );
}

function ProductImagesManager({ uploadImage, setSaveMsg, pageId }: { uploadImage: (file: File, path: string) => Promise<string>; setSaveMsg: (msg: string) => void; pageId: string }) {
  const [images, setImages] = useState<Database["public"]["Tables"]["product_images"]["Row"][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("product_images").select("*").eq("page_id", pageId).order("sort_order").then(({ data }) => {
      setImages(data || []);
      setLoading(false);
    });
  }, [pageId]);

  const saveImage = async (img: Database["public"]["Tables"]["product_images"]["Row"]) => {
    await supabase.from("product_images").update({
      image_url: img.image_url,
      sort_order: img.sort_order,
      is_active: img.is_active,
    }).eq("id", img.id);
    setSaveMsg("ইমেজ সেভ হয়েছে! ✅");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const deleteImage = async (id: string) => {
    await supabase.from("product_images").delete().eq("id", id);
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSaveMsg("ইমেজ ডিলিট হয়েছে!");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  if (loading) return <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, idx) => (
          <div key={img.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            {img.image_url ? (
              <img src={img.image_url} alt="" className="h-32 w-full rounded-lg object-cover" />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50">
                <span className="text-3xl opacity-40">🖼️</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={img.sort_order}
                onChange={(e) => {
                  const updated = [...images];
                  updated[idx] = { ...img, sort_order: Number(e.target.value) };
                  setImages(updated);
                }}
                className="w-14 rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
                placeholder="#"
              />
              <label className="flex items-center gap-1 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={img.is_active}
                  onChange={(e) => {
                    const updated = [...images];
                    updated[idx] = { ...img, is_active: e.target.checked };
                    setImages(updated);
                  }}
                  className="accent-primary"
                />
                Active
              </label>
            </div>
            <label className="flex cursor-pointer items-center gap-1 rounded border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5 text-xs font-medium text-primary">
              <span>📷</span>
              <span>{img.image_url ? "পরিবর্তন" : "আপলোড"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImage(file, "gallery");
                  const updated = [...images];
                  updated[idx] = { ...img, image_url: url };
                  setImages(updated);
                }}
              />
            </label>
            <div className="flex gap-2">
              <button onClick={() => saveImage(images[idx])} className="flex-1 rounded bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                💾 সেভ
              </button>
              <button onClick={() => deleteImage(img.id)} className="rounded bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={async () => {
          const { data } = await supabase
            .from("product_images")
            .insert({ sort_order: images.length + 1, page_id: pageId })
            .select()
            .single();
          if (data) setImages([...images, data]);
        }}
        className="w-full rounded-lg border-2 border-dashed border-primary/40 px-4 py-3 text-sm font-semibold text-primary"
      >
        + নতুন ইমেজ যোগ করুন
      </button>
    </div>
  );
}

interface BorkaDetail {
  icon: string;
  title: string;
  lines: string[];
}

function BorkaDetailsEditor({ value, onChange }: { value: BorkaDetail[]; onChange: (v: BorkaDetail[]) => void }) {
  const details = Array.isArray(value) ? value : [];

  const updateDetail = (idx: number, field: keyof BorkaDetail, val: string | string[]) => {
    const updated = [...details];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {details.map((detail, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={detail.icon}
              onChange={(e) => updateDetail(idx, "icon", e.target.value)}
              className="w-16 rounded-lg border border-input bg-background px-2 py-1.5 text-center text-foreground"
              placeholder="Icon"
            />
            <input
              value={detail.title}
              onChange={(e) => updateDetail(idx, "title", e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-foreground"
              placeholder="Title"
            />
          </div>
          <textarea
            value={detail.lines.join("\n")}
            onChange={(e) => updateDetail(idx, "lines", e.target.value.split("\n"))}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            placeholder="প্রতি লাইনে একটি করে তথ্য"
          />
        </div>
      ))}
      <button
        onClick={() => onChange([...details, { icon: "📌", title: "নতুন সেকশন", lines: ["তথ্য যোগ করুন"] }])}
        className="rounded-lg border-2 border-dashed border-primary/40 px-4 py-2 text-sm font-semibold text-primary"
      >
        + নতুন সেকশন যোগ করুন
      </button>
    </div>
  );
}
