import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VAPID_PUBLIC_KEY = import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription() {
  const { identity } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window,
  );

  useEffect(() => {
    if (!supported) return;
    void navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      setEnabled(!!(await reg?.pushManager.getSubscription()));
    });
  }, [supported]);

  const subscribe = async () => {
    if (!supported || !identity) return;
    if ((await Notification.requestPermission()) !== "granted") return;

    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    const endpoint = json.endpoint;
    const keys = json.keys ?? {};

    await supabase.from("push_subscriptions").upsert(
      {
        user_id: identity.id,
        endpoint: endpoint!,
        p256dh: keys["p256dh"]!,
        auth: keys["auth"]!,
      },
      { onConflict: "endpoint" },
    );
    setEnabled(true);
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setEnabled(false);
  };

  return { supported, enabled, subscribe, unsubscribe };
}