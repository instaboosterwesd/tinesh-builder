import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { LoadingPanel } from "@/components/effects/HackerLoader";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingComponent: LoadingPanel,
    defaultPendingMs: 150,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
