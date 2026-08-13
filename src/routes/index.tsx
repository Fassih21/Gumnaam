import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AnonAvatar } from "@/components/AnonAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UOL Underground — Anonymous Campus Feed" },
      {
        name: "description",
        content:
          "An anonymous discussion feed for University of Lahore students. Verified campus emails only, posts shown under anonymous handles.",
      },
      { property: "og:title", content: "UOL Underground — Anonymous Campus Feed" },
      {
        property: "og:description",
        content: "Anonymous campus discussion for verified University of Lahore students.",
      },
    ],
  }),
  component: Feed,
});

function Feed() {
  const { session, identity, loading } = useAuth();

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Campus feed</h1>
      <p className="meta mt-1">university of lahore · anonymous · verified students only</p>

      {!loading && !session ? (
        <div className="surface mt-6 p-6">
          <h2 className="text-base font-medium">You're not signed in</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Only verified <span className="font-mono">@student.uol.edu.pk</span> accounts can read
            and post here. Your name and email are never shown to anyone.
          </p>
          <div className="mt-5 flex gap-2">
            <Button asChild>
              <Link to="/signup">Create account</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Link
            key={i}
            to="/post/$id"
            params={{ id: String(i) }}
            className="surface-interactive block p-5"
          >
            <div className="flex items-center gap-3">
              <AnonAvatar />
              <div className="flex flex-col">
                <span className="anon-tag">{identity?.anon_id ?? "Anon#••••"}</span>
                <span className="meta">placeholder · feed coming soon</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Posts will appear here once the feed is wired up. This card shows the layout,
              spacing and elevation the real posts will use.
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
