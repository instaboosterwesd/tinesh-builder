import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderOpen, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingPanel, HackerLoader } from "@/components/effects/HackerLoader";
import { adminListTemplates, adminUploadTemplateImage } from "@/lib/builder.functions";
import { adminDeleteCategory, adminListCategories, adminSaveCategory, type Category, type CategoryCard } from "@/lib/categories.functions";

const err = (e: unknown) => toast.error((e as Error).message || "Something went wrong");

export function CategoriesTab({ pw }: { pw: string }) {
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["adm", "categories"], queryFn: () => adminListCategories({ data: { password: pw } }) });
  const tpls = useQuery({ queryKey: ["adm", "templates"], queryFn: () => adminListTemplates({ data: { password: pw } }) });
  const [edit, setEdit] = useState<Partial<Category> | null>(null);
  const names = new Map((tpls.data ?? []).map((t) => [t.id, t.name]));
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Group templates, or add your own link cards. Categories show on the home page.</p>
        <Button variant="hero" onClick={() => setEdit({ name: "", order: (cats.data?.length ?? 0) + 1, template_ids: [], cards: [] })}><Plus className="size-4" /> New category</Button>
      </div>
      {cats.isLoading && <LoadingPanel />}
      {cats.data?.length === 0 && <div className="surface mt-3 p-8 text-center text-sm text-muted-foreground">No categories yet.</div>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.data?.map((c) => (
          <div key={c.id} className="surface space-y-2 p-4">
            <div className="flex items-center gap-2"><FolderOpen className="size-4 text-primary" /><b className="truncate">{c.name}</b></div>
            <p className="text-xs text-muted-foreground">{c.template_ids.length} templates · {c.cards.length} cards</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{c.template_ids.map((id) => names.get(id)).filter(Boolean).join(", ")}</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEdit(c)}><Pencil className="size-4" /> Edit</Button>
              <Button size="icon" variant="ghost" aria-label={`Delete ${c.name}`} onClick={async () => {
                if (!confirm(`Delete ${c.name}?`)) return;
                try { await adminDeleteCategory({ data: { password: pw, id: c.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["adm", "categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); } catch (e) { err(e); }
              }}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
      {edit && <CategoryDialog pw={pw} c={edit} templates={(tpls.data ?? []).map((t) => ({ id: t.id, name: t.name, image: t.image }))} onClose={() => setEdit(null)} />}
    </>
  );
}

const emptyCard = (): CategoryCard => ({ id: crypto.randomUUID(), name: "", image: "", link: "", button: "Buy Now" });

function CategoryDialog({ pw, c, templates, onClose }: {
  pw: string; c: Partial<Category>; templates: { id: string; name: string; image: string | null }[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(c.name ?? "");
  const [order, setOrder] = useState(String(c.order ?? 0));
  const [ids, setIds] = useState<string[]>(c.template_ids ?? []);
  const [cards, setCards] = useState<CategoryCard[]>(c.cards ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const toggle = (id: string) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const setCard = (id: string, patch: Partial<CategoryCard>) => setCards((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const upload = async (id: string, file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Image must be under 3 MB"); return; }
    setUploading(id);
    try {
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
      const { url } = await adminUploadTemplateImage({ data: { password: pw, filename: file.name, image: dataUrl } });
      setCard(id, { image: url });
    } catch (e) { err(e); }
    setUploading(null);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{c.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          if (uploading) { toast.error("Wait for the image to finish uploading"); return; }
          setBusy(true);
          try {
            await adminSaveCategory({ data: { password: pw, id: c.id, name, order: Number(order) || 0, template_ids: ids, cards } });
            toast.success("Category saved");
            qc.invalidateQueries({ queryKey: ["adm", "categories"] }); qc.invalidateQueries({ queryKey: ["categories"] }); onClose();
          } catch (x) { err(x); }
          setBusy(false);
        }}>
          <div className="flex gap-2">
            <Input aria-label="Category name" placeholder="Category name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            <Input aria-label="Position" type="number" min={0} className="w-28" placeholder="Position" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          <section className="space-y-2">
            <p className="text-sm font-semibold">Templates in this category ({ids.length})</p>
            {templates.length === 0 && <p className="text-xs text-muted-foreground">No templates yet.</p>}
            <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {templates.map((t) => (
                <label key={t.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm ${ids.includes(t.id) ? "border-primary bg-accent" : "border-input"}`}>
                  <input type="checkbox" checked={ids.includes(t.id)} onChange={() => toggle(t.id)} />
                  {t.image && <img src={t.image} alt="" className="size-8 rounded-lg object-cover" />}
                  <span className="truncate">{t.name}</span>
                </label>
              ))}
            </div>
          </section>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Link cards ({cards.length})</p>
              <Button type="button" size="sm" variant="outline" onClick={() => setCards((s) => [...s, emptyCard()])}><Plus className="size-4" /> Add card</Button>
            </div>
            {cards.map((k) => (
              <div key={k.id} className="surface space-y-2 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-input bg-muted/40">
                    {k.image ? <img src={k.image} alt="" className="h-full w-full object-cover" /> : <Upload className="size-5 text-muted-foreground" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Input aria-label="Card name" placeholder="Card name" required maxLength={100} value={k.name} onChange={(e) => setCard(k.id, { name: e.target.value })} />
                    <Button type="button" variant="outline" size="sm" asChild disabled={uploading === k.id}>
                      <label className="cursor-pointer">
                        <Upload className="size-4" /> {uploading === k.id ? "Uploading…" : k.image ? "Change photo" : "Upload photo"}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { upload(k.id, e.target.files?.[0]); e.target.value = ""; }} />
                      </label>
                    </Button>
                  </div>
                  <Button type="button" size="icon" variant="ghost" aria-label="Remove card" onClick={() => setCards((s) => s.filter((x) => x.id !== k.id))}><X className="size-4" /></Button>
                </div>
                <div className="flex gap-2">
                  <Input aria-label="Card link" type="url" placeholder="https://link" required value={k.link} onChange={(e) => setCard(k.id, { link: e.target.value })} />
                  <Input aria-label="Button name" placeholder="Buy Now" maxLength={30} className="w-36" value={k.button} onChange={(e) => setCard(k.id, { button: e.target.value })} />
                </div>
              </div>
            ))}
          </section>
          <Button variant="hero" className="w-full" disabled={busy}>{busy ? <HackerLoader compact label="Saving category" /> : "Save category"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
