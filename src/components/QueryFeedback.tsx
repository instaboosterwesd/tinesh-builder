import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPanel } from "@/components/effects/HackerLoader";

export function QueryFeedback({ failed = false, retry, label }: { failed?: boolean; retry?: () => void; label: string }) {
  if (!failed) return <LoadingPanel />;
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 py-8" role={failed ? "alert" : "status"}>
      <WifiOff className="size-6 text-muted-foreground" />
      <p className="text-center text-sm text-muted-foreground">{failed ? `Could not load ${label}. Please try again.` : `Loading ${label}…`}</p>
      {failed && retry && <Button variant="outline" onClick={retry}><RefreshCw className="size-4" /> Try again</Button>}
    </div>
  );
}