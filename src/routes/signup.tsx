import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isUolEmail } from "@/lib/uol";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — UOL Underground" },
      {
        name: "description",
        content:
          "Create an anonymous UOL Underground account with your @student.uol.edu.pk email and verify it to join the campus feed.",
      },
      { property: "og:title", content: "Sign up — UOL Underground" },
      {
        property: "og:description",
        content: "Verified University of Lahore students only. Post anonymously.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!isUolEmail(email)) {
      setError("Use your university email: [student-id]@student.uol.edu.pk");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: name.trim() },
      },
    });
    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AppShell>
        <div className="surface mx-auto mt-10 max-w-md p-7">
          <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-mono text-foreground">{email.trim().toLowerCase()}</span>. You
            can't log in until it's verified. Your anonymous handle is generated the moment you
            first sign in.
          </p>
          <Button className="mt-6 w-full" onClick={() => void navigate({ to: "/login" })}>
            Go to login
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="surface mx-auto mt-10 max-w-md p-7">
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="meta mt-1">university of lahore students only</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ayesha Khan"
              autoComplete="name"
            />
            <p className="meta">Never shown publicly.</p>
          </div>

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
              autoComplete="new-password"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Already verified?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
