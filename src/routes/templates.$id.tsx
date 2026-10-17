import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Code2, Image as ImageIcon, PlayCircle, Copy, Hammer, Wallet, Upload, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, useWallet } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadLogo, getTemplate, userBuild } from "@/lib/builder.functions";
import { baseApkLabel, baseNeedsAppId } from "@/lib/base-apks";
import { productId } from "@/lib/product-id";
import { useAuth } from "@/hooks/useAuth";
import { HackerLoader, DetailSkeleton } from "@/components/effects/HackerLoader";
import { SmartImage } from "@/components/SmartImage";
import { splitRegisterLink } from "@/lib/universal-registration";

const templateQuery = (id: string) => queryOptions({ queryKey: ["template", id], queryFn: () => getTemplate({ data: { id } }) });

export const Route = createFileRoute("/templates/$id")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(templateQuery(params.id));
    if (!t) throw notFound();
    return { name: t.name, description: t.description };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — AppForge template` },
          { name: "description", content: loaderData.description || `Preview ${loaderData.name} and build your APK.` },
          { property: "og:title", content: `${loaderData.name} — AppForge template` },
          { property: "og:description", content: loaderData.description || `Preview ${loaderData.name} and build your APK.` },
          { property: "og:type", content: "website" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Template not found" }, { name: "robots", content: "noindex" }],
  }),
  pendingComponent: () => <AppShell><DetailSkeleton /></AppShell>,
  pendingMs: 200,
  component: TemplatePage,
});

function TemplatePage() {
  const { id } = Route.useParams();
  const { data: t } = useSuspenseQuery(templateQuery(id));
  const [open, setOpen] = useState(false);
  if (!t) return null;
  const hasPreview = t.show_preview && !!t.html;
  const defaultTab = t.video ? "video" : t.image ? "image" : "html";
  const hasMedia = !!(t.video || t.image || hasPreview);

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All templates
        </Link>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-10">
          {hasMedia ? (
            <Tabs defaultValue={defaultTab}>
              <TabsList>
                {t.video && <TabsTrigger value="video"><PlayCircle className="size-4" /> Video</TabsTrigger>}
                {t.image && <TabsTrigger value="image"><ImageIcon className="size-4" /> Photo</TabsTrigger>}
                {hasPreview && <TabsTrigger value="html"><Code2 className="size-4" /> Live preview</TabsTrigger>}
              </TabsList>
              {t.video && (
                <TabsContent value="video">
                  <video src={t.video} controls autoPlay muted loop className="aspect-video w-full rounded-2xl border border-border bg-card" />
                </TabsContent>
              )}
              {t.image && (
                <TabsContent value="image">
                  <SmartImage src={t.image} alt={t.name} lazy={false} className="aspect-video w-full rounded-2xl border border-border" />
                </TabsContent>
              )}
              {hasPreview && (
                <TabsContent value="html">
                  <iframe title="preview" srcDoc={t.html} sandbox="allow-scripts" className="h-[520px] w-full rounded-2xl border border-border bg-card sm:h-[640px]" />
                </TabsContent>
              )}
            </Tabs>
          ) : (
            <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-border"><ImageIcon className="size-10 text-muted-foreground" /></div>
          )}

          <aside className="surface order-first h-fit p-5 lg:order-none lg:sticky lg:top-24">
            <span className="text-xs font-medium uppercase tracking-wider text-primary">{baseApkLabel(t.base_apk)}</span>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t.description || "No description provided."}</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Product ID</p>
                <button onClick={() => { navigator.clipboard.writeText(productId(t.id)); toast.success("Copied"); }} className="flex items-center gap-1.5 font-mono font-bold">
                  {productId(t.id)} <Copy className="size-3.5" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-xl font-bold">{t.price > 0 ? `₹${t.price}` : "Free"}</p>
              </div>
            </div>
            <Button variant="hero" size="lg" className="mt-4 w-full" onClick={() => setOpen(true)}>
              <Hammer /> Build this app
            </Button>
          </aside>
        </div>
      </main>
      <BuildDialog open={open} onOpenChange={setOpen} template={{ id: t.id, name: t.name, base_apk: t.base_apk, price: t.price }} />
    </AppShell>
  );
}

type Step = "details" | "extra" | "logo";

function BuildDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (o: boolean) => void; template: { id: string; name: string; base_apk: string; price: number } }) {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("details");
  const [appName, setAppName] = useState("");
  const [extra, setExtra] = useState("");
  const [packageName, setPackageName] = useState("");
  const [deposit, setDeposit] = useState("");
  const [telegram, setTelegram] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const isTeacher = baseNeedsAppId(template.base_apk);
  let formattedLink: ReturnType<typeof splitRegisterLink> | undefined;
  try { if (extra && isTeacher) formattedLink = splitRegisterLink(extra); } catch { /* Keep typing; submission validates the link. */ }
  const balance = wallet?.balance ?? 0;
  const short = template.price > 0 && balance < template.price;

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) setTimeout(() => { setStep("details"); setLogo(null); }, 200);
  }

  async function build() {
    if (!logo) { toast.error("Choose a logo"); return; }
    setLoading(true);
    try {
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read logo"));
        reader.onerror = () => reject(new Error("Could not read logo"));
        reader.readAsDataURL(logo);
      });
      const { path } = await uploadLogo({ data: { filename: logo.name, image } });
      await userBuild({
        data: {
          template_id: template.id, app_name: appName, logo_path: path,
          package_name: isTeacher ? packageName : "", register_link: extra, deposit, telegram,
        },
      });
      toast.success(template.price > 0 ? `Build started — ₹${template.price} paid from wallet` : "Build started");
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["my-builds"] });
      close(false);
      navigate({ to: "/orders" });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("INSUFFICIENT_BALANCE")) toast.error("Not enough balance. Please add money to your wallet.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!loading) close(value); }}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build “{template.name}”</DialogTitle>
          <DialogDescription>
            {template.price > 0 ? `₹${template.price} will be paid from your wallet.` : "This template is free to build."}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Please log in to build your app.</p>
            <Button variant="hero" className="mt-4 w-full" onClick={() => navigate({ to: "/auth" })}>Login / Sign up</Button>
          </div>
        ) : short ? (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-center">
            <p className="text-sm font-medium">Your balance is ₹{balance}. You need ₹{template.price - balance} more.</p>
            <Button variant="hero" className="mt-3 w-full" onClick={() => navigate({ to: "/wallet" })}><Wallet className="size-4" /> Add balance</Button>
          </div>
        ) : (
          <>
            <Steps step={step} />
            {step === "details" && (
              <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); setStep("extra"); }}>
                <div className="space-y-1.5"><Label htmlFor="app">App name</Label><Input id="app" value={appName} onChange={(e) => setAppName(e.target.value)} required maxLength={60} placeholder="My App" /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="pkg">Package name</Label>
                  {isTeacher ? <Input id="pkg" value={packageName} onChange={(e) => setPackageName(e.target.value)} required maxLength={150} pattern="[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+" placeholder="com.example.myapp" className="font-mono" /> : <Input id="pkg" value="Auto-assigned on build" readOnly className="font-mono" />}
                </div>
                <Button type="submit" variant="hero">Next</Button>
              </form>
            )}
            {step === "extra" && (
              <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); setStep("logo"); }}>
                <div className="space-y-1.5"><Label htmlFor="extra">Register link</Label><Input id="extra" type="url" value={extra} onChange={(e) => setExtra(e.target.value)} required maxLength={1000} placeholder="https://…" /></div>
                {isTeacher && <>
                  <div className="space-y-1.5"><Label htmlFor="deposit">Deposit</Label><Input id="deposit" value={deposit} onChange={(e) => setDeposit(e.target.value)} maxLength={40} placeholder="100" /></div>
                  <div className="space-y-1.5"><Label htmlFor="telegram">Telegram</Label><Input id="telegram" type="url" value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={1000} placeholder="https://t.me/…" /></div>
                  {formattedLink && <dl className="grid gap-1 text-xs text-muted-foreground"><dt>Domain</dt><dd className="break-all font-mono">{formattedLink.domain}</dd><dt>Invite code</dt><dd className="break-all font-mono">{formattedLink.invitecode || "—"}</dd></dl>}
                </>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("details")}>Back</Button>
                  <Button type="submit" variant="hero" className="flex-1">Next</Button>
                </div>
              </form>
            )}
            {step === "logo" && (
              <div className="grid gap-3">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground hover:border-primary/60">
                  {logo ? <img src={URL.createObjectURL(logo)} alt="" className="size-20 rounded-2xl object-cover" /> : <Upload className="size-7" />}
                  <span>{logo ? logo.name : "Tap to choose your logo (PNG, JPG, WEBP)"}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
                </label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("extra")}>Back</Button>
                  <Button variant="hero" className="flex-1" disabled={loading || !logo} onClick={build}>
                    {loading ? <HackerLoader compact label="Building your app" /> : <><Hammer className="size-4" />{isTeacher ? (template.price > 0 ? `Add & build — ₹${template.price}` : "Add & build") : (template.price > 0 ? `Build — ₹${template.price}` : "Build")}</>}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Steps({ step }: { step: Step }) {
  const all: Step[] = ["details", "extra", "logo"];
  const idx = all.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {all.map((s, i) => (
        <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
      ))}
      <CheckCircle2 className={`size-4 ${idx === 2 ? "text-primary" : "text-muted-foreground"}`} />
    </div>
  );
}
