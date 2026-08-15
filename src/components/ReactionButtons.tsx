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
    <div className="flex items-center gap-0.5 rounded-full bg-secondary/50 p-0.5">
      <button type="button" onClick={() => react("upvote")} disabled={!myUserId}
        className={`rounded-full p-1 transition-colors ${mine === "upvote" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        aria-label="Upvote">
        <ArrowBigUp className="size-4" fill={mine === "upvote" ? "currentColor" : "none"} />
      </button>
      <span className={`min-w-[1.5ch] text-center text-xs font-semibold ${
        score > 0 ? "text-primary" : score < 0 ? "text-destructive" : "text-muted-foreground"
      }`}>{score}</span>
      <button type="button" onClick={() => react("downvote")} disabled={!myUserId}
        className={`rounded-full p-1 transition-colors ${mine === "downvote" ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:text-foreground"}`}
        aria-label="Downvote">
        <ArrowBigDown className="size-4" fill={mine === "downvote" ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
