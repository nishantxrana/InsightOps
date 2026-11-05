import { cn } from "@/lib/utils";

/**
 * Settings form row: label + help on the left, control on the right.
 * @param {{
 *   id?: string,
 *   label: string,
 *   description?: React.ReactNode,
 *   error?: string,
 *   htmlFor?: string,
 *   children: React.ReactNode,
 *   className?: string,
 *   align?: 'center' | 'start',
 * }} props
 */
export function SettingRow({
  id,
  label,
  description,
  error,
  htmlFor,
  children,
  className,
  align = "center",
}) {
  const errorId = id ? `${id}-error` : undefined;
  const descId = id ? `${id}-description` : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-4 sm:flex-row sm:justify-between sm:gap-6",
        align === "center" ? "sm:items-center" : "sm:items-start",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {description ? (
          <p id={descId} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="text-xs text-danger-foreground" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div
        className="w-full shrink-0 sm:w-auto sm:min-w-[220px] sm:max-w-[320px]"
        aria-describedby={[descId, error ? errorId : null].filter(Boolean).join(" ") || undefined}
      >
        {children}
      </div>
    </div>
  );
}
