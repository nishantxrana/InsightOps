import { Children, Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Bordered settings panel; children separated by hairline dividers.
 * @param {{
 *   children: React.ReactNode,
 *   className?: string,
 *   title?: string,
 *   description?: string,
 * }} props
 */
export function SettingsPanel({ children, className, title, description }) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <div className={cn("rounded-panel border border-border bg-surface px-4", className)}>
      {title ? (
        <div className="border-b border-border py-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 ? <div className="border-t border-border" role="separator" /> : null}
          {child}
        </Fragment>
      ))}
    </div>
  );
}
