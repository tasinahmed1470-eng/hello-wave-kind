import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function WhatsAppButton({ pageId }: { pageId?: string }) {
  const { settings } = useSiteSettings(pageId);

  return (
    <a
      href={`https://wa.me/${settings.whatsapp_number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 animate-[float_3s_ease-in-out_infinite]"
      aria-label="WhatsApp"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-8 w-8 fill-white">
        <path d="M16.004 0C7.165 0 .002 7.163.002 16c0 2.825.737 5.574 2.138 8.005L0 32l8.188-2.148A15.94 15.94 0 0 0 16.004 32C24.837 32 32 24.837 32 16S24.837 0 16.004 0zm0 29.12a13.08 13.08 0 0 1-6.67-1.825l-.478-.284-4.96 1.3 1.326-4.843-.312-.496A13.04 13.04 0 0 1 2.88 16c0-7.24 5.884-13.12 13.124-13.12S29.12 8.76 29.12 16s-5.876 13.12-13.116 13.12zm7.196-9.828c-.392-.2-2.332-1.152-2.696-1.284-.364-.132-.628-.2-.892.2-.264.392-1.024 1.284-1.256 1.548-.232.264-.464.296-.856.1-.392-.2-1.656-.612-3.156-1.948-1.164-1.04-1.952-2.324-2.18-2.716-.232-.392-.024-.604.172-.8.18-.18.392-.464.592-.696.196-.232.264-.396.396-.66.132-.264.068-.496-.032-.696-.1-.2-.892-2.148-1.22-2.94-.324-.776-.652-.672-.892-.684l-.76-.012c-.264 0-.692.1-1.056.496-.364.392-1.388 1.356-1.388 3.308s1.42 3.836 1.62 4.1c.2.264 2.796 4.268 6.776 5.984.948.408 1.688.652 2.264.836.952.3 1.82.26 2.504.156.764-.116 2.332-.952 2.664-1.872.332-.92.332-1.712.232-1.872-.1-.164-.364-.264-.76-.46z" />
      </svg>
    </a>
  );
}
