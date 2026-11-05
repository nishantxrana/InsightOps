import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const HUE_CLASSES = [
  "bg-info-muted text-info-foreground",
  "bg-success-muted text-success-foreground",
  "bg-warning-muted text-warning-foreground",
  "bg-danger-muted text-danger-foreground",
  "bg-neutral-muted text-neutral-foreground",
];

function initials(name) {
  const parts = String(name || "")
    .replace(/^\[.*?\]\\?/, "")
    .trim()
    .split(/[\s\\/]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueClass(name) {
  const s = String(name || "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return HUE_CLASSES[Math.abs(hash) % HUE_CLASSES.length];
}

/** @param {{ displayName?: string, isContainer?: boolean, isGroup?: boolean }} person */
function isReviewerGroup(person) {
  if (!person) return false;
  if (person.isContainer || person.isGroup) return true;
  const name = person.displayName || "";
  return name.startsWith("[") && name.includes("]");
}

/**
 * Overlapping initials for people + truncated group chips.
 *
 * @param {{
 *   people?: Array<{ displayName?: string, isContainer?: boolean, isGroup?: boolean }>,
 *   max?: number,
 *   className?: string,
 * }} props
 */
export function AvatarStack({ people = [], max = 3, className }) {
  if (!people.length) return null;

  const groups = people.filter(isReviewerGroup);
  const individuals = people.filter((p) => !isReviewerGroup(p));
  const visible = individuals.slice(0, max);
  const overflow = individuals.length - visible.length;

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {visible.length > 0 ? (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center" role="list" aria-label="Reviewers">
            {visible.map((person, i) => {
              const name = person.displayName || "Unknown";
              return (
                <Tooltip key={`${name}-${i}`}>
                  <TooltipTrigger asChild>
                    <span
                      role="listitem"
                      className={cn(
                        "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-background text-[10px] font-semibold",
                        hueClass(name),
                        i > 0 && "-ml-1.5"
                      )}
                      aria-label={name}
                    >
                      {initials(name)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{name}</TooltipContent>
                </Tooltip>
              );
            })}
            {overflow > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-background bg-muted px-1 text-[10px] font-medium text-muted-foreground",
                      visible.length > 0 && "-ml-1.5"
                    )}
                    aria-label={`${overflow} more reviewers`}
                  >
                    +{overflow}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {individuals
                    .slice(max)
                    .map((p) => p.displayName)
                    .filter(Boolean)
                    .join(", ")}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </TooltipProvider>
      ) : null}

      {groups.length > 0 ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-6 max-w-[9rem] truncate rounded-control border border-border bg-muted px-2 text-[11px] text-muted-foreground">
                {groups[0].displayName}
                {groups.length > 1 ? ` +${groups.length - 1}` : ""}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {groups
                .map((g) => g.displayName)
                .filter(Boolean)
                .join("\n")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
