import DOMPurify from "dompurify";

import { cn } from "@/lib/utils";

const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "caption",
  "code",
  "col",
  "colgroup",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
];

const ALLOWED_ATTR = [
  "alt",
  "class",
  "colspan",
  "height",
  "href",
  "rel",
  "rowspan",
  "src",
  "target",
  "title",
  "width",
];

let hooksRegistered = false;

function ensureLinkHooks() {
  if (hooksRegistered || typeof window === "undefined") return;
  hooksRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

function sanitizeDescriptionHtml(html) {
  ensureLinkHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Scripts/iframes/forms and event handlers are excluded via allowlists;
    // javascript: URIs are blocked by DOMPurify's default URI regexp.
    FORBID_TAGS: ["script", "iframe", "form", "object", "embed", "link", "style"],
  });
}

/**
 * Renders Azure DevOps work-item description HTML after DOMPurify sanitization.
 *
 * @param {{ html: string, className?: string }} props
 */
export function DescriptionHtml({ html, className }) {
  if (!html) return null;
  const clean = sanitizeDescriptionHtml(html);
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none rounded-panel border border-border bg-muted/40 px-3 py-3",
        "[&_*]:text-foreground/80 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground",
        "[&_h4]:text-foreground [&_strong]:text-foreground",
        className
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
