import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, EyeOff, Menu, Settings, User, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AnonAvatar } from "@/components/AnonAvatar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const { identity, session, loading } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="relative mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
          <div className="z-10 flex items-center gap-1">
            {!isHome ? (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-9 w-9 rounded-full"
                aria-label="Go back"
                onClick={() => router.history.back()}
              >
                <ArrowLeft className="size-5" strokeWidth={2.25} />
              </Button>
            ) : null}

            {loading ? null : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full ${isHome ? "-ml-2" : ""}`}
                    aria-label="Open menu"
                  >
                    <Menu className="size-5" strokeWidth={2.25} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                    <AnonAvatar className="size-6" />
                    <span className="anon-tag">{identity?.anon_id ?? "…"}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {identity?.is_admin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link to="/me" className="flex items-center gap-2">
                      <User className="size-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2">
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <Link
            to="/"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
          >
            <EyeOff className="size-4 text-primary" strokeWidth={2.25} />
            <span className="wordmark text-lg text-foreground">Gumnaam</span>
          </Link>

          {!loading && !session ? (
            <div className="z-10 flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </div>
          ) : (
            <div className="z-10 w-9" aria-hidden="true" />
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">{children}</main>

      <BottomNav />
    </div>
  );
}
