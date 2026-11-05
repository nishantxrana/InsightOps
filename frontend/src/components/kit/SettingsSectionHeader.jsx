import { cn } from "@/lib/utils";

/**
 * Section title + description above settings panels.
 * @param {{
 *   title: string,
 *   description?: React.ReactNode,
 *   className?: string,
 *   actions?: React.ReactNode,
 * }} props
 */
export function SettingsSectionHeader({ title, description, className, actions }) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
