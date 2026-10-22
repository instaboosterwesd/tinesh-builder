import { useEffect, useState } from "react";

// Visitor-chosen device performance: "low" swaps animated premium stickers
// for plain emojis; "high" keeps the animated ones. Saved per device.
export type DevicePerformance = "low" | "high";

const KEY = "appforge-device-performance";
const EVENT = "appforge-device-performance-change";

export function getDevicePerformance(): DevicePerformance | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "low" || v === "high" ? v : null;
  } catch {
    return null;
  }
}

export function setDevicePerformance(value: DevicePerformance) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // private mode etc. — still notify this tab so the choice applies now
  }
  window.dispatchEvent(new CustomEvent<DevicePerformance>(EVENT, { detail: value }));
}

/** null = visitor has not chosen yet (show the one-time dialog). */
export function useDevicePerformance(): DevicePerformance | null {
  const [value, setValue] = useState<DevicePerformance | null>(null);
  useEffect(() => {
    setValue(getDevicePerformance());
    const onChange = (e: Event) => setValue((e as CustomEvent<DevicePerformance>).detail ?? getDevicePerformance());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return value;
}
