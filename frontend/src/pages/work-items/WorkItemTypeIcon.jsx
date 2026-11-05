import { Bug, BookOpen, CheckSquare, FileText, Star, Target } from "lucide-react";

import { cn } from "@/lib/utils";

const TYPE_MAP = {
  bug: { Icon: Bug, className: "text-danger-foreground" },
  "user story": { Icon: BookOpen, className: "text-info-foreground" },
  story: { Icon: BookOpen, className: "text-info-foreground" },
  task: { Icon: CheckSquare, className: "text-success-foreground" },
  feature: { Icon: Star, className: "text-primary" },
  epic: { Icon: Target, className: "text-warning-foreground" },
};

/**
 * Consistent type glyph; color is decorative identity (not status alone).
 * @param {{ type?: string, className?: string }} props
 */
export function WorkItemTypeIcon({ type, className }) {
  const key = String(type || "").toLowerCase();
  const entry = TYPE_MAP[key] || { Icon: FileText, className: "text-muted-foreground" };
  const { Icon, className: toneClass } = entry;
  return <Icon className={cn("size-4 shrink-0", toneClass, className)} aria-hidden="true" />;
}
