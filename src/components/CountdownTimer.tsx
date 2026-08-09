import { useState, useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function CountdownTimer({ pageId }: { pageId?: string }) {
  const { settings } = useSiteSettings(pageId);
  const [time, setTime] = useState({ hours: settings.timer_hours, minutes: settings.timer_minutes, seconds: settings.timer_seconds });

  useEffect(() => {
    setTime({ hours: settings.timer_hours, minutes: settings.timer_minutes, seconds: settings.timer_seconds });
  }, [settings.timer_hours, settings.timer_minutes, settings.timer_seconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else if (minutes > 0) { minutes--; seconds = 59; }
        else if (hours > 0) { hours--; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!settings.timer_enabled) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="mx-auto mt-4 max-w-3xl px-4">
      <div className="flex items-center justify-center gap-3 rounded-xl px-4 py-2.5">
        <span className="text-sm font-bold text-destructive">⏰ {settings.timer_label}</span>
        <div className="flex items-center gap-1.5">
          {[
            { val: time.hours, label: "ঘণ্টা" },
            { val: time.minutes, label: "মিনিট" },
            { val: time.seconds, label: "সেকেন্ড" },
          ].map((t, i) => (
            <div key={i} className="rounded-lg bg-primary/10 px-2.5 py-1 text-center shadow-sm">
              <p className="text-base font-bold leading-tight text-foreground">{pad(t.val)}</p>
              <p className="text-[9px] leading-tight text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
