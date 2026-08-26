import { createServerFileRoute } from "@tanstack/react-start/server";

type NotificationType =
  | "comment_on_post"
  | "reaction_on_post"
  | "reaction_on_comment"
  | "reengagement";

const MESSAGES: Record<NotificationType, string> = {
  comment_on_post: "Someone commented on your post",
  reaction_on_post: "Someone reacted to your post",
  reaction_on_comment: "Someone reacted to your comment",
  reengagement: "Gumnaam is waiting for you — share your thoughts",
};

export const ServerRoute = createServerFileRoute("/api/send-push").methods({
  POST: async ({ request }) => {
    if (request.headers.get("x-push-secret") !== process.env["PUSH_TRIGGER_SECRET"]) {
      return new Response("unauthorized", { status: 401 });
    }

    const [{ supabaseAdmin }, { buildPushHTTPRequest }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@pushforge/builder"),
    ]);

    const { user_id, type, post_id } = (await request.json()) as {
      user_id: string;
      type: NotificationType;
      post_id: string | null;
    };

    const { data: subs, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    console.log("send-push: user_id=", user_id, "type=", type, "subs found=", subs?.length ?? 0, "subsError=", subsError);

    const privateJWK = JSON.parse(process.env["VAPID_PRIVATE_KEY_JWK"]!);
    const payload = {
      title: "Gumnaam",
      body: MESSAGES[type] ?? "You have a new notification",
      url: post_id ? `/post/${post_id}` : "/notifications",
    };

    for (const sub of subs ?? []) {
      try {
        const { endpoint, headers, body } = await buildPushHTTPRequest({
          privateJWK,
          subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message: { payload, adminContact: "mailto:admin@gumnaam.app" },
        });
        const res = await fetch(endpoint, { method: "POST", headers, body });
        const resText = await res.text();
        console.log("push status:", res.status, "endpoint:", sub.endpoint, "resp:", resText);
        if (res.status === 404 || res.status === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      } catch (err) {
        console.log("push error for endpoint", sub.endpoint, ":", err);
      }
    }

    return new Response("ok");
  },
});