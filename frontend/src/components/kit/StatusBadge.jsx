import { cn } from "@/lib/utils";

const TONE_STYLES = {
  neutral: "bg-neutral-muted text-neutral-foreground",
  success: "bg-success-muted text-success-foreground",
  warning: "bg-warning-muted text-warning-foreground",
  danger: "bg-danger-muted text-danger-foreground",
  info: "bg-info-muted text-info-foreground",
};

const DOT_STYLES = {
  neutral: "bg-neutral",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/**
 * @param {{ tone?: 'neutral'|'success'|'warning'|'danger'|'info', label: string, dot?: boolean, className?: string }} props
 */
export function StatusBadge({ tone = "neutral", label, dot = true, className }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral;
  const dotStyle = DOT_STYLES[tone] || DOT_STYLES.neutral;

  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 rounded-control px-2 text-xs font-medium",
        styles,
        className
      )}
    >
      {dot ? (
        <span className={cn("size-1.5 shrink-0 rounded-full", dotStyle)} aria-hidden="true" />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
