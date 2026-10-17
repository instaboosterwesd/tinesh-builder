import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { getWalletInfo } from "@/lib/wallet.functions";
import { myBuilds, leaderboard } from "@/lib/builder.functions";
import { getMyProfile } from "@/lib/users.functions";
import { withRequestTimeout } from "@/lib/request-timeout";

/** Warms the cache for dock pages so Wallet/Orders/Profile/Leaders open instantly. */
export function usePrefetchUserData() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const wallet = useServerFn(getWalletInfo);
  const builds = useServerFn(myBuilds);
  const profile = useServerFn(getMyProfile);
  const leaders = useServerFn(leaderboard);
  const uid = user?.uid;

  useEffect(() => {
    qc.prefetchQuery({ queryKey: ["leaderboard"], queryFn: () => withRequestTimeout(() => leaders()), staleTime: 30_000 });
    if (!uid) return;
    qc.prefetchQuery({ queryKey: ["wallet", uid], queryFn: () => withRequestTimeout(() => wallet()), staleTime: 30_000 });
    qc.prefetchQuery({ queryKey: ["my-builds", uid], queryFn: () => withRequestTimeout(() => builds()), staleTime: 15_000 });
    qc.prefetchQuery({ queryKey: ["my-profile", uid], queryFn: () => withRequestTimeout(() => profile()), staleTime: 30_000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, qc]);
}
