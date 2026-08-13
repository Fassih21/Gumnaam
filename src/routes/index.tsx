import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AnonAvatar } from "@/components/AnonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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

const MAX_POST_LENGTH = 2000;

const COMMENT_PREVIEW_COUNT = 2;

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  users: { anon_id: string } | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
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
function describePostError(error: { message?: string; code?: string } | null): string {
  const msg = error?.message ?? "";
  if (/blocked|moderat|not allowed|forbidden/i.test(msg)) {
    return "That post contains language that isn't allowed here.";
  }
  if (error?.code === "23514") {
    return "That post couldn't be saved — check the content and try again.";
  }
  return "Couldn't post right now. Please try again.";
}

function useFeedQuery() {
  return useQuery({
    queryKey: ["posts", "feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, created_at, users ( anon_id )")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PostRow[];
    },
  });
}

function Composer() {
  const { identity } = useAuth();
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: async (text: string) => {
      if (!identity) throw new Error("Not signed in");
      const { error } = await supabase.from("posts").insert({
        user_id: identity.id,
        content: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      toast.success("Posted anonymously.");
      void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
    onError: (error: { message?: string; code?: string }) => {
      toast.error(describePostError(error));
    },
  });

  const trimmed = content.trim();
  const remaining = MAX_POST_LENGTH - content.length;
  const canSubmit = trimmed.length > 0 && content.length <= MAX_POST_LENGTH && !createPost.isPending;

  return (
    <div className="surface p-4">
      <div className="flex items-start gap-3">
        <AnonAvatar />
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Post as ${identity?.anon_id ?? "Anon#••••"}…`}
            className="min-h-[72px] resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
            maxLength={MAX_POST_LENGTH + 20}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`meta ${remaining < 0 ? "text-destructive" : ""}`}>
              {remaining} characters left
            </span>
            <Button
              size="sm"
              disabled={!canSubmit}
              onClick={() => createPost.mutate(trimmed)}
            >
              {createPost.isPending ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function useCommentPreviewQuery(postId: string) {
  return useQuery({
    queryKey: ["comments", "preview", postId],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("comments")
        .select("id, content, created_at, users ( anon_id )", { count: "exact" })
        .eq("post_id", postId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(COMMENT_PREVIEW_COUNT);
      if (error) throw error;
      const comments = ((data ?? []) as unknown as CommentRow[]).slice().reverse();
      return { comments, total: count ?? 0 };
    },
  });
}

function PostCard({ post }: { post: PostRow }) {
  const { identity } = useAuth();
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();
  const { data } = useCommentPreviewQuery(post.id);

  const quickReply = useMutation({
    mutationFn: async (text: string) => {
      if (!identity) throw new Error("Not signed in");
      const { error } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: identity.id,
        content: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyText("");
      void queryClient.invalidateQueries({ queryKey: ["comments", "preview", post.id] });
    },
    onError: (error: { message?: string; code?: string }) => {
      toast.error(describePostError(error));
    },
  });

  const comments = data?.comments ?? [];
  const total = data?.total ?? 0;
  const hiddenCount = total - comments.length;
  const trimmedReply = replyText.trim();

  const submitReply = () => {
    if (!trimmedReply || quickReply.isPending) return;
    quickReply.mutate(trimmedReply);
  };

  return (
    <div className="surface-interactive p-5">
      <Link to="/post/$id" params={{ id: post.id }} className="block">
        <div className="flex items-center gap-3">
          <AnonAvatar />
          <div className="flex flex-col">
            <span className="anon-tag">{post.users?.anon_id ?? "Anon#••••"}</span>
            <span className="meta">{relativeTime(post.created_at)}</span>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {post.content}
        </p>
      </Link>

      {total > 0 ? (
        <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
          {hiddenCount > 0 ? (
            <Link
              to="/post/$id"
              params={{ id: post.id }}
              className="meta block transition-colors hover:text-foreground"
            >
              View all {total} comment{total === 1 ? "" : "s"}
            </Link>
          ) : null}
          {comments.map((comment) => (
            <Link
              key={comment.id}
              to="/post/$id"
              params={{ id: post.id }}
              className="flex gap-2 text-sm"
            >
              <span className="anon-tag shrink-0">{comment.users?.anon_id ?? "Anon#••••"}</span>
              <span className="line-clamp-2 text-foreground/80">{comment.content}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {identity ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
          <AnonAvatar className="size-6" />
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitReply();
              }
            }}
            placeholder="Add a comment…"
            className="h-8 flex-1 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {trimmedReply ? (
            <button
              type="button"
              onClick={submitReply}
              disabled={quickReply.isPending}
              className="shrink-0 text-sm font-medium text-primary disabled:opacity-50"
            >
              {quickReply.isPending ? "Posting…" : "Post"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Feed() {
  const { session, loading } = useAuth();
  const { data: posts, isLoading, isError } = useFeedQuery();
  const queryClient = useQueryClient();

  // Live updates: refresh the feed whenever a post is added, edited, or removed,
  // and refresh comment previews whenever any comment changes.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => void queryClient.invalidateQueries({ queryKey: ["comments", "preview"] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, queryClient]);

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
        {isLoading ? <p className="meta text-center">loading feed…</p> : null}

        {isError ? (
          <p className="meta text-center text-destructive">Couldn't load the feed. Try refreshing.</p>
        ) : null}

        {!isLoading && !isError && posts?.length === 0 ? (
          <div className="surface p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No posts yet. Be the first to say something.
            </p>
          </div>
        ) : null}

        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {session ? (
        <div className="mt-6">
          <Composer />
        </div>
      ) : null}
    </AppShell>
  );
}