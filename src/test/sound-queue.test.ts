import { describe, expect, it } from "vitest";
import { SoundQueue, soundKey, type Playable } from "@/lib/sound-queue";

function fake() {
  const started: string[] = [];
  const items: Playable[] = [];
  const q = new SoundQueue((url) => {
    const a: Playable = { onended: null, onerror: null, play: () => { started.push(url); } };
    items.push(a);
    return a;
  });
  return { q, started, items };
}

describe("click sound queue", () => {
  it("does not start the second sound until the first ends", () => {
    const { q, started, items } = fake();
    q.add("a.mp3");
    q.add("b.mp3");
    expect(started).toEqual(["a.mp3"]);
    items[0]!.onended!();
    expect(started).toEqual(["a.mp3", "b.mp3"]);
  });
  it("moves on when a sound fails to load", () => {
    const { q, started, items } = fake();
    q.add("bad.mp3");
    q.add("ok.mp3");
    items[0]!.onerror!();
    expect(started).toEqual(["bad.mp3", "ok.mp3"]);
  });
  it("builds safe slot keys", () => {
    expect(soundKey("nav", "/wallet")).toBe("nav_wallet");
  });
});
