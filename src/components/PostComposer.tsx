import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnonAvatar } from "@/components/AnonAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useNotifyMentions } from "@/hooks/useMentions";
import { supabase } from "@/integrations/supabase/client";

const MAX_POST_LENGTH = 2000;

function describePostError(error: { message?: string; code?: string } | null): string {
  const msg = error?.message ?? "";
  if (/blocked|moderat|not allowed|forbidden/i.test(msg)) {
    return "That post contains language that isn't allowed here.";
  }
  if (error?.code === "23514") {
    return "That post couldn't be saved - check the content and try again.";
  }
  return "Couldn't post right now. Please try again.";
}

export function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const { identity } = useAuth();
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const notifyMentions = useNotifyMentions();

  const createPost = useMutation({
    mutationFn: async (text: string) => {
      if (!identity) throw new Error("Not signed in");
      const trimmed = text.trim();
      const { data, error } = await supabase
        .from("posts")
        .insert({ user_id: identity.id, content: trimmed })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string, content: trimmed };
    },
    onSuccess: ({ id, content: postedContent }) => {
      setContent("");
      toast.success("Posted anonymously.");
      void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] });
      if (identity) {
        notifyMentions.mutate({
          content: postedContent,
          actorId: identity.id,
          postId: id,
          commentId: null,
        });
      }
      onPosted?.();
    },
    onError: (error: { message?: string; code?: string }) => {
      toast.error(describePostError(error));
    },
  });

  const trimmed = content.trim();
  const remaining = MAX_POST_LENGTH - content.length;
  const canSubmit =
    trimmed.length > 0 &&
    content.length <= MAX_POST_LENGTH &&
    !createPost.isPending &&
    !identity?.is_banned;

  if (identity?.is_banned) {
    return (
      <div className="surface p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Your account has been suspended. You can still read the feed, but you can't post.
        </p>
      </div>
    );
  }

  return (
    <div className="surface p-3">
      <div className="flex items-start gap-2.5">
        <AnonAvatar className="size-8" />
        <div className="flex-1">
          <Textarea
            id="composer-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"Post as " + (identity?.anon_id ?? "Anon#----") + "..."}
            className="min-h-[120px] resize-none border-none bg-transparent px-0 py-1.5 text-sm shadow-none focus-visible:ring-0"
            maxLength={MAX_POST_LENGTH + 20}
            autoFocus
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className={"meta " + (remaining < 0 ? "text-destructive" : "")}>
              {remaining} characters left
            </span>
            <Button size="sm" disabled={!canSubmit} onClick={() => createPost.mutate(trimmed)}>
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
