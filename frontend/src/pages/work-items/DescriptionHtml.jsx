import { cn } from "@/lib/utils";

/**
 * Renders Azure DevOps work-item description HTML.
 *
 * TODO(security): Description HTML from ADO is inserted unsanitized via
 * dangerouslySetInnerHTML. Do not add a sanitize dependency in this step;
 * isolate here so a future DOMPurify (or similar) pass can land in one place.
 *
 * @param {{ html: string, className?: string }} props
 */
export function DescriptionHtml({ html, className }) {
  if (!html) return null;
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none rounded-panel border border-border bg-muted/40 px-3 py-3",
        "[&_*]:text-foreground/80 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground",
        "[&_h4]:text-foreground [&_strong]:text-foreground",
        className
      )}
      // TODO(security): sanitize before assign — see file header
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
