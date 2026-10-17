import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Hammer, Image as ImageIcon, Lock, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdminTemplates } from "@/lib/admin-queries";
import { adminBuild, adminBuildStatus, adminEncrypt, createLogoUploadUrl } from "@/lib/builder.functions";
import { getAdminPass } from "@/lib/admin-session";
import { baseApkLabel } from "@/lib/base-apks";
import { matchesProduct, productId } from "@/lib/product-id";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/build")({ component: BuildPage });

function BuildPage() {
  const { data: templates, isLoading } = useAdminTemplates();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [buildId, setBuildId] = useState<string | null>(null);
  const list = (templates ?? []).filter((t) => matchesProduct(t, q));
  const tpl = templates?.find((t) => t.id === selected);

  if (buildId) return <Progress id={buildId} onReset={() => { setBuildId(null); setSelected(null); }} />;

  return (
    <div>
      <h1 className="text-2xl font-bold sm:text-3xl">Build APK</h1>
      <p className="mt-1 text-muted-foreground">Search a template by Product ID or name, fill details and build.</p>

      {!tpl ? (
        <>
          <div className="relative mt-5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product ID or template name" className="pl-9" autoFocus />
          </div>
          {isLoading ? (
            <p className="mt-6 text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="mt-6 text-muted-foreground">No template found.</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((t) => (
                <button key={t.id} onClick={() => setSelected(t.id)} className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:border-primary/40">
                  <div className="aspect-video bg-muted">
                    {t.image ? <img src={t.image} alt={t.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="size-7 text-muted-foreground" /></div>}
                  </div>
                  <div className="p-3">
                    <span className="font-mono text-xs text-primary">#{productId(t.id)}</span>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{baseApkLabel(t.base_apk)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <BuildForm templateId={tpl.id} name={tpl.name} pid={productId(tpl.id)} baseApk={tpl.base_apk} onBack={() => setSelected(null)} onStarted={setBuildId} />
      )}
    </div>
  );
}

function BuildForm({ templateId, name, pid, baseApk, onBack, onStarted }: { templateId: string; name: string; pid: string; baseApk: string; onBack: () => void; onStarted: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  const isTeacher = baseApk === "teacher";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      let logo_path: string | null = null;
      const logo = f.get("logo");
      if (logo instanceof File && logo.size > 0) {
        if (logo.size > 2 * 1024 * 1024) throw new Error("Logo must be under 2 MB");
        const { path, token } = await createLogoUploadUrl({ data: { filename: logo.name } });
        const { error } = await supabase.storage.from("media").uploadToSignedUrl(path, token, logo, { contentType: logo.type });
        if (error) throw new Error(error.message);
        logo_path = path;
      }
      const res = await adminBuild({
        data: {
          password: getAdminPass(),
          template_id: templateId,
          app_name: f.get("app"),
          package_name: f.get("pkg"),
          register_link: isTeacher ? "" : f.get("reg"),
          logo_path,
          app_id: isTeacher ? f.get("appid") : null,
        },
      });
      if (!res.github) toast.warning("Build not started", { description: res.log });
      else toast.success("Build started");
      onStarted(res.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div><span className="font-mono text-xs text-primary">#{pid}</span><p className="font-semibold">{name}</p></div>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>Change</Button>
      </div>
      <div className="space-y-1.5"><Label htmlFor="app">App name</Label><Input id="app" name="app" required maxLength={60} /></div>
      <div className="space-y-1.5"><Label htmlFor="pkg">Package name</Label><Input id="pkg" name="pkg" required placeholder="com.myshop.app" /></div>
      {!isTeacher && (
        <div className="space-y-1.5"><Label htmlFor="reg">Register link</Label><Input id="reg" name="reg" type="url" required maxLength={1000} placeholder="https://…" /></div>
      )}
      {isTeacher && (
        <div className="space-y-1.5">
          <Label htmlFor="appid">App ID</Label>
          <Input id="appid" name="appid" required maxLength={64} placeholder="dfx85eyz" pattern="[A-Za-z0-9_\-]+" />
          <p className="text-xs text-muted-foreground">Written into assets/slex.json inside the APK.</p>
        </div>
      )}
      <div className="space-y-1.5"><Label htmlFor="logo">Logo</Label><Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" required /></div>
      <Button type="submit" variant="hero" className="w-full" disabled={loading}><Hammer /> {loading ? "Starting…" : "Build APK"}</Button>
    </form>
  );
}

function Progress({ id, onReset }: { id: string; onReset: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "build", id],
    queryFn: () => adminBuildStatus({ data: { password: getAdminPass(), id } }),
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 3000;
      const done = ["success", "failed", "rejected"].includes(d.status);
      if (!done) return 3000;
      if (d.encrypt_status === "encrypting") return 3000;
      return false;
    },
  });
  const [encrypting, setEncrypting] = useState(false);
  const encStatus = data?.encrypt_status ?? null;
  const isEncrypting = encrypting || encStatus === "encrypting";
  const stage = stageFor(data?.status, encStatus);

  async function startEncrypt() {
    setEncrypting(true);
    try {
      const res = await adminEncrypt({ data: { password: getAdminPass(), id } });
      if (!res.github) toast.warning("Encryption not started", { description: res.encrypt_log });
      else toast.success("Encrypting APK…");
      await qc.invalidateQueries({ queryKey: ["admin", "build", id] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEncrypting(false);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-border bg-card p-6 text-center">
      <h1 className="text-xl font-bold">{data?.app_name ?? "Building…"}</h1>
      <div className="mt-3 flex justify-center">{data && <StatusBadge status={data.status} />}</div>
      <p className="mt-4 text-sm text-muted-foreground">{stage.label}</p>
      {data?.status === "failed" && <p className="mt-2 text-sm text-destructive">{data.build_log}</p>}
      {data?.download && (
        <Button asChild variant="hero" size="lg" className="mt-5 w-full"><a href={data.download}><Download /> Download APK</a></Button>
      )}

      {data?.status === "success" && data?.download && (
        <>
          {data.encrypted_download ? (
            <Button asChild variant="success" size="lg" className="mt-3 w-full">
              <a href={data.encrypted_download}><ShieldCheck /> Download Encrypted APK</a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-3 w-full"
              onClick={startEncrypt}
              disabled={isEncrypting}
            >
              <Lock /> {isEncrypting ? "Encrypting…" : "Encrypt this APK"}
            </Button>
          )}
          {encStatus === "encrypt_failed" && data.encrypt_log && (
            <p className="mt-2 text-sm text-destructive">{data.encrypt_log}</p>
          )}
        </>
      )}

      <Button variant="outline" className="mt-3 w-full" onClick={onReset}><RotateCcw /> Build another</Button>
    </div>
  );
}

function stageFor(status: string | undefined, enc: string | null): { label: string } {
  if (!status) return { label: "Starting…" };
  if (status === "pending") return { label: "Waiting for approval" };
  if (status === "approved") return { label: "Queued on GitHub runner" };
  if (status === "building") return { label: "Building APK on GitHub…" };
  if (status === "failed") return { label: "Build failed" };
  if (status === "rejected") return { label: "Build rejected" };
  if (status === "success") {
    if (enc === "encrypting") return { label: "Encrypting APK…" };
    if (enc === "encrypted") return { label: "Encrypted APK ready" };
    if (enc === "encrypt_failed") return { label: "Encryption failed" };
    return { label: "APK ready" };
  }
  return { label: status };
}
