import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, Trash2, Upload, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LoadingPanel, HackerLoader } from "@/components/effects/HackerLoader";
import { adminListTemplates } from "@/lib/builder.functions";
import { adminListCategories } from "@/lib/categories.functions";
import { adminGetAudio, adminSaveAudio, type AudioConfig } from "@/lib/audio.functions";
import { uploadVideo } from "@/lib/cloudinary";
import { soundKey } from "@/lib/sound-queue";

const err = (e: unknown) => toast.error((e as Error).message || "Something went wrong");

type Slot = { key: string; label: string };

const BASIC: { title: string; slots: Slot[] }[] = [
  {
    title: "Bottom menu",
    slots: [
      { key: soundKey("nav", "home"), label: "Home" },
      { key: soundKey("nav", "wallet"), label: "Wallet" },
      { key: soundKey("nav", "orders"), label: "Orders" },
      { key: soundKey("nav", "leaderboard"), label: "Leaders" },
      { key: soundKey("nav", "profile"), label: "Profile" },
    ],
  },
  {
    title: "Buttons",
    slots: [
      { key: soundKey("act", "add_balance"), label: "Add balance" },
      { key: soundKey("act", "paid"), label: "I have paid" },
      { key: soundKey("act", "build"), label: "Build this app" },
      { key: soundKey("act", "build_submit"), label: "Final Build button" },
    ],
  },
];

export function AudioTab({ pw }: { pw: string }) {
  const qc = useQueryClient();
  const audio = useQuery({ queryKey: ["adm", "audio"], queryFn: () => adminGetAudio({ data: { password: pw } }) });
  const cats = useQuery({ queryKey: ["adm", "categories"], queryFn: () => adminListCategories({ data: { password: pw } }) });
  const tpls = useQuery({ queryKey: ["adm", "templates"], queryFn: () => adminListTemplates({ data: { password: pw } }) });

  const save = async (patch: { enabled?: boolean; key?: string; url?: string | null }) => {
    const next = await adminSaveAudio({ data: { password: pw, ...patch } });
    qc.setQueryData(["adm", "audio"], next);
    qc.invalidateQueries({ queryKey: ["audio-config"] });
  };

  if (audio.isLoading || !audio.data) return <LoadingPanel />;
  const cfg = audio.data;
  const allTpls = tpls.data ?? [];

  return (
    <div className="space-y-4">
      <div className="surface flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold">Click sounds</p>
          <p className="text-sm text-muted-foreground">Turn all sounds on or off. Buttons without a sound stay silent.</p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={(v) => save({ enabled: v }).then(() => toast.success(v ? "Sounds on" : "Sounds off")).catch(err)} />
      </div>

      {BASIC.map((g) => <Group key={g.title} title={g.title} slots={g.slots} cfg={cfg} save={save} />)}

      {cats.isLoading && <LoadingPanel />}
      {cats.data?.map((c) => {
        const inside = c.all_templates ? allTpls : allTpls.filter((t) => c.template_ids.includes(t.id));
        const slots: Slot[] = [
          { key: soundKey("cat", c.id), label: `Open "${c.name}"` },
          ...inside.map((t) => ({ key: soundKey("tpl", t.id), label: t.name })),
          ...c.cards.map((k) => ({ key: soundKey("card", k.id), label: `${k.name} — ${k.button || "Buy Now"}` })),
        ];
        return <Group key={c.id} title={`Category: ${c.name}`} slots={slots} cfg={cfg} save={save} />;
      })}
    </div>
  );
}

function Group({ title, slots, cfg, save }: { title: string; slots: Slot[]; cfg: AudioConfig; save: (p: { key: string; url: string | null }) => Promise<void> }) {
  return (
    <section className="surface p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold"><Music className="size-4 text-primary" /> {title}</h3>
      <div className="divide-y divide-border">
        {slots.map((s) => <Row key={s.key} slot={s} url={cfg.sounds[s.key]} save={save} />)}
      </div>
    </section>
  );
}

function Row({ slot, url, save }: { slot: Slot; url?: string | undefined; save: (p: { key: string; url: string | null }) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { err(e); } setBusy(false); };
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{slot.label}</p>
        <p className="text-xs text-muted-foreground">{url ? "Sound added" : "No sound"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <input ref={input} type="file" accept="audio/*" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > 5 * 1024 * 1024) { toast.error("Sound must be under 5 MB"); return; }
          run(async () => { const u = await uploadVideo(f); await save({ key: slot.key, url: u }); toast.success("Sound saved"); });
        }} />
        {busy ? <HackerLoader compact /> : (
          <>
            {url && <Button size="icon" variant="outline" aria-label="Play" onClick={() => new Audio(url).play().catch(err)}><Play className="size-4" /></Button>}
            <Button size="sm" variant="outline" onClick={() => input.current?.click()}><Upload className="size-4" /> {url ? "Change" : "Upload"}</Button>
            {url && <Button size="icon" variant="outline" aria-label="Remove" onClick={() => run(async () => { await save({ key: slot.key, url: null }); toast.success("Sound removed"); })}><Trash2 className="size-4" /></Button>}
          </>
        )}
      </div>
    </div>
  );
}
