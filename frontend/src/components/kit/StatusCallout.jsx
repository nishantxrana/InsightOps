import { cn } from "@/lib/utils";

const TONE = {
  neutral: "border-border bg-neutral-muted text-neutral-foreground",
  success: "border-success/30 bg-success-muted text-success-foreground",
  warning: "border-warning/30 bg-warning-muted text-warning-foreground",
  danger: "border-danger/30 bg-danger-muted text-danger-foreground",
  info: "border-info/30 bg-info-muted text-info-foreground",
};

/**
 * Compact banner replacing large colored modal banners.
 * @param {{
 *   tone?: 'neutral'|'success'|'warning'|'danger'|'info',
 *   title: string,
 *   children?: React.ReactNode,
 *   action?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function StatusCallout({ tone = "neutral", title, children, action, className }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-panel border px-3 py-2.5 text-sm",
        TONE[tone] || TONE.neutral,
        className
      )}
      role="status"
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="font-medium text-foreground">{title}</div>
        {children ? <div className="text-muted-foreground">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
