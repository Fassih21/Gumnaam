import { ArrowBigUp, ArrowBigDown } from "lucide-react";
import type { ReactionSummary, ReactionType } from "@/hooks/useReactions";
import { useToggleReaction } from "@/hooks/useReactions";

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
  const mine = summary?.mine ?? null;
  const score = (summary?.upvotes ?? 0) - (summary?.downvotes ?? 0);

  const react = (type: ReactionType) => {
    if (!myUserId || toggle.isPending) return;
    toggle.mutate({ targetType, targetId, type, myUserId, current: mine });
  };

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => react("upvote")} disabled={!myUserId}
        className={`rounded p-1 transition-colors ${mine === "upvote" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        aria-label="Upvote">
        <ArrowBigUp className="size-4" fill={mine === "upvote" ? "currentColor" : "none"} />
      </button>
      <span className="min-w-[1.5ch] text-center text-xs font-medium text-muted-foreground">{score}</span>
      <button type="button" onClick={() => react("downvote")} disabled={!myUserId}
        className={`rounded p-1 transition-colors ${mine === "downvote" ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
        aria-label="Downvote">
        <ArrowBigDown className="size-4" fill={mine === "downvote" ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
