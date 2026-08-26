import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/hooks/useTheme";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings — UOL Underground" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { supported, enabled, subscribe, unsubscribe } = usePushSubscription();

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground">Theme</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how Gumnaam looks on this device.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-elevated"
              }`}
            >
              <Sun className="size-5" strokeWidth={2} />
              <span className="text-sm font-medium">Light</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-elevated"
              }`}
            >
              <Moon className="size-5" strokeWidth={2} />
              <span className="text-sm font-medium">Dark</span>
            </button>
          </div>
        </div>

        {supported ? (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground">Push notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Get notified even when Gumnaam is closed.
            </p>
            <button
              type="button"
              onClick={() => void (enabled ? unsubscribe() : subscribe())}
              className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-elevated"
            >
              {enabled ? "Disable" : "Enable"}
            </button>
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            More account and notification settings will live here.
          </p>
        </div>
      </div>
    </AppShell>
  );
}