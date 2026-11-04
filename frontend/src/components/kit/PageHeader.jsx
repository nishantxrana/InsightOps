import { cn } from "@/lib/utils";

/**
 * @param {{
 *   title: string,
 *   description?: string,
 *   status?: React.ReactNode,
 *   actions?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function PageHeader({ title, description, status, actions, className }) {
  return (
    <header
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {status ? <div className="flex items-center">{status}</div> : null}
        </div>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
