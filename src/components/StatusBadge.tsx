import { CheckCircle2, Clock, Loader2, XCircle, ThumbsUp, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  pending: { label: "Pending", cls: "bg-warning/15 text-warning", Icon: Clock },
  approved: { label: "Approved", cls: "bg-info/15 text-info", Icon: ThumbsUp },
  building: { label: "Building", cls: "bg-primary/15 text-primary", Icon: Loader2 },
  success: { label: "APK Ready", cls: "bg-success/15 text-success", Icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-destructive/15 text-destructive", Icon: XCircle },
  rejected: { label: "Rejected", cls: "bg-muted text-muted-foreground", Icon: Ban },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? MAP["pending"]!;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", s.cls)}>
      <s.Icon className={cn("size-3.5", status === "building" && "animate-spin")} />
      {s.label}
    </span>
  );
}
