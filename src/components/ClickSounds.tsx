import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAudioConfig } from "@/lib/audio.functions";
import { SoundQueue } from "@/lib/sound-queue";

export const audioConfigQuery = { queryKey: ["audio-config"], queryFn: () => getAudioConfig(), staleTime: 60_000 } as const;

/** Mounted once in the root: plays the admin-uploaded sound for any clicked element with data-sound. */
export function ClickSounds() {
  const { data } = useQuery(audioConfigQuery);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    const q = new SoundQueue((url) => new Audio(url));
    const onClick = (e: MouseEvent) => {
      const cfg = ref.current;
      if (!cfg?.enabled) return;
      const el = (e.target as Element | null)?.closest?.("[data-sound]");
      const key = el?.getAttribute("data-sound");
      const url = key ? cfg.sounds[key] : undefined;
      if (url) q.add(url);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
