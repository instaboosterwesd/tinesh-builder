import { useQuery } from "@tanstack/react-query";
import { getSiteSettings } from "@/lib/wallet.functions";
import { siteName } from "@/lib/site-settings";

export const siteSettingsQuery = {
  queryKey: ["site-settings"],
  queryFn: () => getSiteSettings(),
  staleTime: 30_000,
  refetchInterval: 30_000,
};

export function useSiteSettings() {
  return useQuery(siteSettingsQuery);
}

export function useSiteName() {
  return siteName(useSiteSettings().data);
}