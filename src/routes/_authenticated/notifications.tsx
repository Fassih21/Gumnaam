import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — UOL Underground" }],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <div className="surface flex flex-col items-center gap-3 p-10 text-center">
          <Bell className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Notifications for replies, reactions, and trust will show up here
            once that's wired up.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
