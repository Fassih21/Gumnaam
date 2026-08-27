import { useState } from "react";
import { ArrowBigUp, ArrowBigDown } from "lucide-react";
import type { ReactionSummary, ReactionType } from "@/hooks/useReactions";
import { useToggleReaction, useReactorsQuery } from "@/hooks/useReactions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ReactionButtons({
  targetType, targetId, summary, myUserId, allIds,
}: {
  targetType: "post" | "comment";
  targetId: string;
  summary: ReactionSummary | undefined;
  myUserId: string | undefined;
  allIds: string[];
}) {
  const toggle = useToggleReaction(allIds);
  const [open, setOpen] = useState(false);
  const mine = summary?.mine ?? null;
  const score = (summary?.upvotes ?? 0) - (summary?.downvotes ?? 0);
  const { data: reactors, isLoading } = useReactorsQuery(targetType, targetId, open);

  const react = (type: ReactionType) => {
    if (!myUserId || toggle.isPending) return;
    toggle.mutate({ targetType, targetId, type, myUserId, current: mine });
  };

  const upvoters = reactors?.filter((r) => r.type === "upvote") ?? [];
  const downvoters = reactors?.filter((r) => r.type === "downvote") ?? [];

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-secondary/50 p-0.5">
      <button type="button" onClick={() => react("upvote")} disabled={!myUserId}
        className={`rounded-full p-1 transition-colors ${mine === "upvote" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        aria-label="Upvote">
        <ArrowBigUp className="size-4" fill={mine === "upvote" ? "currentColor" : "none"} />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button"
            className={`min-w-[1.5ch] rounded px-1 text-center text-xs font-semibold hover:bg-secondary ${
              score > 0 ? "text-primary" : score < 0 ? "text-destructive" : "text-muted-foreground"
            }`}
            aria-label="View reactors">
            {score}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 text-xs" align="center">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !reactors?.length ? (
            <p className="text-muted-foreground">No reactions yet.</p>
          ) : (
            <div className="space-y-2">
              {upvoters.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 font-semibold text-primary">
                    <ArrowBigUp className="size-3" fill="currentColor" /> {upvoters.length}
                  </p>
                  <p className="text-muted-foreground">
                    {upvoters.map((u) => u.anon_id).join(", ")}
                  </p>
                </div>
              )}
              {downvoters.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 font-semibold text-destructive">
                    <ArrowBigDown className="size-3" fill="currentColor" /> {downvoters.length}
                  </p>
                  <p className="text-muted-foreground">
                    {downvoters.map((u) => u.anon_id).join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <button type="button" onClick={() => react("downvote")} disabled={!myUserId}
        className={`rounded-full p-1 transition-colors ${mine === "downvote" ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:text-foreground"}`}
        aria-label="Downvote">
        <ArrowBigDown className="size-4" fill={mine === "downvote" ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
