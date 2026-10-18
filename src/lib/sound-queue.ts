// Plays click sounds one at a time: a new sound waits until the current one ends.

export type Playable = { play: () => Promise<void> | void; onended: ((...a: never[]) => unknown) | null; onerror: ((...a: never[]) => unknown) | null };

/** Firebase-safe key for a sound slot (letters, numbers, _ and - only). */
export function soundKey(kind: string, ...ids: string[]): string {
  return [kind, ...ids].join("_").replace(/[^A-Za-z0-9_-]/g, "");
}

export class SoundQueue {
  private queue: string[] = [];
  private playing = false;
  constructor(private make: (url: string) => Playable, private max = 5) {}

  get busy() { return this.playing; }
  get pending() { return this.queue.length; }

  add(url: string) {
    if (!url) return;
    if (this.queue.length >= this.max) return; // avoid a long backlog from rapid tapping
    this.queue.push(url);
    if (!this.playing) this.next();
  }

  private next() {
    const url = this.queue.shift();
    if (!url) { this.playing = false; return; }
    this.playing = true;
    const a = this.make(url);
    const done = () => { a.onended = null; a.onerror = null; this.next(); };
    a.onended = done;
    a.onerror = done;
    try {
      const p = a.play();
      if (p && typeof (p as Promise<void>).catch === "function") (p as Promise<void>).catch(done);
    } catch { done(); }
  }
}
