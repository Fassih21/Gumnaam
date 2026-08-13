import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isUolEmail } from "@/lib/uol";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — UOL Underground" },
      {
        name: "description",
        content:
          "Log in to UOL Underground with your verified @student.uol.edu.pk account to browse the anonymous campus feed.",
      },
      { property: "og:title", content: "Log in — UOL Underground" },
      {
        property: "og:description",
        content: "Sign in with your verified University of Lahore student account.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isUolEmail(email)) {
      setError("Use your university email: [student-id]@student.uol.edu.pk");
      return;
    }

    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("confirm")
          ? "Verify your university email first — check your inbox for the link."
          : signInError.message,
      );
      return;
    }
    void navigate({ to: "/", replace: true });
  };

  return (
    <AppShell>
      <div className="surface mx-auto mt-10 max-w-md p-7">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="meta mt-1">verified students only</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">University email</Label>
            <Input
              id="email"
              type="email"
              className="font-mono"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="70012345@student.uol.edu.pk"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          No account yet?{" "}
          <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
