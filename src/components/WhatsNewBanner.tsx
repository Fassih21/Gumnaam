import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { WHATS_NEW_ITEMS, WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION } from "@/lib/whatsNew";

export function WhatsNewBanner() {
  // Starts hidden on both server and client render, so there's nothing to
  // mismatch during hydration — we only decide to show it after mount.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seenVersion = window.localStorage.getItem(WHATS_NEW_STORAGE_KEY);
    if (seenVersion !== WHATS_NEW_VERSION) setVisible(true);
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, WHATS_NEW_VERSION);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="surface mb-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">What's new on Gumnaam v{WHATS_NEW_VERSION}</h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {WHATS_NEW_ITEMS.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}