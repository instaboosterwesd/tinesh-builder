import { useEffect, useState } from "react";
import desktopVideo from "@/assets/dashboard-light.mp4.asset.json";
import desktopWebm from "@/assets/dashboard-desktop.webm.asset.json";
import { useSiteSettings } from "@/hooks/useSiteSettings";

// Desktop computers (Windows/Mac/Linux, wide screen) get a persistent looping video;
// phones keep the theme background image.
function useDesktopVideo() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOn(mq.matches && !reduce.matches);
    update();
    mq.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => { mq.removeEventListener("change", update); reduce.removeEventListener("change", update); };
  }, []);
  return on;
}

/** Applies admin appearance settings (video on/off, card see-through levels) to the page. */
function useAppearance() {
  const { data } = useSiteSettings();
  const videoOn = data?.desktop_video !== false;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset["video"] = videoOn ? "on" : "off";
    if (data) {
      root.style.setProperty("--glass-desktop", String(data.glass_desktop ?? 4));
      root.style.setProperty("--glass-mobile", String(data.glass_mobile ?? 20));
    }
  }, [videoOn, data]);
  return videoOn;
}

export function UserBackground() {
  const videoOn = useAppearance();
  const showVideo = useDesktopVideo() && videoOn;
  return (
    <div className="user-effects dashboard-background" aria-hidden="true">
      {showVideo && (
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={desktopWebm.url} type="video/webm" />
          <source src={desktopVideo.url} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
