import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AnonSearchBar } from "@/components/AnonSearchBar";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [{ title: "Search — UOL Underground" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Search</h1>
      <AnonSearchBar />
    </AppShell>
  );
}
