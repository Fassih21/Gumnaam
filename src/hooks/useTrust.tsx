import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMyTrustsQuery(authorIds: string[], myUserId: string | undefined) {
  const ids = [...new Set(authorIds)].filter((id) => id !== myUserId).sort();
  return useQuery({
    queryKey: ["my-trusts", myUserId, ids],
    enabled: !!myUserId && ids.length > 0,
    queryFn: async () => {
      if (!myUserId) throw new Error("Missing user id");

      const { data, error } = await supabase
        .from("trusts").select("trusted_id")
        .eq("truster_id", myUserId)
        .in("trusted_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.trusted_id as string));
    },
  });
}

export function useTrustCountsQuery(authorIds: string[]) {
  const ids = [...new Set(authorIds)].sort();
  return useQuery({
    queryKey: ["trust-counts", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trust_counts", { _user_ids: ids });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) map.set(row.user_id as string, row.count as number);
      return map;
    },
  });
}

export function useToggleTrust(myUserId: string | undefined, authorIds: string[]) {
  const queryClient = useQueryClient();
  const ids = [...new Set(authorIds)].filter((id) => id !== myUserId).sort();

  return useMutation({
    mutationFn: async (params: { targetUserId: string; currentlyTrusted: boolean }) => {
      if (!myUserId) throw new Error("Not signed in");
      if (params.currentlyTrusted) {
        const { error } = await supabase
          .from("trusts").delete()
          .eq("truster_id", myUserId).eq("trusted_id", params.targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trusts").insert({
          truster_id: myUserId, trusted_id: params.targetUserId,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["my-trusts", myUserId, ids] });
      void queryClient.invalidateQueries({ queryKey: ["trust-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["trust-score", vars.targetUserId] });
    },
  });
}