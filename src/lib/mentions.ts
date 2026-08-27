export const MENTION_RE = /@(Anon#\d{4})/g;

/** Unique anon_ids mentioned in a piece of content, e.g. "hey @Anon#1234" -> ["Anon#1234"] */
export function extractMentions(content: string): string[] {
  return [
    ...new Set(
      [...content.matchAll(MENTION_RE)]
        .map((m) => m[1])
        .filter((value): value is string => typeof value === "string"),
    ),
  ];
}