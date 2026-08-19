import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PostComposer } from "@/components/PostComposer";

export const Route = createFileRoute("/_authenticated/new-post")({
  head: () => ({
    meta: [{ title: "New post — UOL Underground" }],
  }),
  component: NewPostPage,
});

function NewPostPage() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">New post</h1>
        <PostComposer onPosted={() => void navigate({ to: "/" })} />
      </div>
    </AppShell>
  );
}
