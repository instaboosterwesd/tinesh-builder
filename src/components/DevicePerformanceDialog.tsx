import { useState } from "react";
import { Smartphone, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setDevicePerformance, useDevicePerformance, type DevicePerformance } from "@/lib/device-performance";

const OPTIONS: { value: DevicePerformance; title: string; description: string; icon: typeof Smartphone }[] = [
  { value: "low", title: "Low device", description: "Simple icons — lighter and faster on older phones.", icon: Smartphone },
  { value: "high", title: "High device", description: "Premium animated stickers — best look on fast phones.", icon: Zap },
];

// One-time choice for new visitors; changeable later from Profile.
export function DevicePerformanceDialog() {
  const performance = useDevicePerformance();
  const [dismissed, setDismissed] = useState(false);
  const open = performance === null && !dismissed;

  function choose(value: DevicePerformance) {
    setDevicePerformance(value);
    setDismissed(true);
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Choose your device type</DialogTitle>
          <DialogDescription>This sets how icons look across the app. You can change it anytime from your profile.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {OPTIONS.map(({ value, title, description, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              className="clay-inset flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:-translate-y-0.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
