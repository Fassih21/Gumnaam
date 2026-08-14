import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { AnonAvatar } from "@/components/AnonAvatar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/anon/$anonId")({
  head: ({ params }) => ({
    meta: [{ title: `${params.anonId} — UOL Underground` }],
  }),
  component: AnonProfile,
});

type ProfileUser = { id: string; anon_id: string; created_at: string };
type ProfilePost = { id: string; content: string; created_at: string };
type ProfileComment = {
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

function useProfileUserQuery(anonId: string) {
  return useQuery({
    queryKey: ["anon-profile-user", anonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, anon_id, created_at")
        .eq("anon_id", anonId)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileUser | null;
    },
  });
}

function useTrustScoreQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["trust-score", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trusts")
        .select("id", { count: "exact", head: true })
        .eq("trusted_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useProfilePostsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["anon-profile-posts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, created_at")
        .eq("user_id", userId!)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfilePost[];
    },
  });
}

function useProfileCommentsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["anon-profile-comments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, post_id, posts ( content )")
        .eq("user_id", userId!)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProfileComment[];
    },
  });
}

function AnonProfile() {
  const { anonId } = Route.useParams();
  const { data: profileUser, isLoading: userLoading } = useProfileUserQuery(anonId);
  const { data: trustScore } = useTrustScoreQuery(profileUser?.id);
  const { data: posts, isLoading: postsLoading } = useProfilePostsQuery(profileUser?.id);
  const { data: comments, isLoading: commentsLoading } = useProfileCommentsQuery(profileUser?.id);

  return (
    <AppShell>
      <Link to="/" className="meta transition-colors hover:text-foreground">
        ← back to feed
      </Link>

      {userLoading ? <p className="meta mt-6 text-center">loading profile…</p> : null}

      {!userLoading && !profileUser ? (
        <div className="surface mt-4 p-6 text-center">
          <p className="text-sm text-muted-foreground">No user found with that anon ID.</p>
        </div>
      ) : null}

      {profileUser ? (
        <>
          <div className="surface mt-4 flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <AnonAvatar />
              <div>
                <p className="anon-tag text-base">{profileUser.anon_id}</p>
                <p className="meta">member since {relativeTime(profileUser.created_at)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Trust score</p>
              <p className="text-2xl font-semibold">{trustScore ?? 0}</p>
            </div>
          </div>

          <h2 className="mt-8 text-sm font-medium tracking-tight">
            Posts {posts?.length ? `(${posts.length})` : ""}
          </h2>
          <div className="mt-3 space-y-3">
            {postsLoading ? <p className="meta text-center">loading…</p> : null}
            {!postsLoading && posts?.length === 0 ? (
              <p className="meta text-center">No posts yet.</p>
            ) : null}
            {posts?.map((post) => (
              <Link
                key={post.id}
                to="/post/$id"
                params={{ id: post.id }}
                className="surface block p-4"
              >
                <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
                <p className="meta mt-2">{relativeTime(post.created_at)}</p>
              </Link>
            ))}
          </div>

          <h2 className="mt-8 text-sm font-medium tracking-tight">
            Comments {comments?.length ? `(${comments.length})` : ""}
          </h2>
          <div className="mt-3 space-y-3">
            {commentsLoading ? <p className="meta text-center">loading…</p> : null}
            {!commentsLoading && comments?.length === 0 ? (
              <p className="meta text-center">No comments yet.</p>
            ) : null}
            {comments?.map((comment) => (
              <Link
                key={comment.id}
                to="/post/$id"
                params={{ id: comment.post_id }}
                className="surface block p-4"
              >
                <p className="text-sm leading-relaxed text-foreground/90">{comment.content}</p>
                <p className="meta mt-2">on: {comment.posts?.content?.slice(0, 60) ?? "a post"}…</p>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </AppShell>
  );
}