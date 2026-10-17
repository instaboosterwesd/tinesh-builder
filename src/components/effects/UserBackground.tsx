import { useEffect, useState } from "react";
import desktopVideo from "@/assets/dashboard-light.mp4.asset.json";
import desktopWebm from "@/assets/dashboard-desktop.webm.asset.json";

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

export function UserBackground() {
  const showVideo = useDesktopVideo();
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
