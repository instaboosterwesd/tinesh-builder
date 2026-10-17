import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { toast } from "sonner";
import { Copy, IndianRupee, Plus, Wallet as WalletIcon, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Logo, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/lib/firebase";
import { getWalletInfo, requestDeposit } from "@/lib/wallet.functions";

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Wallet — Builder" },
      { name: "description", content: "Add balance and track your deposits." },
      { property: "og:title", content: "My Wallet — Builder" },
      { property: "og:description", content: "Add balance and track your deposits." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WalletPage,
});

type WalletData = Awaited<ReturnType<typeof getWalletInfo>>;

const STATUS_UI: Record<string, { label: string; Icon: typeof Clock; cls: string }> = {
  pending: { label: "Under review", Icon: Clock, cls: "text-amber-400" },
  approved: { label: "Added to wallet", Icon: CheckCircle2, cls: "text-emerald-400" },
  rejected: { label: "Rejected", Icon: XCircle, cls: "text-red-400" },
};

function WalletPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh(u: User) {
    setData(await getWalletInfo({ data: { uid: u.uid } }));
  }

  useEffect(() => {
    let unsub: (() => void) | undefined;
    useFirebase().then(({ auth }) => {
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) refresh(u);
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
      await requestDeposit({
        data: {
          uid: user.uid,
          email: user.email ?? "",
          amount: Number(f.get("amount")),
          utr: String(f.get("utr") ?? ""),
        },
      });
      toast.success("Deposit submitted — admin will review it shortly");
      (e.target as HTMLFormElement).reset();
      await refresh(user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <div className="grid-bg grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-glow">
          <WalletIcon className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Login needed</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to see your wallet and add balance.</p>
          <Link to="/auth"><Button variant="hero" className="mt-6 w-full">Login / Sign up</Button></Link>
        </div>
      </div>
    );
  }

  const settings = data?.settings;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:h-16"><Logo /></div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* Balance card */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-primary p-6 shadow-glow sm:p-8">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-background/10 blur-2xl" />
          <p className="text-sm font-medium text-primary-foreground/80">Wallet balance</p>
          <p className="mt-1 flex items-center gap-1 text-4xl font-bold text-primary-foreground sm:text-5xl">
            <IndianRupee className="size-8" />{data?.balance ?? 0}
          </p>
          <p className="mt-3 text-xs text-primary-foreground/70">{user.email}</p>
        </div>

        {/* Add balance */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="size-5 text-primary" /> Add balance</h2>
          {settings?.upi_id ? (
            <>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pay to this UPI ID</p>
                  <p className="font-mono text-lg font-bold">{settings.upi_id}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { navigator.clipboard.writeText(settings.upi_id); toast.success("UPI ID copied"); }}
                >
                  <Copy className="size-4" /> Copy
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Minimum deposit: ₹{settings.min_deposit}</p>
              <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input name="amount" type="number" min={settings.min_deposit} placeholder={`Amount (min ₹${settings.min_deposit})`} required />
                <Input name="utr" placeholder="UTR / transaction reference" required maxLength={64} />
                <Button type="submit" variant="hero" className="sm:col-span-2" disabled={loading}>
                  {loading ? "Submitting…" : "I have paid — submit for review"}
                </Button>
              </form>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Deposits are not open yet — please check back later.</p>
          )}
        </div>

        {/* Deposit history */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold">Deposit history</h2>
          {data?.deposits.length ? (
            <ul className="mt-4 divide-y divide-border">
              {data.deposits.map((d) => {
                const ui = STATUS_UI[d.status] ?? STATUS_UI["pending"]!;
                return (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold">₹{d.amount}</p>
                      <p className="text-xs text-muted-foreground">UTR {d.utr} · {new Date(d.created_at).toLocaleString()}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${ui.cls}`}>
                      <ui.Icon className="size-4" /> {ui.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No deposits yet.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
