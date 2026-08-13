import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AnonAvatar } from "@/components/AnonAvatar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const { identity, session, loading } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-primary" />
            <span className="font-mono text-sm tracking-tight">uol/underground</span>
          </Link>

          {loading ? null : session ? (
            <div className="flex items-center gap-2">
              {identity?.is_admin ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Admin</Link>
                </Button>
              ) : null}
              <span className="anon-tag hidden sm:inline">{identity?.anon_id ?? "…"}</span>
              <AnonAvatar className="size-8" />
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">{children}</main>
    </div>
  );
}
