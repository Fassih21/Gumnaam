import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePresenceTracker() {
  const { identity } = useAuth();

  useEffect(() => {
    if (!identity) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: identity.id } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [identity]);
}