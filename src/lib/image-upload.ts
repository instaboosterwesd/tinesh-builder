import { str } from "@/lib/server-helpers";

export function validateLogoUpload(d: { filename: string; image: string }) {
  const filename = str(d?.filename, "File", 200);
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!["png", "jpg", "jpeg", "webp"].includes(ext)) throw new Error("Logo must be PNG, JPG or WEBP");
  const image = String(d?.image ?? "").replace(/^data:image\/[a-z+]+;base64,/, "");
  if (!image || image.length > 4_500_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new Error("Image must be under 3 MB");
  return { image, ext };
}

export async function uploadImage(image: string): Promise<string> {
  const key = process.env["IMGBB_API_KEY"];
  if (!key) throw new Error("Photo upload is not configured");
  const form = new FormData();
  form.append("image", image);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
    method: "POST", body: form, signal: AbortSignal.timeout(30_000),
  });
  const json = await res.json().catch(() => null) as { success?: boolean; data?: { url?: string } } | null;
  const url = json?.data?.url;
  if (!res.ok || !json?.success || !url || !/^https:\/\/i\.ibb\.co\//.test(url)) {
    throw new Error("Photo upload failed. Please try again.");
  }
  return url;
}