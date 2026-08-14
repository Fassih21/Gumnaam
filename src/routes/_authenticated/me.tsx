import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({
    meta: [{ title: "My Profile — UOL Underground" }],
  }),
  component: MyDashboard,
});

type OwnPost = { id: string; content: string; created_at: string };
type OwnComment = {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  posts: { content: string } | null;
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function useTrustScoreQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["trust-score", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("trusts")
        .select("id", { count: "exact", head: true })
        .eq("trusted_id", userId);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useOwnPostsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["own-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as OwnPost[];
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, created_at")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OwnPost[];
    },
  });
}

function useOwnCommentsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["own-comments", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as OwnComment[];
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, post_id, posts ( content )")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OwnComment[];
    },
  });
}

function MyDashboard() {
  const { identity } = useAuth();
  const queryClient = useQueryClient();

  const { data: trustScore } = useTrustScoreQuery(identity?.id);
  const { data: posts, isLoading: postsLoading } = useOwnPostsQuery(identity?.id);
  const { data: comments, isLoading: commentsLoading } = useOwnCommentsQuery(identity?.id);

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted.");
      void queryClient.invalidateQueries({ queryKey: ["own-posts", identity?.id] });
      void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
    onError: () => toast.error("Couldn't delete that post."),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment deleted.");
      void queryClient.invalidateQueries({ queryKey: ["own-comments", identity?.id] });
    },
    onError: () => toast.error("Couldn't delete that comment."),
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
      <p className="meta mt-1">{identity?.anon_id ?? "…"} · only you can see this page</p>

      <div className="surface mt-6 flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">Trust score</p>
          <p className="mt-1 text-2xl font-semibold">{trustScore ?? 0}</p>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-medium tracking-tight">
        My posts {posts?.length ? `(${posts.length})` : ""}
      </h2>
      <div className="mt-3 space-y-3">
        {postsLoading ? <p className="meta text-center">loading…</p> : null}
        {!postsLoading && posts?.length === 0 ? (
          <p className="meta text-center">You haven't posted anything yet.</p>
        ) : null}
        {posts?.map((post) => (
          <div key={post.id} className="surface p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                to="/post/$id"
                params={{ id: post.id }}
                className="flex-1 text-sm leading-relaxed text-foreground/90"
              >
                {post.content}
              </Link>
              <button
                type="button"
                onClick={() => deletePost.mutate(post.id)}
                disabled={deletePost.isPending}
                className="shrink-0 text-sm font-medium text-destructive disabled:opacity-50"
              >
                Delete
              </button>
            </div>
            <p className="meta mt-2">{relativeTime(post.created_at)}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-medium tracking-tight">
        My comments {comments?.length ? `(${comments.length})` : ""}
      </h2>
      <div className="mt-3 space-y-3">
        {commentsLoading ? <p className="meta text-center">loading…</p> : null}
        {!commentsLoading && comments?.length === 0 ? (
          <p className="meta text-center">You haven't commented yet.</p>
        ) : null}
        {comments?.map((comment) => (
          <div key={comment.id} className="surface p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                to="/post/$id"
                params={{ id: comment.post_id }}
                className="flex-1 text-sm leading-relaxed text-foreground/90"
              >
                {comment.content}
              </Link>
              <button
                type="button"
                onClick={() => deleteComment.mutate(comment.id)}
                disabled={deleteComment.isPending}
                className="shrink-0 text-sm font-medium text-destructive disabled:opacity-50"
              >
                Delete
              </button>
            </div>
            <p className="meta mt-2">on: {comment.posts?.content?.slice(0, 60) ?? "a post"}…</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}