import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnlineCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel("online-users", {
      config: { presence: { key: "admin-observer" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return count;
}