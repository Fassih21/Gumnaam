import { useState } from "react";
import { Flag } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const QUICK_REASONS = ["Spam", "Harassment or bullying", "Hate speech", "Misinformation"];
const MAX_REASON_LENGTH = 500;

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "post" | "comment";
  targetId: string;
}) {
  const { identity } = useAuth();
  const [customOpen, setCustomOpen] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitReport = useMutation({
    mutationFn: async (reason: string) => {
      if (!identity) throw new Error("Not signed in");
      const { error } = await supabase.from("reports").insert({
        target_type: targetType,
        target_id: targetId,
        reporter_id: identity.id,
        reason: reason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      setCustomOpen(false);
      setCustomReason("");
      toast.success("Reported. Our moderators will take a look.");
    },
    onError: (error: { message?: string; code?: string }) => {
      if (error.code === "23505") {
        toast.error("You've already reported this.");
        setSubmitted(true);
        return;
      }
      toast.error("Couldn't submit that report.");
    },
  });

  if (identity?.is_banned) return null;

  if (submitted) {
    return (
      <span className="meta inline-flex items-center gap-1 text-muted-foreground/70">
        <Flag className="size-3.5" />
      </span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground/70 transition-colors hover:text-destructive"
            aria-label="Report"
          >
            <Flag className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {QUICK_REASONS.map((reason) => (
            <DropdownMenuItem
              key={reason}
              disabled={submitReport.isPending}
              onClick={() => submitReport.mutate(reason)}
            >
              {reason}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => setCustomOpen(true)}>Other…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this {targetType}</DialogTitle>
            <DialogDescription>
              Tell us what's wrong. Your report is anonymous to other students — only moderators
              can see it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="What's the issue?"
            maxLength={MAX_REASON_LENGTH}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              disabled={!customReason.trim() || submitReport.isPending}
              onClick={() => submitReport.mutate(customReason)}
            >
              {submitReport.isPending ? "Submitting…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
