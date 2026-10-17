import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { signOut } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { fbAuth } from "@/integrations/firebase/client";
import { getProfileCompletion, updateMyProfile } from "@/lib/users.functions";
import { needsProfileCompletion } from "@/lib/profile-completion";
import { Button } from "@/components/ui/button";
import { HackerLoader } from "@/components/effects/HackerLoader";
import { LoadingPanel } from "@/components/effects/HackerLoader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { withRequestTimeout } from "@/lib/request-timeout";

export function ProfileCompletion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getProfileCompletion);
  const saveProfile = useServerFn(updateMyProfile);
  const queryKey = ["profile-completion", user?.uid];
  const profile = useQuery({ queryKey, queryFn: () => withRequestTimeout(() => fetchProfile()), enabled: !!user, retry: false, staleTime: 60_000 });
  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(profile.data?.name ?? user?.displayName ?? "");
    setTelegram(profile.data?.telegram_id ?? "");
    setError("");
  }, [user?.uid, user?.displayName, profile.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await withRequestTimeout(() => saveProfile({ data: { name, telegram_id: telegram } }));
      // Read the saved Firebase record back before dismissing the dialog.
      const saved = await withRequestTimeout(() => fetchProfile());
      qc.setQueryData(queryKey, saved);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-profile"] }),
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  const open = profile.isPending || profile.isError || needsProfileCompletion(profile.data);
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>Your name and Telegram username</DialogDescription>
        </DialogHeader>
        {profile.isPending ? <LoadingPanel /> : profile.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">Could not load your profile. Please try again.</p>
            <Button className="w-full" onClick={() => profile.refetch()}>Try again</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="completion-name">Name</Label>
              <Input id="completion-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="completion-telegram">Telegram username</Label>
              <Input id="completion-telegram" placeholder="@username" value={telegram} onChange={(e) => setTelegram(e.target.value)} required maxLength={65} disabled={saving} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button variant="hero" type="submit" className="w-full" disabled={saving || !name.trim() || !telegram.trim().replace(/^@/, "")}>
              {saving ? <HackerLoader compact label="Saving your profile" /> : "Save and continue"}
            </Button>
          </form>
        )}
        <Button variant="ghost" disabled={saving} onClick={async () => { await signOut(fbAuth()); qc.clear(); }}>Log out</Button>
      </DialogContent>
    </Dialog>
  );
}