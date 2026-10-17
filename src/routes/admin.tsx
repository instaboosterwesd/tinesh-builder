import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, Menu, Hammer, Wallet, Users, LayoutTemplate, Settings, LogOut, Search, Download, Trash2,
  Check, X, Lock, Pencil, Plus, Minus, Eye, Shield, RefreshCw, IndianRupee, Clock, Upload, FileCode, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { ThemeToggle } from "@/components/AppShell";
import {
  adminLogin, adminOverview, adminDecide, adminDeleteRequest, adminEncrypt,
  adminListTemplates, adminSaveTemplate, adminDeleteTemplate, adminUploadTemplateImage,
} from "@/lib/builder.functions";
import { adminGetSettings, adminSaveSettings, adminListDeposits, adminDecideDeposit } from "@/lib/wallet.functions";
import { adminListUsers, adminUpdateUser, adminAdjustBalance, adminDeleteUser, adminUserDetail } from "@/lib/users.functions";
import { BASE_APKS, baseApkLabel } from "@/lib/base-apks";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { HackerLoader, LoadingPanel } from "@/components/effects/HackerLoader";
import { QueryFeedback } from "@/components/QueryFeedback";
import { withRequestTimeout } from "@/lib/request-timeout";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — AppForge" },
      { name: "description", content: "Manage builds, users, deposits, templates and site settings." },
      { property: "og:title", content: "Admin panel — AppForge" },
      { property: "og:description", content: "Manage AppForge users, deposits, templates and builds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const KEY = "builder-admin-pw";
const err = (e: unknown) => toast.error((e as Error).message || "Something went wrong");
const fmt = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function csv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) { toast.error("Nothing to export"); return; }
  const cols = Object.keys(rows[0]!);
  const body = [cols.join(","), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  a.download = name;
  a.click();
}

function AdminPage() {
  const [pw, setPw] = useState<string | null>(null);
  useEffect(() => setPw(sessionStorage.getItem(KEY)), []);
  if (!pw) return <AdminLogin onOk={(p) => { sessionStorage.setItem(KEY, p); setPw(p); }} />;
  return <Panel pw={pw} logout={() => { sessionStorage.removeItem(KEY); setPw(null); }} />;
}

function AdminLogin({ onOk }: { onOk: (p: string) => void }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form
        className="surface w-full max-w-sm space-y-4 p-7 text-center"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try { await adminLogin({ data: { password: v } }); onOk(v); } catch (x) { err(x); }
          setBusy(false);
        }}
      >
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <Shield className="size-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <Input type="password" placeholder="Admin password" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
        <Button variant="hero" className="w-full" disabled={busy || !v}>{busy ? <HackerLoader compact /> : <><Lock className="size-4" /> Unlock</>}</Button>
      </form>
    </main>
  );
}

const TABS = [
  { id: "dash", label: "Dashboard", Icon: LayoutDashboard },
  { id: "builds", label: "Builds", Icon: Hammer },
  { id: "deposits", label: "Deposits", Icon: Wallet },
  { id: "users", label: "Users", Icon: Users },
  { id: "templates", label: "Templates", Icon: LayoutTemplate },
  { id: "settings", label: "Settings", Icon: Settings },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Panel({ pw, logout }: { pw: string; logout: () => void }) {
  const [tab, setTab] = useState<Tab>("dash");
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["adm", "overview"], queryFn: () => adminOverview({ data: { password: pw } }), refetchInterval: 15_000 });
  const deposits = useQuery({ queryKey: ["adm", "deposits"], queryFn: () => adminListDeposits({ data: { password: pw } }) });
  useEffect(() => {
    if (overview.error?.message.includes("Unauthorized")) logout();
  }, [overview.error, logout]);
  const pendingBuilds = overview.data?.requests.filter((r) => r.status === "pending").length ?? 0;
  const pendingDeps = deposits.data?.filter((d) => d.status === "pending").length ?? 0;
  const badge: Partial<Record<Tab, number>> = { builds: pendingBuilds, deposits: pendingDeps };

  const [menuOpen, setMenuOpen] = useState(false);
  const pick = (id: Tab) => { setTab(id); setMenuOpen(false); };
  const totalBadge = pendingBuilds + pendingDeps;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-glass-border glass-panel">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="relative">
                <Menu className="size-5" />
                {totalBadge > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 glass-panel p-0">
              <SheetHeader className="px-4 py-4 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow"><Shield className="size-4 text-primary-foreground" /></span>
                  Admin
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-3">
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => pick(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                      tab === id && "bg-accent text-accent-foreground clay",
                    )}
                  >
                    <Icon className="size-4" /> {label}
                    {!!badge[id] && <span className="ml-auto rounded-full bg-primary px-2 text-xs text-primary-foreground">{badge[id]}</span>}
                  </button>
                ))}
              </nav>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-glass-border px-3 pt-4">
                <ThemeToggle />
                <Button variant="ghost" size="sm" asChild><Link to="/"><Eye className="size-4" /> Site</Link></Button>
                <Button variant="ghost" size="sm" onClick={logout}><LogOut className="size-4" /> Logout</Button>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="truncate text-lg font-bold sm:text-xl">{TABS.find((t) => t.id === tab)?.label}</h1>
          <div className="ml-auto flex gap-1">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["adm"] })}><RefreshCw className="size-4" /><span className="hidden sm:inline"> Refresh</span></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {tab === "dash" && <Dashboard pw={pw} go={setTab} />}
        {tab === "builds" && <Builds pw={pw} />}
        {tab === "deposits" && <Deposits pw={pw} />}
        {tab === "users" && <UsersTab pw={pw} />}
        {tab === "templates" && <Templates pw={pw} />}
        {tab === "settings" && <SettingsTab pw={pw} />}
      </main>
    </div>
  );
}

function Stat({ label, value, Icon, onClick }: { label: string; value: ReactNode; Icon: typeof Clock; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="surface flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5">
      <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary"><Icon className="size-5" /></span>
      <span>
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block text-xl font-bold">{value}</span>
      </span>
    </button>
  );
}

function Dashboard({ pw, go }: { pw: string; go: (t: Tab) => void }) {
  const { data } = useQuery({ queryKey: ["adm", "overview"], queryFn: () => adminOverview({ data: { password: pw } }) });
  const { data: deps } = useQuery({ queryKey: ["adm", "deposits"], queryFn: () => adminListDeposits({ data: { password: pw } }) });
  const reqs = data?.requests ?? [];
  const today = new Date().toDateString();
  const todayBuilds = reqs.filter((r) => new Date(r.created_at).toDateString() === today).length;
  const deposited = (deps ?? []).filter((d) => d.status === "approved").reduce((s, d) => s + d.amount, 0);
  const counts = ["pending", "building", "success", "failed", "rejected"].map((s) => ({ s, n: reqs.filter((r) => r.status === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={data?.userCount ?? "–"} Icon={Users} onClick={() => go("users")} />
        <Stat label="Templates" value={data?.templateCount ?? "–"} Icon={LayoutTemplate} onClick={() => go("templates")} />
        <Stat label="Build revenue" value={`₹${data?.revenue ?? 0}`} Icon={IndianRupee} onClick={() => go("builds")} />
        <Stat label="Approved deposits" value={`₹${deposited}`} Icon={Wallet} onClick={() => go("deposits")} />
        <Stat label="Builds today" value={todayBuilds} Icon={Hammer} onClick={() => go("builds")} />
        <Stat label="Pending builds" value={counts[0]!.n} Icon={Clock} onClick={() => go("builds")} />
        <Stat label="Pending deposits" value={data?.pendingDeposits ?? 0} Icon={Clock} onClick={() => go("deposits")} />
        <Stat label="Total builds" value={reqs.length} Icon={Hammer} onClick={() => go("builds")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-4 font-semibold">Builds by status</h2>
          <div className="space-y-3">
            {counts.map(({ s, n }) => (
              <div key={s} className="flex items-center gap-3 text-sm">
                <span className="w-24 capitalize text-muted-foreground">{s}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted clay-inset">
                  <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="surface p-5">
          <h2 className="mb-3 font-semibold">Latest builds</h2>
          <ul className="divide-y divide-border">
            {reqs.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 truncate"><b>{r.app_name}</b> <span className="text-muted-foreground">· {r.requester_email}</span></span>
                <StatusBadge status={r.status} />
              </li>
            ))}
            {!reqs.length && <li className="py-6 text-center text-sm text-muted-foreground">No builds yet</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Toolbar({ q, setQ, filters, filter, setFilter, onExport }: {
  q: string; setQ: (v: string) => void; filters?: string[]; filter?: string; setFilter?: (v: string) => void; onExport?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filters?.map((f) => (
        <button key={f} onClick={() => setFilter?.(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium capitalize text-muted-foreground", filter === f && "bg-accent text-accent-foreground clay")}>
          {f}
        </button>
      ))}
      {onExport && <Button variant="outline" size="sm" onClick={onExport}><Download className="size-4" /> CSV</Button>}
    </div>
  );
}

function Builds({ pw }: { pw: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adm", "overview"], queryFn: () => adminOverview({ data: { password: pw } }) });
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const rows = useMemo(() => (data?.requests ?? []).filter((r) =>
    (f === "all" || r.status === f) &&
    [r.app_name, r.package_name, r.requester_email, r.requester_name, r.template_name].join(" ").toLowerCase().includes(q.toLowerCase()),
  ), [data, q, f]);
  async function act(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(id);
    try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: ["adm"] }); } catch (e) { err(e); }
    setBusy(null);
  }
  return (
    <>
      <Toolbar q={q} setQ={setQ} filters={["all", "pending", "building", "success", "failed", "rejected"]} filter={f} setFilter={setF}
        onExport={() => csv("builds.csv", rows.map(({ id, app_name, package_name, template_name, requester_email, status, charged, created_at }) => ({ id, app_name, package_name, template_name, requester_email, status, charged, created_at })))} />
      {isLoading && <LoadingPanel />}
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {r.logo ? <img src={r.logo} alt="" className="size-11 rounded-xl object-cover" /> : <span className="grid size-11 place-items-center rounded-xl bg-muted"><Hammer className="size-4" /></span>}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><b className="truncate">{r.app_name}</b><StatusBadge status={r.status} /></div>
                <p className="truncate text-xs text-muted-foreground">{r.package_name} · {r.template_name} · {r.requester_email} · ₹{r.charged} · {fmt(r.created_at)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["pending", "approved", "failed"].includes(r.status) && (
                <>
                  <Button size="sm" variant="hero" disabled={busy === r.id} onClick={() => act(r.id, () => adminDecide({ data: { password: pw, id: r.id, decision: "approve" } }), r.status === "failed" ? "Retrying build" : "Build started")}>
                    <Check className="size-4" /> {r.status === "failed" ? "Retry" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => confirm("Reject and refund?") && act(r.id, () => adminDecide({ data: { password: pw, id: r.id, decision: "reject" } }), "Rejected & refunded")}>
                    <X className="size-4" /> Reject
                  </Button>
                </>
              )}
              {r.download && <Button size="sm" variant="outline" asChild><a href={r.download}><Download className="size-4" /> APK</a></Button>}
              {r.encrypted_download
                ? <Button size="sm" variant="outline" asChild><a href={r.encrypted_download}><Lock className="size-4" /> Encrypted</a></Button>
                : r.status === "success" && (
                  <Button size="sm" variant="outline" disabled={busy === r.id || r.encrypt_status === "encrypting"} onClick={() => act(r.id, () => adminEncrypt({ data: { password: pw, id: r.id } }), "Encryption started")}>
                    <Lock className="size-4" /> {r.encrypt_status === "encrypting" ? "Encrypting…" : "Encrypt"}
                  </Button>
                )}
              <Button size="icon" variant="ghost" disabled={busy === r.id} onClick={() => confirm("Delete this build?") && act(r.id, () => adminDeleteRequest({ data: { password: pw, id: r.id } }), "Deleted")}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && !rows.length && <p className="surface p-8 text-center text-sm text-muted-foreground">No builds found</p>}
      </div>
    </>
  );
}

function Deposits({ pw }: { pw: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adm", "deposits"], queryFn: () => adminListDeposits({ data: { password: pw } }) });
  const [q, setQ] = useState("");
  const [f, setF] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const rows = (data ?? []).filter((d) => (f === "all" || d.status === f) && `${d.user_email} ${d.utr} ${d.amount}`.toLowerCase().includes(q.toLowerCase()));
  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try { await adminDecideDeposit({ data: { password: pw, id, decision } }); toast.success(decision === "approve" ? "Balance added" : "Rejected"); qc.invalidateQueries({ queryKey: ["adm"] }); } catch (e) { err(e); }
    setBusy(null);
  }
  return (
    <>
      <Toolbar q={q} setQ={setQ} filters={["pending", "approved", "rejected", "all"]} filter={f} setFilter={setF}
        onExport={() => csv("deposits.csv", rows.map(({ id, user_email, amount, utr, status, created_at }) => ({ id, user_email, amount, utr, status, created_at })))} />
      {isLoading && <LoadingPanel />}
      <div className="grid gap-3">
        {rows.map((d) => (
          <div key={d.id} className="surface flex flex-wrap items-center gap-3 p-4">
            <span className="text-xl font-bold text-primary">₹{d.amount}</span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{d.user_email}</p>
              <p className="text-xs text-muted-foreground">UTR <span className="font-mono">{d.utr}</span> · {fmt(d.created_at)}</p>
            </div>
            {d.status === "pending" ? (
              <div className="flex gap-1.5">
                <Button size="sm" variant="hero" disabled={busy === d.id} onClick={() => decide(d.id, "approve")}><Check className="size-4" /> Approve</Button>
                <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => decide(d.id, "reject")}><X className="size-4" /> Reject</Button>
              </div>
            ) : <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", d.status === "approved" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{d.status}</span>}
          </div>
        ))}
        {!isLoading && !rows.length && <p className="surface p-8 text-center text-sm text-muted-foreground">No deposits</p>}
      </div>
    </>
  );
}

type UserRow = Awaited<ReturnType<typeof adminListUsers>>[number];

function UsersTab({ pw }: { pw: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["adm", "users"], queryFn: () => adminListUsers({ data: { password: pw } }) });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [open, setOpen] = useState<UserRow | null>(null);
  const rows = useMemo(() => {
    const r = (data ?? []).filter((u) => `${u.name} ${u.email} ${u.telegram_id}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === "balance") r.sort((a, b) => b.balance - a.balance);
    if (sort === "builds") r.sort((a, b) => b.builds - a.builds);
    return r;
  }, [data, q, sort]);
  return (
    <>
      <Toolbar q={q} setQ={setQ} filters={["newest", "balance", "builds"]} filter={sort} setFilter={setSort}
        onExport={() => csv("users.csv", rows.map(({ id, name, email, telegram_id, balance, builds, created_at }) => ({ id, name, email, telegram_id, balance, builds, created_at })))} />
      {isLoading && <LoadingPanel />}
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="p-3">User</th><th className="p-3">Telegram</th><th className="p-3">Balance</th><th className="p-3">Builds</th><th className="p-3">Joined</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setOpen(u)}>
                <td className="p-3"><p className="font-medium">{u.name || "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></td>
                <td className="p-3">{u.telegram_id ? `@${u.telegram_id}` : "—"}</td>
                <td className="p-3 font-semibold">₹{u.balance}</td>
                <td className="p-3">{u.builds}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at ?? 0).toLocaleDateString("en-IN")}</td>
                <td className="p-3 text-right"><Pencil className="inline size-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !rows.length && <p className="p-8 text-center text-sm text-muted-foreground">No users</p>}
      </div>
      {open && <UserDialog pw={pw} user={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function UserDialog({ pw, user, onClose }: { pw: string; user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(user.name ?? "");
  const [tg, setTg] = useState(user.telegram_id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [balance, setBalance] = useState(user.balance);
  const [busy, setBusy] = useState(false);
  const detail = useQuery({ queryKey: ["adm", "user", user.id], queryFn: () => adminUserDetail({ data: { password: pw, id: user.id } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["adm"] });
  async function run(fn: () => Promise<void>) { setBusy(true); try { await fn(); } catch (e) { err(e); } setBusy(false); }
  const adjust = (sign: 1 | -1) => run(async () => {
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) throw new Error("Enter a whole amount");
    const r = await adminAdjustBalance({ data: { password: pw, id: user.id, amount: sign * n, note } });
    setBalance(r.balance); setAmount(""); setNote(""); toast.success(sign > 0 ? "Balance added" : "Balance deducted"); refresh();
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{user.email}</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Profile</h3>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <Input value={tg} onChange={(e) => setTg(e.target.value)} placeholder="Telegram username" />
            <Button size="sm" variant="hero" disabled={busy} onClick={() => run(async () => { await adminUpdateUser({ data: { password: pw, id: user.id, name, telegram_id: tg } }); toast.success("Saved"); refresh(); })}>{busy ? <HackerLoader compact label="Saving profile" /> : "Save profile"}</Button>
          </section>
          <section className="space-y-2 rounded-2xl bg-muted/50 p-4 clay-inset">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Wallet</h3><span className="text-xl font-bold text-primary">₹{balance}</span></div>
            <div className="flex gap-2">
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="hero" disabled={busy} onClick={() => adjust(1)}><Plus className="size-4" /> Add</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => adjust(-1)}><Minus className="size-4" /> Deduct</Button>
            </div>
          </section>
          <History title="Wallet history" items={(detail.data?.transactions ?? []).map((t) => ({ id: t.id, left: t.note || t.kind, right: `${t.amount > 0 ? "+" : ""}₹${t.amount}`, at: t.created_at }))} />
          <History title="Builds" items={(detail.data?.builds ?? []).map((b) => ({ id: b.id, left: `${b.app_name} · ${b.status}`, right: `₹${b.charged}`, at: b.created_at ?? "" }))} />
          <History title="Login history" items={(detail.data?.logins ?? []).map((l) => ({ id: l.id, left: l.user_agent.slice(0, 50) || "Unknown device", right: "", at: l.created_at }))} />
          <Button variant="destructive" className="w-full" disabled={busy} onClick={() => confirm(`Delete ${user.email} permanently?`) && run(async () => { await adminDeleteUser({ data: { password: pw, id: user.id } }); toast.success("User deleted"); refresh(); onClose(); })}>
            <Trash2 className="size-4" /> Delete user
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function History({ title, items }: { title: string; items: { id: string; left: string; right: string; at: string }[] }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="max-h-40 divide-y divide-border overflow-y-auto text-xs">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2 py-1.5">
              <span className="min-w-0 truncate">{i.left}<span className="block text-muted-foreground">{fmt(i.at)}</span></span>
              <b>{i.right}</b>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-muted-foreground">Nothing yet</p>}
    </section>
  );
}

type Tpl = Awaited<ReturnType<typeof adminListTemplates>>[number];

function Templates({ pw }: { pw: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adm", "templates"], queryFn: () => adminListTemplates({ data: { password: pw } }) });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<Tpl> | null>(null);
  const rows = (data ?? []).filter((t) => `${t.name} ${t.description}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1"><Toolbar q={q} setQ={setQ} /></div>
        <Button variant="hero" onClick={() => setEdit({ base_apk: "bingo", price: 0, show_preview: true, html: "" })}><Plus className="size-4" /> New</Button>
      </div>
      {isLoading && <LoadingPanel />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <div key={t.id} className="surface overflow-hidden">
            {t.image ? <img src={t.image} alt={t.name} className="aspect-video w-full object-cover" /> : <div className="grid aspect-video place-items-center bg-muted"><LayoutTemplate className="size-6 text-muted-foreground" /></div>}
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2"><b className="truncate">{t.name}</b><span className="font-semibold text-primary">₹{t.price}</span></div>
              <p className="text-xs text-muted-foreground">{baseApkLabel(t.base_apk)} · preview {t.show_preview ? "on" : "off"}</p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setEdit(t)}><Pencil className="size-4" /> Edit</Button>
                <Button size="icon" variant="ghost" onClick={async () => {
                  if (!confirm(`Delete ${t.name}?`)) return;
                  try { await adminDeleteTemplate({ data: { password: pw, id: t.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["adm"] }); } catch (e) { err(e); }
                }}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {edit && <TemplateDialog pw={pw} t={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function TemplateDialog({ pw, t, onClose }: { pw: string; t: Partial<Tpl>; onClose: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ name: t.name ?? "", description: t.description ?? "", base_apk: t.base_apk ?? "bingo", price: String(t.price ?? 0), html: t.html ?? "", show_preview: t.show_preview ?? true });
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(t.image_url ?? "");
  const [preview, setPreview] = useState<string | null>((t as { image?: string | null }).image ?? null);
  const [uploading, setUploading] = useState(false);
  const [htmlName, setHtmlName] = useState("");
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const pickImage = async (file?: File) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Image must be under 3 MB"); return; }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
      setPreview(dataUrl);
      const { url } = await adminUploadTemplateImage({ data: { password: pw, filename: file.name, image: dataUrl } });
      setImageUrl(url); toast.success("Image uploaded");
    } catch (x) { err(x); setPreview(null); }
    setUploading(false);
  };
  const pickHtml = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setV((s) => ({ ...s, html: text })); setHtmlName(file.name);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{t.id ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (uploading) { toast.error("Wait for the image to finish uploading"); return; }
          setBusy(true);
          try {
            await adminSaveTemplate({ data: { password: pw, id: t.id, ...v, price: Number(v.price), image_url: imageUrl, video_url: t.video_url ?? "" } });
            toast.success("Saved"); qc.invalidateQueries({ queryKey: ["adm"] }); qc.invalidateQueries({ queryKey: ["templates"] }); onClose();
          } catch (x) { err(x); }
          setBusy(false);
        }}>
          <Input placeholder="Name" value={v.name} onChange={set("name")} required />
          <Textarea placeholder="Description" value={v.description} onChange={set("description")} rows={2} />
          <div className="flex gap-2">
            <select value={v.base_apk} onChange={set("base_apk")} className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm">
              {BASE_APKS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <Input type="number" min={0} placeholder="Price ₹" value={v.price} onChange={set("price")} className="w-32" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Template image</p>
            <div className="flex items-center gap-3">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-input bg-muted/40">
                {preview ? <img src={preview} alt="Template preview" className="h-full w-full object-cover" /> : <ImageIcon className="size-6 text-muted-foreground" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <label className="cursor-pointer">
                    <Upload className="size-4" /> {uploading ? "Uploading…" : preview ? "Change image" : "Upload image"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </Button>
                <span className="text-xs text-muted-foreground">PNG, JPG or WEBP · max 3 MB</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">HTML</p>
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <FileCode className="size-4" /> {htmlName ? "Change HTML file" : "Select HTML file"}
                  <input type="file" accept=".html,.htm,text/html" className="sr-only" onChange={(e) => { pickHtml(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </Button>
            </div>
            {htmlName && <p className="truncate text-xs text-muted-foreground">Loaded: {htmlName}</p>}
            <Textarea placeholder="Paste HTML or select a file" value={v.html} onChange={set("html")} rows={8} className="font-mono text-xs" required />
          </div>
          <label className="flex items-center justify-between text-sm">Show live preview to users <Switch checked={v.show_preview} onCheckedChange={(c) => setV({ ...v, show_preview: c })} /></label>
          <Button variant="hero" className="w-full" disabled={busy}>{busy ? <HackerLoader compact label="Saving template" /> : "Save template"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettingsTab({ pw }: { pw: string }) {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["adm", "settings"], queryFn: () => withRequestTimeout(() => adminGetSettings({ data: { password: pw } })), retry: false });
  const { data } = settings;
  const [v, setV] = useState<NonNullable<typeof data> | null>(null);
  useEffect(() => { if (data) setV(data); }, [data]);
  const [busy, setBusy] = useState(false);
  if (!v) return <QueryFeedback failed={settings.isError} retry={() => settings.refetch()} label="settings" />;
  return (
    <form className="grid gap-4 lg:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try { await adminSaveSettings({ data: { password: pw, ...v } }); toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["adm"] }); qc.invalidateQueries({ queryKey: ["site-settings"] }); } catch (x) { err(x); }
      setBusy(false);
    }}>
      <section className="space-y-3 border-b border-border pb-5 lg:col-span-2">
        <h2 className="font-semibold">Website name</h2>
        <Input aria-label="Website name" required maxLength={80} value={v.site_name} onChange={(e) => setV({ ...v, site_name: e.target.value })} />
      </section>
      <section className="space-y-3 border-b border-border pb-5 lg:col-span-2">
        <label className="flex items-center justify-between gap-3 font-semibold" htmlFor="announcement-enabled">Announcement <Switch id="announcement-enabled" checked={v.announcement_enabled} onCheckedChange={(enabled) => setV({ ...v, announcement_enabled: enabled })} /></label>
        <Input aria-label="Announcement title" placeholder="Title (optional)" maxLength={120} value={v.announcement_title} onChange={(e) => setV({ ...v, announcement_title: e.target.value })} />
        <Textarea aria-label="Announcement message" placeholder="Announcement message" required={v.announcement_enabled} maxLength={2000} rows={4} value={v.announcement_message} onChange={(e) => setV({ ...v, announcement_message: e.target.value })} />
      </section>
      <section className={cn("surface space-y-3 p-5", v.maintenance_mode && "ring-2 ring-warning")}>
        <label className="flex items-center justify-between font-semibold">Maintenance mode <Switch checked={v.maintenance_mode} onCheckedChange={(c) => setV({ ...v, maintenance_mode: c })} /></label>
        <p className="text-xs text-muted-foreground">When on, visitors only see a maintenance screen. The admin panel keeps working.</p>
        <Textarea placeholder="Message shown to visitors" value={v.maintenance_message} onChange={(e) => setV({ ...v, maintenance_message: e.target.value })} rows={3} />
      </section>
      <section className="surface space-y-3 p-5">
        <h2 className="font-semibold">Payments</h2>
        <Input placeholder="UPI ID" value={v.upi_id} onChange={(e) => setV({ ...v, upi_id: e.target.value })} />
        <Input type="number" min={1} placeholder="Minimum deposit ₹" value={v.min_deposit} onChange={(e) => setV({ ...v, min_deposit: Number(e.target.value) })} />
      </section>
      <section className="surface space-y-4 p-5 lg:col-span-2">
        <h2 className="font-semibold">Appearance</h2>
        <label className="flex items-center justify-between gap-3 text-sm font-medium" htmlFor="desktop-video">Desktop video background <Switch id="desktop-video" checked={v.desktop_video} onCheckedChange={(c) => setV({ ...v, desktop_video: c })} /></label>
        <p className="text-xs text-muted-foreground">On: Windows/Mac computers see the moving video on every page. Off: they see the normal image instead.</p>
        {([["glass_desktop", "Card see-through on computers (Windows/Mac)"], ["glass_mobile", "Card see-through on phones & tablets (Android/iPhone)"]] as const).map(([k, label]) => (
          <div key={k} className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span>{label}</span><span className="font-mono text-muted-foreground">{100 - v[k]}% clear</span></div>
            <Slider aria-label={label} min={0} max={100} step={1} value={[100 - v[k]]} onValueChange={([x]) => setV({ ...v, [k]: 100 - (x ?? 0) })} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">100% clear = fully transparent cards, 0% = solid cards.</p>
      </section>
      <section className="surface space-y-3 p-5 lg:col-span-2">
        <h2 className="font-semibold">Help & support link</h2>
        <Input placeholder="https://t.me/yoursupport" value={v.support_link} onChange={(e) => setV({ ...v, support_link: e.target.value })} />
        <p className="text-xs text-muted-foreground">Used by "Contact support" buttons on profile, wallet and maintenance screens.</p>
      </section>
      <Button variant="hero" className="lg:col-span-2" disabled={busy}>{busy ? <HackerLoader compact label="Saving settings" /> : "Save settings"}</Button>
    </form>
  );
}
