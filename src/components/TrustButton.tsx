import { ShieldCheck, ShieldPlus } from "lucide-react";
import { useToggleTrust } from "@/hooks/useTrust";

export function TrustButton({
  authorId, myUserId, isTrusted, trustCount, allAuthorIds,
}: {
  authorId: string;
  myUserId: string | undefined;
  isTrusted: boolean;
  trustCount: number | undefined;
  allAuthorIds: string[];
}) {
  const toggle = useToggleTrust(myUserId, allAuthorIds);

  if (!myUserId || authorId === myUserId) {
    return trustCount !== undefined ? (
      <span className="meta inline-flex items-center gap-1">
        <ShieldCheck className="size-3.5" /> {trustCount}
      </span>
    ) : null;
  }

  return (
    <button type="button"
      onClick={() => toggle.mutate({ targetUserId: authorId, currentlyTrusted: isTrusted })}
      disabled={toggle.isPending}
      className={`meta inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${
        isTrusted
          ? "bg-primary/15 text-primary"
          : "border border-border/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
      }`}>
      {isTrusted ? <ShieldCheck className="size-3.5" /> : <ShieldPlus className="size-3.5" />}
      {isTrusted ? "trusted" : "trust"}{trustCount !== undefined ? ` · ${trustCount}` : ""}
    </button>
  );
}
