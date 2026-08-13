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
    return trustCount !== undefined ? <span className="meta">trust {trustCount}</span> : null;
  }

  return (
    <button type="button"
      onClick={() => toggle.mutate({ targetUserId: authorId, currentlyTrusted: isTrusted })}
      disabled={toggle.isPending}
      className={`meta rounded-full border px-2 py-0.5 transition-colors ${
        isTrusted ? "border-primary text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
      }`}>
      {isTrusted ? "✓ trusted" : "+ trust"}{trustCount !== undefined ? ` · ${trustCount}` : ""}
    </button>
  );
}