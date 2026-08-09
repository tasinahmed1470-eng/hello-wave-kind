import { useSiteSettings } from "@/hooks/useSiteSettings";

interface BorkaDetail {
  icon: string;
  title: string;
  lines: string[];
}

export default function Features({ pageId }: { pageId?: string }) {
  const { settings } = useSiteSettings(pageId);
  const details = (Array.isArray(settings.borka_details_json) ? settings.borka_details_json : []) as unknown as BorkaDetail[];

  return (
    <section id="features-section" className="mx-auto mt-6 max-w-3xl px-4">
      <h2 className="relative mb-5 text-center text-2xl font-bold text-foreground">
        <span className="relative inline-block">
          আমাদের বোরকার বৈশিষ্ট্য
          <span className="absolute -bottom-1 left-0 h-[10px] w-full -z-10 origin-left bg-primary/20 rounded-sm animate-[highlight-draw_1.2s_ease-out_0.5s_both]" />
        </span>
      </h2>

      <div className="space-y-4">
        {details.map((detail, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">{detail.icon}</span>
              <h3 className="text-lg font-bold text-foreground">{detail.title}</h3>
            </div>
            <div className="space-y-1.5 text-sm leading-relaxed text-foreground">
              {detail.lines.map((line, i) => (
                <p key={i} className={line.startsWith(">") ? "text-muted-foreground pl-3 border-l-2 border-primary/20" : ""}>
                  {line.startsWith(">") ? line.slice(1).trim() : line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
