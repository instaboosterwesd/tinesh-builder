// Short, human-friendly Product ID derived from the template's id.
export function productId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function matchesProduct(t: { id: string; name: string }, q: string) {
  const s = q.trim().toLowerCase().replace(/^#/, "");
  if (!s) return true;
  return productId(t.id).toLowerCase().includes(s) || t.name.toLowerCase().includes(s) || t.id.toLowerCase().startsWith(s);
}

// Estimated progress while the build runs (the builder doesn't report real %).
export function buildProgress(status: string, startedAt: string, now = Date.now()) {
  if (status === "success") return 100;
  if (status === "failed" || status === "rejected") return 0;
  const secs = Math.max(0, (now - new Date(startedAt).getTime()) / 1000);
  return Math.min(95, Math.round(5 + (secs / 240) * 90));
}
