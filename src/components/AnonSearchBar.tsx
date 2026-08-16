import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SearchResult = { anon_id: string };

function useAnonSearchQuery(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["anon-search", trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("anon_id")
        .ilike("anon_id", `%${trimmed}%`)
        .limit(8);
      if (error) throw error;
      return (data ?? []) as SearchResult[];
    },
  });
}

export function AnonSearchBar() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isFetching } = useAnonSearchQuery(debounced);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = open && query.trim().length >= 2;

  const goToProfile = (anonId: string) => {
    setOpen(false);
    setQuery("");
    void navigate({ to: "/anon/$anonId", params: { anonId } });
  };

  return (
    <div ref={containerRef} className="relative mt-4">
      <div className="surface flex items-center gap-2 px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search Anon#..."
          className="h-6 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="surface absolute z-10 mt-2 w-full overflow-hidden p-1">
          {isFetching ? (
            <p className="meta px-3 py-2">searching…</p>
          ) : results && results.length > 0 ? (
            results.map((r) => (
              <button
                key={r.anon_id}
                type="button"
                onClick={() => goToProfile(r.anon_id)}
                className="anon-tag block w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
              >
                {r.anon_id}
              </button>
            ))
          ) : (
            <p className="meta px-3 py-2">No matching handle found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}