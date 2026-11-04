import { AlertCircle } from "lucide-react";

/**
 * Neutral server-error region above the primary button.
 * Thin red left border — not a loud red block.
 */
export function FormError({ message, id = "form-error" }) {
  if (!message) {
    return <div className="min-h-0" aria-hidden="true" />;
  }

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2.5 rounded-lg border border-landing-hairline border-l-2 border-l-red-600 bg-landing-surface px-3 py-2.5 text-[13px] leading-snug text-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200 dark:border-l-red-500"
    >
      <AlertCircle
        className="mt-0.5 size-3.5 shrink-0 text-red-600 dark:text-red-400"
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}
