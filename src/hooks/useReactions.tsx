import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReactionType = "upvote" | "downvote";
export type ReactionSummary = { upvotes: number; downvotes: number; mine: ReactionType | null };
type ReactionRow = { target_id: string; user_id: string; type: ReactionType };

function summarize(rows: ReactionRow[], myId: string | undefined) {
  const map = new Map<string, ReactionSummary>();
  for (const row of rows) {
    const entry = map.get(row.target_id) ?? { upvotes: 0, downvotes: 0, mine: null };
    if (row.type === "upvote") entry.upvotes += 1;
    else entry.downvotes += 1;
    if (myId && row.user_id === myId) entry.mine = row.type;
    map.set(row.target_id, entry);
  }
  return map;
}

export function useReactionsQuery(targetIds: string[], myId: string | undefined) {
  const ids = [...new Set(targetIds)].sort();
  return useQuery({
    queryKey: ["reactions", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reactions")
        .select("target_id, user_id, type")
        .in("target_id", ids);
      if (error) throw error;
      return summarize((data ?? []) as ReactionRow[], myId);
    },
  });
}

export function useToggleReaction(allIds: string[]) {
  const queryClient = useQueryClient();
  const ids = [...new Set(allIds)].sort();

  return useMutation({
    mutationFn: async (params: {
      targetType: "post" | "comment";
      targetId: string;
      type: ReactionType;
      myUserId: string;
      current: ReactionType | null;
    }) => {
      const { targetType, targetId, type, myUserId, current } = params;

      if (current === type) {
        const { error } = await supabase
          .from("reactions").delete()
          .eq("user_id", myUserId).eq("target_type", targetType).eq("target_id", targetId);
        if (error) throw error;
        return;
      }
      if (current) {
        const { error } = await supabase
          .from("reactions").update({ type })
          .eq("user_id", myUserId).eq("target_type", targetType).eq("target_id", targetId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("reactions").insert({
        target_type: targetType, target_id: targetId, user_id: myUserId, type,
      });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["reactions", ids] }),
  });
}