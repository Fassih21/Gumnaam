import { cn } from "@/lib/utils";

/** The one and only avatar in the app: a generic silhouette. No uploads, ever. */
export function AnonAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary",
        "size-9",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="size-full text-muted-foreground">
        <circle cx="20" cy="15" r="7" fill="currentColor" opacity="0.8" />
        <path
          d="M6 38c0-7.732 6.268-14 14-14s14 6.268 14 14"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>
    </span>
  );
}
