import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin — UOL Underground" }],
  }),
  component: AdminDashboard,
});

type BlockedKeyword = { id: string; keyword: string; created_at: string };
type ModeratedPost = {
  id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  user_id: string;
  users: { anon_id: string } | null;
};
type ModeratedComment = {
  id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  user_id: string;
  post_id: string;
  users: { anon_id: string } | null;
};
type RevealedIdentity = { id: string; anon_id: string; name: string; uol_email: string };

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

/* ---------------- Keyword management ---------------- */

function useKeywordsQuery() {
  return useQuery({
    queryKey: ["admin-keywords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_keywords")
        .select("id, keyword, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlockedKeyword[];
    },
  });
}

function KeywordsTab() {
  const { data: keywords, isLoading } = useKeywordsQuery();
  const [newKeyword, setNewKeyword] = useState("");
  const queryClient = useQueryClient();

  const addKeyword = useMutation({
    mutationFn: async (keyword: string) => {
      const { error } = await supabase.from("blocked_keywords").insert({ keyword: keyword.trim().toLowerCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewKeyword("");
      toast.success("Keyword blocked.");
      void queryClient.invalidateQueries({ queryKey: ["admin-keywords"] });
    },
    onError: (error: { message?: string }) => {
      toast.error(/duplicate|unique/i.test(error.message ?? "") ? "Already blocked." : "Couldn't add that keyword.");
    },
  });

  const removeKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Keyword removed.");
      void queryClient.invalidateQueries({ queryKey: ["admin-keywords"] });
    },
    onError: () => toast.error("Couldn't remove that keyword."),
  });

  const trimmed = newKeyword.trim();

  return (
    <div className="mt-4 space-y-4">
      <div className="surface flex gap-2 p-4">
        <Input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="Add a blocked keyword…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed && !addKeyword.isPending) addKeyword.mutate(trimmed);
          }}
        />
        <Button
          disabled={!trimmed || addKeyword.isPending}
          onClick={() => addKeyword.mutate(trimmed)}
        >
          Add
        </Button>
      </div>

      {isLoading ? <p className="meta text-center">loading…</p> : null}
      {!isLoading && keywords?.length === 0 ? (
        <p className="meta text-center">No blocked keywords yet.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {keywords?.map((k) => (
          <Badge key={k.id} variant="secondary" className="gap-2 py-1.5 pl-3 pr-2 text-sm font-normal">
            {k.keyword}
            <button
              type="button"
              onClick={() => removeKeyword.mutate(k.id)}
              disabled={removeKeyword.isPending}
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${k.keyword}`}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Content moderation ---------------- */

function useModeratedPostsQuery() {
  return useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, created_at, is_deleted, user_id, users ( anon_id )")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ModeratedPost[];
    },
  });
}

function useModeratedCommentsQuery() {
  return useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, is_deleted, user_id, post_id, users ( anon_id )")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ModeratedComment[];
    },
  });
}

function ContentTab() {
  const { data: posts, isLoading: postsLoading } = useModeratedPostsQuery();
  const { data: comments, isLoading: commentsLoading } = useModeratedCommentsQuery();
  const queryClient = useQueryClient();

  const toggleDeletedPost = useMutation({
    mutationFn: async (params: { id: string; nextDeleted: boolean }) => {
      const { error } = await supabase
        .from("posts")
        .update({ is_deleted: params.nextDeleted })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
    },
    onError: () => toast.error("Couldn't update that post."),
  });

  const toggleDeletedComment = useMutation({
    mutationFn: async (params: { id: string; nextDeleted: boolean }) => {
      const { error } = await supabase
        .from("comments")
        .update({ is_deleted: params.nextDeleted })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-comments"] }),
    onError: () => toast.error("Couldn't update that comment."),
  });

  return (
    <div className="mt-4 space-y-8">
      <div>
        <h2 className="text-sm font-medium tracking-tight">Recent posts</h2>
        <div className="mt-3 space-y-3">
          {postsLoading ? <p className="meta text-center">loading…</p> : null}
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
                <Button
                  size="sm"
                  variant={post.is_deleted ? "outline" : "destructive"}
                  disabled={toggleDeletedPost.isPending}
                  onClick={() =>
                    toggleDeletedPost.mutate({ id: post.id, nextDeleted: !post.is_deleted })
                  }
                >
                  {post.is_deleted ? "Restore" : "Remove"}
                </Button>
              </div>
              <div className="meta mt-2 flex items-center gap-2">
                <span>{post.users?.anon_id ?? "Anon#••••"}</span>
                <span>·</span>
                <span>{relativeTime(post.created_at)}</span>
                {post.is_deleted ? (
                  <Badge variant="destructive" className="ml-1">
                    removed
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium tracking-tight">Recent comments</h2>
        <div className="mt-3 space-y-3">
          {commentsLoading ? <p className="meta text-center">loading…</p> : null}
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
                <Button
                  size="sm"
                  variant={comment.is_deleted ? "outline" : "destructive"}
                  disabled={toggleDeletedComment.isPending}
                  onClick={() =>
                    toggleDeletedComment.mutate({ id: comment.id, nextDeleted: !comment.is_deleted })
                  }
                >
                  {comment.is_deleted ? "Restore" : "Remove"}
                </Button>
              </div>
              <div className="meta mt-2 flex items-center gap-2">
                <span>{comment.users?.anon_id ?? "Anon#••••"}</span>
                <span>·</span>
                <span>{relativeTime(comment.created_at)}</span>
                {comment.is_deleted ? (
                  <Badge variant="destructive" className="ml-1">
                    removed
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Identity lookup ---------------- */

function IdentityTab() {
  const [anonId, setAnonId] = useState("");
  const [result, setResult] = useState<RevealedIdentity | null | undefined>(undefined);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    const query = anonId.trim();
    if (!query) return;
    setSearching(true);
    setResult(undefined);
    try {
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("anon_id", query)
        .maybeSingle();
      if (userError) throw userError;
      if (!userRow) {
        setResult(null);
        return;
      }
      const { data, error } = await supabase.rpc("admin_identity", { _user_id: userRow.id });
      if (error) throw error;
      setResult((data?.[0] as RevealedIdentity | undefined) ?? null);
    } catch {
      toast.error("Lookup failed. Check the anon ID and try again.");
      setResult(undefined);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Reveals the real name and email behind an anon handle. Every lookup is a deliberate
        privacy override — use only for verified reports or abuse investigations.
      </p>
      <div className="surface flex gap-2 p-4">
        <Input
          value={anonId}
          onChange={(e) => setAnonId(e.target.value)}
          placeholder="Anon#1234"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !searching) void search();
          }}
        />
        <Button disabled={!anonId.trim() || searching} onClick={() => void search()}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </div>

      {result === null ? (
        <p className="meta text-center">No user found with that anon ID.</p>
      ) : null}

      {result ? (
        <div className="surface p-4">
          <div className="flex items-center justify-between">
            <span className="anon-tag">{result.anon_id}</span>
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd>{result.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{result.uol_email}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Shell + guard ---------------- */

function AdminDashboard() {
  const { identity, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && !identity?.is_admin) {
    void navigate({ to: "/", replace: true });
    return null;
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="meta mt-1">Moderation tools — visible to admins only.</p>

      {loading || !identity?.is_admin ? (
        <p className="meta mt-6 text-center">loading…</p>
      ) : (
        <Tabs defaultValue="keywords" className="mt-6">
          <TabsList>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="identity">Identity lookup</TabsTrigger>
          </TabsList>
          <TabsContent value="keywords">
            <KeywordsTab />
          </TabsContent>
          <TabsContent value="content">
            <ContentTab />
          </TabsContent>
          <TabsContent value="identity">
            <IdentityTab />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}