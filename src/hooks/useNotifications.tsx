import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "comment_on_post"
  | "reaction_on_post"
  | "reaction_on_comment"
  | "mention"
  | "reengagement";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  post_id: string | null;
  comment_id: string | null;
  actor: { anon_id: string } | null;
};

export function messageFor(n: { type: NotificationType; actor: { anon_id: string } | null }) {
  const who = n.actor?.anon_id ?? "Someone";
  switch (n.type) {
    case "comment_on_post":
      return `${who} commented on your post`;
    case "reaction_on_post":
      return `${who} reacted to your post`;
    case "reaction_on_comment":
      return `${who} reacted to your comment`;
    case "mention":
      return `${who} mentioned you`;
    case "reengagement":
      return "Gumnaam is waiting for you — share your thoughts";
  }
}

export function useNotificationsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error("Missing user id");

      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, is_read, created_at, post_id, comment_id, actor:actor_id ( anon_id )")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as NotificationRow[];
    },
  });
}

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications-unread-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error("Missing user id");

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkAllRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", userId] });
    },
  });
}

/** Mount once (in AppShell): live toast the instant a notification lands. */
export function useNotificationsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { type: NotificationType };
          toast(messageFor({ type: row.type, actor: null }));
          void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          void queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/** Mount once (in AppShell): when the user reopens the site, surface a popup for anything missed. */
export function useNotificationsOnOpen(userId: string | undefined) {
  const shown = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || shown.current) return;
    shown.current = true;

    void (async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error || !count) return;

      toast(count === 1 ? "You have 1 new notification" : `You have ${count} new notifications`, {
        action: { label: "View", onClick: () => void navigate({ to: "/notifications" }) },
      });
    })();
  }, [userId, navigate]);
}