import { baseApkLabel } from "@/lib/base-apks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, PlusCircle, Trash2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useAdminTemplates } from "@/lib/admin-queries";
import { adminDeleteTemplate } from "@/lib/builder.functions";
import { getAdminPass } from "@/lib/admin-session";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/templates/")({ component: TemplatesAdmin });

function TemplatesAdmin() {
  const { data = [], isLoading } = useAdminTemplates();
  const qc = useQueryClient();

  async function remove(id: string) {
    try {
      await adminDeleteTemplate({ data: { password: getAdminPass(), id } });
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Templates</h1>
          <p className="mt-1 text-muted-foreground">{data.length} templates</p>
        </div>
        <Button variant="hero" asChild><Link to="/admin/templates/new"><PlusCircle /> Add</Link></Button>
      </div>
      <div className="mt-6 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {data.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative aspect-video bg-muted">
              {t.image ? <img src={t.image} alt={t.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="text-muted-foreground" /></div>}
              {t.video && <PlayCircle className="absolute right-3 top-3 size-5 text-primary" />}
            </div>
            <div className="flex items-start justify-between gap-2 p-4">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{baseApkLabel(t.base_apk)}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete"><Trash2 /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{t.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>This removes the template and its image and video.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(t.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
