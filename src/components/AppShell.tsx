import { Link, useNavigate } from "@tanstack/react-router";
import { EyeOff } from "lucide-react";
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
            <EyeOff className="size-4 text-primary" strokeWidth={2.25} />
            <span className="wordmark text-lg text-foreground">Gumnaam</span>
          </Link>

          {loading ? null : session ? (
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 py-1 pl-1 pr-1.5">
              {identity?.is_admin ? (
                <Button asChild variant="ghost" size="sm" className="h-7 rounded-full px-2.5 text-xs">
                  <Link to="/admin">Admin</Link>
                </Button>
              ) : null}
              <Link
                to="/me"
                className="anon-tag flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-secondary"
              >
                <AnonAvatar className="size-6" />
                <span className="hidden sm:inline">{identity?.anon_id ?? "…"}</span>
              </Link>
              <Button variant="ghost" size="sm" className="h-7 rounded-full px-2.5 text-xs" onClick={signOut}>
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