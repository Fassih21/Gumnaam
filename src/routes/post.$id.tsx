import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AnonAvatar } from "@/components/AnonAvatar";

export const Route = createFileRoute("/post/$id")({
  head: () => ({
    meta: [
      { title: "Post — UOL Underground" },
      {
        name: "description",
        content:
          "Read an anonymous post and its replies from the University of Lahore campus feed.",
      },
      { property: "og:title", content: "Post — UOL Underground" },
      {
        property: "og:description",
        content: "An anonymous post from the University of Lahore campus feed.",
      },
    ],
  }),
  component: PostDetail,
});

function PostDetail() {
  const { id } = Route.useParams();

  return (
    <AppShell>
      <Link to="/" className="meta transition-colors hover:text-foreground">
        ← back to feed
      </Link>

      <article className="surface mt-4 p-5">
        <div className="flex items-center gap-3">
          <AnonAvatar />
          <div className="flex flex-col">
            <span className="anon-tag">Anon#••••</span>
            <span className="meta">post {id}</span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Post content will render here. Reactions and trust actions arrive in the next phase.
        </p>
      </article>

      <h2 className="mt-8 text-sm font-medium tracking-tight">Comments</h2>
      <div className="mt-3 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="surface p-4">
            <div className="flex items-center gap-3">
              <AnonAvatar className="size-8" />
              <span className="anon-tag">Anon#••••</span>
              <span className="meta">placeholder</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Comment threads are not wired up yet.
            </p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
