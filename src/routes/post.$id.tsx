import { useEffect } from "react";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AnonAvatar } from "@/components/AnonAvatar";
import { ReactionButtons } from "@/components/ReactionButtons";
import { ReportButton } from "@/components/ReportButton";
import { TrustButton } from "@/components/TrustButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useReactionsQuery } from "@/hooks/useReactions";
import { useMyTrustsQuery, useTrustCountsQuery } from "@/hooks/useTrust";
import { supabase } from "@/integrations/supabase/client";

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

const MAX_COMMENT_LENGTH = 2000;

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: { anon_id: string } | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: { anon_id: string } | null;
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

/** Maps raw Supabase/Postgres errors to copy a student will understand. */
function describeError(error: { message?: string; code?: string } | null): string {
  const msg = error?.message ?? "";
  if (/blocked|moderat|not allowed|forbidden/i.test(msg)) {
    return "That contains language that isn't allowed here.";
  }
  if (error?.code === "23514") {
    return "Couldn't save that — check the content and try again.";
  }
  return "Something went wrong. Please try again.";
}

function usePostQuery(postId: string) {
  return useQuery({
    queryKey: ["posts", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, created_at, user_id, users ( anon_id )")
        .eq("id", postId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PostRow | null;
    },
  });
}

function useCommentsQuery(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, users ( anon_id )")
        .eq("post_id", postId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });
}

function CommentComposer({ postId }: { postId: string }) {
  const { identity } = useAuth();
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const createComment = useMutation({
    mutationFn: async (text: string) => {
      if (!identity) throw new Error("Not signed in");
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: identity.id,
        content: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      void queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (error: { message?: string; code?: string }) => {
      toast.error(describeError(error));
    },
  });

  const trimmed = content.trim();
  const remaining = MAX_COMMENT_LENGTH - content.length;
  const canSubmit =
    trimmed.length > 0 &&
    content.length <= MAX_COMMENT_LENGTH &&
    !createComment.isPending &&
    !identity?.is_banned;

  if (identity?.is_banned) {
    return (
      <div className="surface p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Your account has been suspended. You can still read replies, but you can't reply.
        </p>
      </div>
    );
  }

  return (
    <div className="surface p-4">
      <div className="flex items-start gap-3">
        <AnonAvatar className="size-8" />
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Reply as ${identity?.anon_id ?? "Anon#••••"}…`}
            className="min-h-[56px] resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
            maxLength={MAX_COMMENT_LENGTH + 20}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`meta ${remaining < 0 ? "text-destructive" : ""}`}>
              {remaining} characters left
            </span>
            <Button
              size="sm"
              disabled={!canSubmit}
              onClick={() => createComment.mutate(trimmed)}
            >
              {createComment.isPending ? "Replying…" : "Reply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostDetail() {
  const { id } = Route.useParams();
  const { session, identity } = useAuth();
  const { data: post, isLoading: postLoading, isError: postError } = usePostQuery(id);
  const { data: comments, isLoading: commentsLoading } = useCommentsQuery(id);
  const queryClient = useQueryClient();

  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const updatePost = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("posts").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingPost(false);
      void queryClient.invalidateQueries({ queryKey: ["posts", id] });
      void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      void queryClient.invalidateQueries({ queryKey: ["own-posts"] });
    },
    onError: (error: { message?: string; code?: string }) => toast.error(describeError(error)),
  });

  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase.from("comments").update({ content }).eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingCommentId(null);
      void queryClient.invalidateQueries({ queryKey: ["comments", id] });
      void queryClient.invalidateQueries({ queryKey: ["comment-previews"] });
      void queryClient.invalidateQueries({ queryKey: ["own-comments"] });
    },
    onError: (error: { message?: string; code?: string }) => toast.error(describeError(error)),
  });

  const reactionTargetIds = [
    ...(post ? [post.id] : []),
    ...((comments ?? []).map((c) => c.id)),
  ];
  const authorIds = [
    ...(post ? [post.user_id] : []),
    ...((comments ?? []).map((c) => c.user_id)),
  ];

  const { data: reactionsMap } = useReactionsQuery(reactionTargetIds, identity?.id);
  const { data: myTrusts } = useMyTrustsQuery(authorIds, identity?.id);
  const { data: trustCounts } = useTrustCountsQuery(authorIds);

  // Live updates: refresh comments/reactions whenever they change on this post.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`comments-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["comments", id] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => void queryClient.invalidateQueries({ queryKey: ["reactions"] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, id, queryClient]);

  return (
    <AppShell>
      <Link to="/" className="meta transition-colors hover:text-foreground">
        ← back to feed
      </Link>

      {postLoading ? <p className="meta mt-6 text-center">loading post…</p> : null}

      {postError ? (
        <p className="meta mt-6 text-center text-destructive">Couldn't load this post.</p>
      ) : null}

      {!postLoading && !postError && !post ? (
        <div className="surface mt-4 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This post doesn't exist or has been removed.
          </p>
        </div>
      ) : null}

      {post ? (
        <article className="surface mt-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <AnonAvatar />
              <div className="flex flex-col">
                <Link
                  to="/anon/$anonId"
                  params={{ anonId: post.users?.anon_id ?? "" }}
                  className="anon-tag transition-colors hover:underline"
                >
                  {post.users?.anon_id ?? "Anon#••••"}
                </Link>
                <span className="meta">{relativeTime(post.created_at)}</span>
              </div>
            </div>
            <TrustButton
              authorId={post.user_id}
              myUserId={identity?.id}
              isTrusted={myTrusts?.has(post.user_id) ?? false}
              trustCount={trustCounts?.get(post.user_id)}
              allAuthorIds={authorIds}
            />
          </div>
          {editingPost ? (
            <div className="mt-4 space-y-2">
              <Textarea
                value={postDraft}
                onChange={(e) => setPostDraft(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={2020}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPost(false)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <Button
                  size="sm"
                  disabled={!postDraft.trim() || updatePost.isPending}
                  onClick={() => updatePost.mutate(postDraft.trim())}
                >
                  {updatePost.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {post.content}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <ReactionButtons
              targetType="post"
              targetId={post.id}
              summary={reactionsMap?.get(post.id)}
              myUserId={identity?.id}
              allIds={reactionTargetIds}
            />
            <div className="flex items-center gap-3">
              {identity?.id === post.user_id ? (
                <button
                  type="button"
                  onClick={() => {
                    setPostDraft(post.content);
                    setEditingPost(true);
                  }}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Edit
                </button>
              ) : null}
              <ReportButton targetType="post" targetId={post.id} />
            </div>
          </div>
        </article>
      ) : null}

      {post && session ? (
        <div className="mt-6">
          <CommentComposer postId={id} />
        </div>
      ) : null}

      {post ? (
        <>
          <h2 className="mt-8 text-sm font-medium tracking-tight">
            Comments {comments?.length ? `(${comments.length})` : ""}
          </h2>
          <div className="mt-3 space-y-3">
            {commentsLoading ? <p className="meta text-center">loading comments…</p> : null}

            {!commentsLoading && comments?.length === 0 ? (
              <p className="meta text-center">No replies yet. Be the first.</p>
            ) : null}

            {comments?.map((comment) => (
              <div key={comment.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AnonAvatar className="size-8" />
                    <Link
                      to="/anon/$anonId"
                      params={{ anonId: comment.users?.anon_id ?? "" }}
                      className="anon-tag transition-colors hover:underline"
                    >
                      {comment.users?.anon_id ?? "Anon#••••"}
                    </Link>
                    <span className="meta">{relativeTime(comment.created_at)}</span>
                  </div>
                  <TrustButton
                    authorId={comment.user_id}
                    myUserId={identity?.id}
                    isTrusted={myTrusts?.has(comment.user_id) ?? false}
                    trustCount={trustCounts?.get(comment.user_id)}
                    allAuthorIds={authorIds}
                  />
                </div>
                {editingCommentId === comment.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      className="min-h-[64px] resize-none"
                      maxLength={MAX_COMMENT_LENGTH + 20}
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCommentId(null)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <Button
                        size="sm"
                        disabled={!commentDraft.trim() || updateComment.isPending}
                        onClick={() =>
                          updateComment.mutate({ commentId: comment.id, content: commentDraft.trim() })
                        }
                      >
                        {updateComment.isPending ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {comment.content}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
                  <ReactionButtons
                    targetType="comment"
                    targetId={comment.id}
                    summary={reactionsMap?.get(comment.id)}
                    myUserId={identity?.id}
                    allIds={reactionTargetIds}
                  />
                  <div className="flex items-center gap-3">
                    {identity?.id === comment.user_id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCommentDraft(comment.content);
                          setEditingCommentId(comment.id);
                        }}
                        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Edit
                      </button>
                    ) : null}
                    <ReportButton targetType="comment" targetId={comment.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </AppShell>
  );
}