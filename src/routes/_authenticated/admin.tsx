import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — UOL Underground" },
      {
        name: "description",
        content:
          "Moderation dashboard for UOL Underground admins: blocked keywords, reports and identity lookups.",
      },
      { property: "og:title", content: "Admin — UOL Underground" },
      { property: "og:description", content: "Moderation dashboard for UOL Underground admins." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { identity, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <p className="meta mt-10 text-center">checking access…</p>
      </AppShell>
    );
  }

  if (!identity?.is_admin) {
    return (
      <AppShell>
        <div className="surface mx-auto mt-10 max-w-md p-7 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard is only available to moderators.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to feed
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
      <p className="meta mt-1">admin · {identity.anon_id}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { title: "Blocked keywords", body: "Maintain the auto-moderation word list." },
          { title: "Reported content", body: "Review flagged posts and comments." },
          { title: "Identity lookup", body: "Resolve an anon handle to a real student." },
          { title: "Removals", body: "Soft-delete posts and comments." },
        ].map((card) => (
          <div key={card.title} className="surface p-5">
            <h2 className="text-sm font-medium">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
            <p className="meta mt-3">coming in phase 2</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
