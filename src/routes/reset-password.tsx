import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password — UOL Underground" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase turns the email link into a recovery session automatically.
    // PASSWORD_RECOVERY fires once that session is set; also handle the
    // case where a session already exists by the time this mounts.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate({ to: "/", replace: true }), 1500);
  };

  return (
    <AppShell>
      <div className="surface mx-auto mt-10 max-w-md p-7">
        <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Verifying your reset link… if this doesn't update in a few seconds, the link
            may have expired — request a new one from the login page.
          </p>
        ) : done ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Password updated — taking you to the feed…
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}