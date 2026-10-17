import { baseApkLabel } from "@/lib/base-apks";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Code2, Image as ImageIcon, PlayCircle, Copy, Hammer, IndianRupee, Wallet, LogIn, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBuildRequest, getTemplate } from "@/lib/builder.functions";
import { getWalletInfo } from "@/lib/wallet.functions";
import { useFirebase } from "@/lib/firebase";
import { productId } from "@/lib/product-id";

const templateQuery = (id: string) =>
  queryOptions({ queryKey: ["template", id], queryFn: () => getTemplate({ data: { id } }) });

export const Route = createFileRoute("/templates/$id")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(templateQuery(params.id));
    if (!t) throw notFound();
    return { name: t.name, description: t.description };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — Builder template` },
          { name: "description", content: loaderData.description || `Preview ${loaderData.name} and request an APK build.` },
          { property: "og:title", content: `${loaderData.name} — Builder template` },
          { property: "og:description", content: loaderData.description || `Preview ${loaderData.name} and request an APK build.` },
        ]
      : [{ title: "Template not found" }, { name: "robots", content: "noindex" }],
  }),
  component: TemplatePage,
});

function TemplatePage() {
  const { id } = Route.useParams();
  const { data: t } = useSuspenseQuery(templateQuery(id));
  if (!t) return null;
  const defaultTab = t.video ? "video" : t.image ? "image" : "html";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> All templates
        </Link>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-10">
          <Tabs defaultValue={defaultTab}>
            <TabsList>
              {t.video && <TabsTrigger value="video"><PlayCircle className="size-4" /> Video</TabsTrigger>}
              {t.image && <TabsTrigger value="image"><ImageIcon className="size-4" /> Photo</TabsTrigger>}
              <TabsTrigger value="html"><Code2 className="size-4" /> Live preview</TabsTrigger>
            </TabsList>
            {t.video && (
              <TabsContent value="video">
                <video src={t.video} controls autoPlay muted loop className="aspect-video w-full rounded-2xl border border-border bg-card" />
              </TabsContent>
            )}
            {t.image && (
              <TabsContent value="image">
                <img src={t.image} alt={t.name} className="w-full rounded-2xl border border-border" />
              </TabsContent>
            )}
            <TabsContent value="html">
              <iframe title="preview" srcDoc={t.html} sandbox="allow-scripts" className="h-[480px] sm:h-[640px] w-full rounded-2xl border border-border bg-card" />
            </TabsContent>
          </Tabs>

          <aside className="order-first h-fit rounded-2xl border border-border bg-card p-5 shadow-sm lg:order-none lg:sticky lg:top-24">
            <span className="text-xs font-medium uppercase tracking-wider text-primary">{baseApkLabel(t.base_apk)}</span>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t.name}</h1>
            <p className="mt-3 text-muted-foreground">{t.description || "No description provided."}</p>
            <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-center">
              <p className="text-xs text-muted-foreground">Product ID</p>
              <button
                onClick={() => { navigator.clipboard.writeText(productId(t.id)); toast.success("Copied"); }}
                className="mx-auto mt-1 flex items-center gap-2 font-mono text-2xl font-bold"
              >
                {productId(t.id)} <Copy className="size-4" />
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Share this Product ID with the admin to get your app.</p>
            </div>
            <BuildCard templateId={t.id} baseApk={t.base_apk} templateName={t.name} />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function BuildCard({ templateId, baseApk, templateName }: { templateId: string; baseApk: string; templateName: string }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [balance, setBalance] = useState(0);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    useFirebase().then(({ auth }) => {
      unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) {
          const info = await getWalletInfo({ data: { uid: u.uid } });
          setBalance(info.balance);
          setPrice(info.settings.build_price);
        }
      });
    });
    return () => unsub?.();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await createBuildRequest({
        data: {
          template_id: templateId,
          requester_name: user.displayName || user.email?.split("@")[0] || "User",
          requester_email: user.email ?? "",
          app_name: String(f.get("app_name") ?? ""),
          package_name: String(f.get("package_name") ?? ""),
          notes: "",
          register_link: "https://app.local/",
          logo_path: "",
          firebase_uid: user.uid,
        },
      });
      toast.success(res.charged > 0 ? `Build requested — ₹${res.charged} charged from wallet` : "Build requested");
      navigate({ to: "/track", search: { id: res.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      if (msg === "ADD_BALANCE") {
        toast.error("Balance कम है — पहले wallet में balance add करो");
        navigate({ to: "/wallet" });
      } else if (msg === "LOGIN_REQUIRED") {
        navigate({ to: "/auth" });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-center">
        <LogIn className="mx-auto size-6 text-primary" />
        <p className="mt-2 text-sm font-medium">Login करो build request के लिए</p>
        <Link to="/auth"><Button variant="hero" size="sm" className="mt-3 w-full">Login / Sign up</Button></Link>
      </div>
    );
  }

  const short = price > 0 && balance < price;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground"><Wallet className="size-4" /> Balance</span>
        <span className="flex items-center font-bold"><IndianRupee className="size-4" />{balance}</span>
      </div>
      {price > 0 && (
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Build price</span>
          <span className="flex items-center font-semibold"><IndianRupee className="size-4" />{price}</span>
        </div>
      )}

      {short ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
          <p className="text-sm font-medium text-amber-400">Balance कम है — कृपया balance add करो</p>
          <Link to="/wallet"><Button variant="hero" size="sm" className="mt-3 w-full"><Plus className="size-4" /> Add balance</Button></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-2.5">
          <Input name="app_name" placeholder="App name" defaultValue={templateName} required maxLength={60} />
          <Input name="package_name" placeholder="Package (com.your.app)" required pattern="[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+" />
          <Button type="submit" variant="hero" disabled={loading}>
            <Hammer className="size-4" /> {loading ? "Requesting…" : price > 0 ? `Build now — ₹${price}` : "Request build"}
          </Button>
        </form>
      )}
    </div>
  );
}
