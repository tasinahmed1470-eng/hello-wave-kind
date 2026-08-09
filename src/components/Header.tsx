import logoImg from "@/assets/logo.jpg";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Header({ pageId }: { pageId?: string }) {
  const { settings } = useSiteSettings(pageId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-md shadow-[var(--shadow-card)]">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-center gap-2.5 px-4">
        <img
          src={logoImg}
          alt={settings.store_name}
          className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20"
          width={40}
          height={40}
        />
        <a href="#" onClick={handleClick} className="text-xl font-bold tracking-wide text-foreground">
          {settings.store_name}
        </a>
      </div>
    </header>
  );
}
