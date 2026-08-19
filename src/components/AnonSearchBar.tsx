import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AnonAvatar } from "@/components/AnonAvatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

function useAccountSearch(query: string) {
  return useQuery({
    queryKey: ["account-search", query],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, anon_id, created_at")
        .ilike("anon_id", `%${query.trim()}%`)
        .order("anon_id")
        .limit(20);
      if (error) throw error;
      return data as { id: string; anon_id: string; created_at: string }[];
    },
  });
}

export function AnonSearchBar() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useAccountSearch(query);

  return (
    <div className="space-y-6 pb-16">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Anon#1234…"
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        {query.trim().length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Search for an anonymous account by its ID.
          </p>
        ) : isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>
        ) : results && results.length > 0 ? (
          results.map((user) => (
            <Link
              key={user.id}
              to="/anon/$anonId"
              params={{ anonId: user.anon_id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-elevated"
            >
              <AnonAvatar className="size-9" />
              <span className="anon-tag">{user.anon_id}</span>
            </Link>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No accounts found for "{query}".
          </p>
        )}
      </div>
    </div>
  );
}
