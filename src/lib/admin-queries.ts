import { useQuery } from "@tanstack/react-query";
import { adminListTemplates, adminOverview } from "@/lib/builder.functions";
import { getAdminPass } from "@/lib/admin-session";

export function useOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminOverview({ data: { password: getAdminPass() } }),
    refetchInterval: 15000,
  });
}

export function useAdminTemplates() {
  return useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => adminListTemplates({ data: { password: getAdminPass() } }),
  });
}
