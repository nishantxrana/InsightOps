import { cn } from "@/lib/utils";

/**
 * Label above, control, helper/error below with reserved space to avoid layout shift.
 */
export function AuthField({ id, label, error, helper, children, className, labelAside }) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[14px] font-medium text-foreground">
          {label}
        </label>
        {labelAside}
      </div>
      {typeof children === "function" ? children({ describedBy, invalid: !!error }) : children}
      <div className="min-h-[1.25rem]" aria-live={error ? "polite" : undefined}>
        {error ? (
          <p
            id={`${id}-error`}
            className="text-[13px] leading-tight text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : helper ? (
          <p id={`${id}-helper`} className="text-[13px] leading-tight text-muted-foreground">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}
