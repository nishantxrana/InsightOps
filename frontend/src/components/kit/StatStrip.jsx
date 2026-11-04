import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { SkeletonStatStrip } from "./Skeletons";

const TONE_DOT = {
  neutral: "bg-neutral",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/**
 * @param {{ children: React.ReactNode, loading?: boolean, className?: string }} props
 */
export function StatStrip({ children, loading = false, className }) {
  if (loading) {
    return <SkeletonStatStrip className={className} />;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-panel border border-border bg-surface md:grid-cols-4",
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
}

/**
 * @param {{
 *   label: string,
 *   value: React.ReactNode,
 *   sub?: React.ReactNode,
 *   tone?: 'neutral'|'success'|'warning'|'danger'|'info',
 *   onClick?: () => void,
 *   to?: string,
 *   className?: string,
 * }} props
 */
export function StatCell({ label, value, sub, tone = "neutral", onClick, to, className }) {
  const interactive = Boolean(onClick || to);
  const body = (
    <>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      {sub != null && sub !== "" ? (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone] || TONE_DOT.neutral)}
            aria-hidden="true"
          />
          <span>{sub}</span>
        </div>
      ) : null}
    </>
  );

  const cellClass = cn(
    "relative min-w-0 p-4 text-left",
    "border-b border-r border-border last:border-r-0",
    "odd:border-r md:[&:nth-child(4n)]:border-r-0 md:[&:nth-child(n+5)]:border-b-0",
    "[&:nth-last-child(-n+2)]:border-b-0 md:[&:nth-last-child(-n+4)]:border-b-0",
    interactive &&
      "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
    className
  );

  if (to) {
    return (
      <Link to={to} className={cellClass} onClick={onClick}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={cellClass} onClick={onClick}>
        {body}
      </button>
    );
  }

  return <div className={cellClass}>{body}</div>;
}
