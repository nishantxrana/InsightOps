import { cn } from "@/lib/utils";

/**
 * @param {{
 *   items: Array<{ label: string, value: React.ReactNode, mono?: boolean }>,
 *   columns?: 1 | 2 | 3,
 *   className?: string,
 * }} props
 */
export function KeyValueList({ items = [], columns = 2, className }) {
  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <dl className={cn("grid gap-x-6 gap-y-3", colClass, className)}>
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "mt-0.5 truncate text-sm text-foreground",
              item.mono && "font-mono text-[13px] tabular-nums"
            )}
          >
            {item.value == null || item.value === "" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
