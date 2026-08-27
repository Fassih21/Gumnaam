import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractMentions } from "@/lib/mentions";

/** Parses @Anon#1234 mentions out of content and inserts a "mention" notification for each. */
export function useNotifyMentions() {
  return useMutation({
    mutationFn: async (params: {
      content: string;
      actorId: string;
      postId: string | null;
      commentId: string | null;
    }) => {
      const anonIds = extractMentions(params.content);
      if (!anonIds.length) return;

      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, anon_id")
        .in("anon_id", anonIds);
      if (uErr || !users?.length) return;

      const rows = users
        .filter((u) => u.id !== params.actorId) // don't notify yourself
        .map((u) => ({
          user_id: u.id,
          actor_id: params.actorId,
          type: "mention",
          post_id: params.postId,
          comment_id: params.commentId,
        }));

      if (rows.length) {
        const { error } = await supabase.from("notifications").insert(rows);
        if (error) throw error;
      }
    },
  });
}