// Browser-side video uploads to Cloudinary using an unsigned upload preset (public config, no secret).
export const CLOUDINARY_CLOUD = "dbuwndic4";
export const CLOUDINARY_PRESET = "ml_default";

export async function uploadVideo(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  form.set("upload_preset", CLOUDINARY_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`, { method: "POST", body: form });
  const body = (await r.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!r.ok || !body.secure_url) throw new Error(body.error?.message || `Video upload failed (${r.status})`);
  return body.secure_url;
}
