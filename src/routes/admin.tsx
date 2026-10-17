import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Hammer, LayoutDashboard, Inbox, LayoutTemplate, PlusCircle, LogOut, Lock, ExternalLink, Wallet, Settings2, Users } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/lib/builder.functions";
import { clearAdminPass, setAdminPass, useAdminPass } from "@/lib/admin-session";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin panel — Builder" },
      { name: "description", content: "Manage templates and build requests." },
      { property: "og:title", content: "Admin panel — Builder" },
      { property: "og:description", content: "Manage templates and build requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", short: "Home", Icon: LayoutDashboard, exact: true },
  { to: "/admin/build", label: "Build APK", short: "Build", Icon: Hammer },
  { to: "/admin/requests", label: "Build history", short: "History", Icon: Inbox },
  { to: "/admin/templates", label: "Templates", short: "Tpls", Icon: LayoutTemplate, exact: true },
  { to: "/admin/templates/new", label: "Add template", short: "Add", Icon: PlusCircle },
  { to: "/admin/deposits", label: "Deposits", short: "Deposits", Icon: Wallet },
  { to: "/admin/users", label: "Users", short: "Users", Icon: Users },
  { to: "/admin/settings", label: "Settings", short: "Settings", Icon: Settings2 },
] as const;

function AdminLayout() {
  const pass = useAdminPass();
  if (pass === null) return null;
  if (!pass) return <Login />;
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="px-2 py-3"><Logo /></div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <ExternalLink className="size-4" /> View site
        </Link>
        <button
          onClick={() => { clearAdminPass(); toast("Logged out"); }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-primary"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            <Link to="/" aria-label="View site" className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"><ExternalLink className="size-5" /></Link>
            <button aria-label="Logout" onClick={() => { clearAdminPass(); toast("Logged out"); }} className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"><LogOut className="size-5" /></button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 pb-28 md:p-10 md:pb-10"><Outlet /></main>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-8 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {NAV.map(({ to, short, Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" /> {short}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Login() {
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setLoading(true);
    try {
      await adminLogin({ data: { password } });
      setAdminPass(password);
      toast.success("Welcome back, admin");
    } catch {
      toast.error("Wrong password");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="grid-bg relative grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-glow sm:p-8 backdrop-blur">
        <Logo />
        <div className="mt-8 grid size-12 place-items-center rounded-xl bg-primary/15"><Lock className="size-5 text-primary" /></div>
        <h1 className="mt-4 text-2xl font-bold">Admin login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the admin password to continue.</p>
        <Input name="password" type="password" placeholder="Password" required autoFocus className="mt-6" />
        <Button type="submit" variant="hero" className="mt-4 w-full" disabled={loading}>{loading ? "Checking…" : "Login"}</Button>
      </form>
    </div>
  );
}
