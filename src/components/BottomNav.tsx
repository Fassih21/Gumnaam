import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, PlusSquare, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const { session } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!session) return null;

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
        <Link
          to="/"
          aria-label="Home"
          className={`flex h-full flex-1 items-center justify-center ${
            isActive("/") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Home className="size-6" strokeWidth={isActive("/") ? 2.5 : 2} />
        </Link>

        <Link
          to="/notifications"
          aria-label="Notifications"
          className={`flex h-full flex-1 items-center justify-center ${
            isActive("/notifications") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Bell className="size-6" strokeWidth={isActive("/notifications") ? 2.5 : 2} />
        </Link>

        <Link
          to="/new-post"
          aria-label="New post"
          className={`flex h-full flex-1 items-center justify-center ${
            isActive("/new-post") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <PlusSquare className="size-6" strokeWidth={isActive("/new-post") ? 2.5 : 2} />
        </Link>

        <Link
          to="/search"
          aria-label="Search accounts"
          className={`flex h-full flex-1 items-center justify-center ${
            isActive("/search") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Search className="size-6" strokeWidth={isActive("/search") ? 2.5 : 2} />
        </Link>

        <Link
          to="/me"
          aria-label="Profile"
          className={`flex h-full flex-1 items-center justify-center ${
            isActive("/me") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <User className="size-6" strokeWidth={isActive("/me") ? 2.5 : 2} />
        </Link>
      </div>
    </nav>
  );
}
