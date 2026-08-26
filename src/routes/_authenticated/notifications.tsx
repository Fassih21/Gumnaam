import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  messageFor,
  useMarkAllRead,
  useNotificationsQuery,
  type NotificationRow,
  type NotificationType,
} from "@/hooks/useNotifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — UOL Underground" }],
  }),
  component: NotificationsPage,
});

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

const ICONS: Record<NotificationType, LucideIcon> = {
  comment_on_post: MessageCircle,
  reaction_on_post: Heart,
  reaction_on_comment: Heart,
  reengagement: Sparkles,
};

function NotificationRowItem({ n }: { n: NotificationRow }) {
  const Icon = ICONS[n.type];
  const to = n.post_id ? "/post/$id" : "/";

  return (
    <Link
      to={to}
      params={n.post_id ? { id: n.post_id } : undefined}
      className={`surface flex items-start gap-3 p-4 transition ${
        n.is_read ? "" : "border-primary/40 bg-primary/5"
      }`}
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2} />
      <div className="flex-1">
        <p className="text-sm text-foreground">{messageFor(n)}</p>
        <p className="meta mt-1">{relativeTime(n.created_at)}</p>
      </div>
      {!n.is_read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : null}
    </Link>
  );
}

function NotificationsPage() {
  const { identity } = useAuth();
  const { data: notifications, isLoading } = useNotificationsQuery(identity?.id);
  const markAllRead = useMarkAllRead(identity?.id);

  // Opening the list is the "seen it" signal — clear the unread badge.
  useEffect(() => {
    if (notifications?.some((n) => !n.is_read)) {
      markAllRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>

        {isLoading ? <p className="meta text-center">loading…</p> : null}

        {!isLoading && (!notifications || notifications.length === 0) ? (
          <div className="surface flex flex-col items-center gap-3 p-10 text-center">
            <Bell className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Notifications for replies and reactions will show up here.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {notifications?.map((n) => (
            <NotificationRowItem key={n.id} n={n} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}