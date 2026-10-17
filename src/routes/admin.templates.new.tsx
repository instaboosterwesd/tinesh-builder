import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Upload, Image as ImageIcon, Film, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateTemplate, adminUploadUrl } from "@/lib/builder.functions";
import { getAdminPass } from "@/lib/admin-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BASE_APKS } from "@/lib/base-apks";

export const Route = createFileRoute("/admin/templates/new")({ component: NewTemplate });

async function upload(file: File, kind: "image" | "video") {
  const { path, token } = await adminUploadUrl({ data: { password: getAdminPass(), filename: file.name, kind } });
  const { error } = await supabase.storage.from("media").uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return path;
}

function NewTemplate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [html, setHtml] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [baseApk, setBaseApk] = useState<string>("bingo");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!html.trim()) { toast.error("Add HTML code or upload an .html file"); return; }
    setSaving(true);
    const t = toast.loading("Uploading files…");
    try {
      const image_url = image ? await upload(image, "image") : "";
      const video_url = video ? await upload(video, "video") : "";
      toast.loading("Saving template…", { id: t });
      await adminCreateTemplate({
        data: { password: getAdminPass(), name: f.get("name"), description: f.get("description"), base_apk: baseApk, html, image_url, video_url },
      });
      toast.success("Template added", { id: t });
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["templates"] });
      navigate({ to: "/admin/templates" });
    } catch (err) {
      toast.error((err as Error).message, { id: t });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold sm:text-3xl">Add template</h1>
      <p className="mt-1 text-muted-foreground">Pick the APK, name the design, upload HTML and optional image/video.</p>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required maxLength={100} placeholder="Design name" /></div>
          <div className="space-y-1.5">
            <Label>APK</Label>
            <Select value={baseApk} onValueChange={setBaseApk}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BASE_APKS.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">This app is built when a user requests this design.</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" maxLength={1000} rows={3} /></div>
          <FilePick label="Preview image (optional)" accept="image/*" Icon={ImageIcon} file={image} onChange={setImage} />
          <FilePick label="Preview video (optional)" accept="video/*" Icon={Film} file={video} onChange={setVideo} />
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <Label>HTML</Label>
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-primary">
              <FileCode2 className="size-4" /> Upload .html
              <input type="file" accept=".html,.htm,text/html" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setHtml(await file.text()); toast.success(`Loaded ${file.name}`); } }} />
            </label>
          </div>
          <Textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={10} className="font-mono text-xs" placeholder="<!doctype html>…" />
          <Label>Preview</Label>
          <iframe title="preview" srcDoc={html} sandbox="allow-scripts" className="h-64 w-full rounded-lg border border-border bg-background" />
        </div>
        <div className="lg:col-span-2">
          <Button type="submit" variant="hero" size="lg" disabled={saving}><Upload /> {saving ? "Saving…" : "Save template"}</Button>
        </div>
      </form>
    </div>
  );
}

function FilePick({ label, accept, Icon, file, onChange }: { label: string; accept: string; Icon: typeof ImageIcon; file: File | null; onChange: (f: File | null) => void }) {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground hover:border-primary/60">
        {preview && accept.startsWith("image") && <img src={preview} alt="" className="max-h-32 rounded-lg" />}
        {preview && accept.startsWith("video") && <video src={preview} className="max-h-32 rounded-lg" muted />}
        {!preview && <Icon className="size-6" />}
        <span>{file ? file.name : "Click to choose a file (max 50MB)"}</span>
        <input type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}
