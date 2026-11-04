import { cn } from "@/lib/utils";

/**
 * @param {{
 *   icon?: React.ReactNode,
 *   title: string,
 *   description?: string,
 *   action?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-panel border border-border bg-surface px-6 py-12 text-center",
        className
      )}
      role="status"
    >
      {icon ? (
        <div className="flex size-10 items-center justify-center text-muted-foreground [&>svg]:size-5">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
