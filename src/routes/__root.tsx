import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Wrench, LifeBuoy } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ClickSounds } from "@/components/ClickSounds";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { themeInitScript } from "@/lib/theme";
import { siteSettingsQuery } from "@/hooks/useSiteSettings";
import { SiteAnnouncement } from "@/components/SiteAnnouncement";
import { UserBackground } from "@/components/effects/UserBackground";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "AppForge — Turn templates into Android apps" },
      { name: "description", content: "Pick a template, add your logo and get your own Android APK in minutes." },
      { property: "og:title", content: "AppForge — Turn templates into Android apps" },
      { property: "og:description", content: "Pick a template, add your logo and get your own Android APK in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "data:," },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
    scripts: [{ children: themeInitScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export { siteSettingsQuery } from "@/hooks/useSiteSettings";

function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { data } = useQuery(siteSettingsQuery);
  if (pathname.startsWith("/admin")) return <>{children}</>;
  if (!data?.maintenance_mode) return <><SiteAnnouncement />{children}</>;
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <Wrench className="size-7 text-primary-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Under maintenance</h1>
        <p className="mt-2 text-muted-foreground">{data.maintenance_message || "We'll be back soon."}</p>
        {data.support_link && (
          <a href={data.support_link} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
            <LifeBuoy className="size-4" /> Contact support
          </a>
        )}
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserBackground />
        <div className="app-content">
        <MaintenanceGate>
          <Outlet />
        </MaintenanceGate>
        <ProfileCompletion />
        <ClickSounds />
        <Toaster richColors position="top-center" />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
