export const UOL_EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)*uol\.edu\.pk$/;

export function isUolEmail(email: string) {
  return UOL_EMAIL_PATTERN.test(email.trim());
}

export function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}