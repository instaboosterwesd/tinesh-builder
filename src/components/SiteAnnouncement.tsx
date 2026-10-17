import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { visibleAnnouncement } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";

export function SiteAnnouncement() {
  const { data } = useSiteSettings();
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!data || !visibleAnnouncement(data)) return null;
  const revision = JSON.stringify([data.announcement_title, data.announcement_message]);
  if (dismissed === revision) return null;
  return (
    <aside aria-label="Website announcement" className="border-b border-primary/25 glass-panel text-foreground">
      <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-4">
        <Megaphone className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 break-words">
          {data.announcement_title && <h2 className="font-semibold">{data.announcement_title}</h2>}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.announcement_message}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Dismiss announcement" className="size-8 shrink-0" onClick={() => setDismissed(revision)}><X className="size-4" /></Button>
      </div>
    </aside>
  );
}