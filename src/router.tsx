import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { LoadingPanel } from "@/components/effects/HackerLoader";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingComponent: LoadingPanel,
    defaultPendingMs: 300,
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
