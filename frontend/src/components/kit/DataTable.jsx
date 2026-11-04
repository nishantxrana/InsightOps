import * as React from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Sticky header + scrollable body container.
 * @param {{ children: React.ReactNode, className?: string, maxHeight?: string }} props
 */
export function DataTable({ children, className, maxHeight = "min(60vh, 560px)" }) {
  return (
    <div
      className={cn(
        "relative overflow-auto rounded-panel border border-border bg-surface",
        className
      )}
      style={{ maxHeight }}
      role="table"
    >
      {children}
    </div>
  );
}

export function DataHeader({ children, className }) {
  return (
    <div
      role="row"
      className={cn(
        "sticky top-0 z-10 flex min-h-9 items-center border-b border-border bg-surface-raised px-3 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * @param {{
 *   children: React.ReactNode,
 *   className?: string,
 *   sortable?: boolean,
 *   sorted?: 'asc'|'desc'|false,
 *   onSort?: () => void,
 *   align?: 'left'|'right',
 * }} props
 */
export function DataHeaderCell({
  children,
  className,
  sortable = false,
  sorted = false,
  onSort,
  align = "left",
}) {
  const content = (
    <>
      <span className="truncate">{children}</span>
      {sortable ? (
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          {sorted === "asc" ? (
            <ArrowUp className="size-3" />
          ) : sorted === "desc" ? (
            <ArrowDown className="size-3" />
          ) : (
            <ArrowUpDown className="size-3 opacity-50" />
          )}
        </span>
      ) : null}
    </>
  );

  if (sortable) {
    return (
      <button
        type="button"
        role="columnheader"
        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
        className={cn(
          "inline-flex flex-1 items-center gap-1 truncate py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          align === "right" && "justify-end text-right",
          className
        )}
        onClick={onSort}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      role="columnheader"
      className={cn("flex-1 truncate py-2", align === "right" && "text-right", className)}
    >
      {content}
    </div>
  );
}

/**
 * Full-row interactive semantics. Works plain or as absolute virtualized child.
 * ArrowUp/Down moves focus between sibling rows with role=row; Enter activates.
 *
 * @param {{
 *   children: React.ReactNode,
 *   onClick?: () => void,
 *   selected?: boolean,
 *   as?: 'div'|'button'|'a',
 *   className?: string,
 *   style?: React.CSSProperties,
 *   href?: string,
 * }} props
 */
export const DataRow = React.forwardRef(function DataRow(
  { children, onClick, selected = false, as, className, style, href, ...props },
  ref
) {
  const Comp = as || (href ? "a" : onClick ? "button" : "div");
  const interactive = Boolean(onClick || href || as === "button" || as === "a");

  const handleKeyDown = (e) => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      if (e.key === " ") e.preventDefault();
      onClick?.(e);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const root = e.currentTarget.parentElement;
      if (!root) return;
      const rows = Array.from(root.querySelectorAll('[role="row"][data-kit-row]'));
      const idx = rows.indexOf(e.currentTarget);
      if (idx < 0) return;
      const next = e.key === "ArrowDown" ? rows[idx + 1] : rows[idx - 1];
      next?.focus?.();
    }
  };

  return (
    <Comp
      ref={ref}
      role="row"
      data-kit-row=""
      data-selected={selected || undefined}
      tabIndex={interactive ? 0 : undefined}
      href={href}
      type={Comp === "button" ? "button" : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={style}
      className={cn(
        "flex w-full min-h-row items-center border-b border-border px-3 text-left text-sm text-foreground last:border-b-0",
        interactive &&
          "cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
        selected && "bg-muted/60",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

/**
 * @param {{ children: React.ReactNode, className?: string, mono?: boolean, tabular?: boolean, align?: 'left'|'right' }} props
 */
export function DataCell({ children, className, mono = false, tabular = false, align = "left" }) {
  return (
    <div
      role="cell"
      className={cn(
        "min-w-0 flex-1 truncate py-2",
        mono && "font-mono text-[13px]",
        tabular && "tabular-nums",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Relative time with exact timestamp in a tooltip.
 * @param {{ date: Date|string|number, className?: string }} props
 */
export function TimeAgo({ date, className }) {
  const parsed = React.useMemo(() => {
    const d = date instanceof Date ? date : new Date(date);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [date]);

  if (!parsed) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  const relative = formatDistanceToNowStrict(parsed, { addSuffix: true });
  const exact = format(parsed, "PPpp");

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <time
            dateTime={parsed.toISOString()}
            className={cn("tabular-nums text-muted-foreground", className)}
          >
            {relative}
          </time>
        </TooltipTrigger>
        <TooltipContent>{exact}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
