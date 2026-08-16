import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AnonSearchBar } from "@/components/AnonSearchBar";
import { AnonAvatar } from "@/components/AnonAvatar";
import { ReactionButtons } from "@/components/ReactionButtons";
import { TrustButton } from "@/components/TrustButton";
import { ReportButton } from "@/components/ReportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useReactionsQuery } from "@/hooks/useReactions";
import { useMyTrustsQuery, useTrustCountsQuery } from "@/hooks/useTrust";
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
  user_id: string;
  users: { anon_id: string } | null;
};

type PreviewComment = {
  id: string;
  content: string;
  created_at: string;
  anon_id: string | null;
};

type CommentPreviewEntry = {
  comments: PreviewComment[];
  total: number;
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
        .select("id, content, created_at, user_id, users ( anon_id )")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PostRow[];
    },
  });
}

/** One batched call for every post's comment preview + total count, instead of one query per post. */
function useFeedCommentPreviews(postIds: string[]) {
  const ids = [...new Set(postIds)].sort();
  return useQuery({
    queryKey: ["comment-previews", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("feed_comment_previews", {
        _post_ids: ids,
        _limit: COMMENT_PREVIEW_COUNT,
      });
      if (error) throw error;

      const map = new Map<string, CommentPreviewEntry>();
      for (const id of ids) map.set(id, { comments: [], total: 0 });

      for (const row of data ?? []) {
        const entry = map.get(row.post_id) ?? { comments: [], total: 0 };
        entry.total = row.total_count ?? entry.total;
        if (row.comment_id) {
          entry.comments.push({
            id: row.comment_id,
            content: row.content,
            created_at: row.created_at,
            anon_id: row.anon_id,
          });
        }
        map.set(row.post_id, entry);
      }

      // rows come back newest-first per post; reverse so preview reads oldest-to-newest
      for (const entry of map.values()) entry.comments.reverse();

      return map;
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

function PostCard({
  post,
  myUserId,
  allPostIds,
  allAuthorIds,
  reactionSummary,
  isTrusted,
  trustCount,
  commentPreview,
}: {
  post: PostRow;
  myUserId: string | undefined;
  allPostIds: string[];
  allAuthorIds: string[];
  reactionSummary: ReturnType<typeof useReactionsQuery>["data"] extends Map<string, infer V> | undefined
    ? V | undefined
    : undefined;
  isTrusted: boolean;
  trustCount: number | undefined;
  commentPreview: CommentPreviewEntry | undefined;
}) {
  const { identity } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

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
      void queryClient.invalidateQueries({ queryKey: ["comment-previews"] });
    },
    onError: (error: { message?: string; code?: string }) => {
      toast.error(describePostError(error));
    },
  });

  const comments = commentPreview?.comments ?? [];
  const total = commentPreview?.total ?? 0;
  const hiddenCount = total - comments.length;
  const trimmedReply = replyText.trim();

  const submitReply = () => {
    if (!trimmedReply || quickReply.isPending) return;
    quickReply.mutate(trimmedReply);
  };

  return (
    <div className="surface-interactive p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/post/$id" params={{ id: post.id }}>
            <AnonAvatar />
          </Link>
          <div className="flex flex-col">
            <Link
              to="/anon/$anonId"
              params={{ anonId: post.users?.anon_id ?? "" }}
              className="anon-tag transition-colors hover:underline"
            >
              {post.users?.anon_id ?? "Anon#••••"}
            </Link>
            <Link to="/post/$id" params={{ id: post.id }} className="meta">
              {relativeTime(post.created_at)}
            </Link>
          </div>
        </div>
        <TrustButton
          authorId={post.user_id}
          myUserId={myUserId}
          isTrusted={isTrusted}
          trustCount={trustCount}
          allAuthorIds={allAuthorIds}
        />
      </div>

      <Link
        to="/post/$id"
        params={{ id: post.id }}
        className="mt-4 block whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
      >
        {post.content}
      </Link>

      <div className="mt-3 flex items-center gap-4">
        <ReactionButtons
          targetType="post"
          targetId={post.id}
          summary={reactionSummary}
          myUserId={myUserId}
          allIds={allPostIds}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1.5 rounded p-1 text-xs font-medium transition-colors ${
            expanded ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-expanded={expanded}
        >
          <MessageCircle className="size-4" fill={expanded ? "currentColor" : "none"} />
          <span>{total}</span>
        </button>
        <div className="ml-auto">
          <ReportButton targetType="post" targetId={post.id} />
        </div>
      </div>

      {expanded ? (
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
          {comments.length === 0 ? (
            <p className="meta">No comments yet. Be the first to reply.</p>
          ) : null}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2 text-sm">
              <Link
                to="/anon/$anonId"
                params={{ anonId: comment.anon_id ?? "" }}
                className="anon-tag shrink-0 transition-colors hover:underline"
              >
                {comment.anon_id ?? "Anon#••••"}
              </Link>
              <Link
                to="/post/$id"
                params={{ id: post.id }}
                className="line-clamp-2 flex-1 text-foreground/80"
              >
                {comment.content}
              </Link>
            </div>
          ))}

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
                autoFocus
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
      ) : null}
    </div>
  );
}

function Feed() {
  const { session, identity, loading } = useAuth();
  const { data: posts, isLoading, isError } = useFeedQuery();
  const queryClient = useQueryClient();

  const postIds = (posts ?? []).map((p) => p.id);
  const authorIds = (posts ?? []).map((p) => p.user_id);

  const { data: reactionsMap } = useReactionsQuery(postIds, identity?.id);
  const { data: myTrusts } = useMyTrustsQuery(authorIds, identity?.id);
  const { data: trustCounts } = useTrustCountsQuery(authorIds);
  const { data: commentPreviews } = useFeedCommentPreviews(postIds);

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
        () => void queryClient.invalidateQueries({ queryKey: ["comment-previews"] }),
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
  }, [session, queryClient]);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Campus feed</h1>
      

      <AnonSearchBar />

      {session ? (
        <div className="mt-6">
          <Composer />
        </div>
      ) : null}

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
          <PostCard
            key={post.id}
            post={post}
            myUserId={identity?.id}
            allPostIds={postIds}
            allAuthorIds={authorIds}
            reactionSummary={reactionsMap?.get(post.id)}
            isTrusted={myTrusts?.has(post.user_id) ?? false}
            trustCount={trustCounts?.get(post.user_id)}
            commentPreview={commentPreviews?.get(post.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}