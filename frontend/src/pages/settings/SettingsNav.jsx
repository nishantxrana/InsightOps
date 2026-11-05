import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS, NON_DIRTY_SECTIONS } from "./constants";

function sectionIsDirty(sectionId, tabSettings, originalTabSettings) {
  if (NON_DIRTY_SECTIONS.has(sectionId)) return false;
  return JSON.stringify(tabSettings[sectionId]) !== JSON.stringify(originalTabSettings[sectionId]);
}

/**
 * Sticky settings section nav with unsaved-change dots.
 */
export function SettingsNav({
  activeSection,
  onSelect,
  tabSettings,
  originalTabSettings,
  className,
}) {
  return (
    <nav className={cn("space-y-0.5", className)} aria-label="Settings sections">
      {SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon;
        const dirty = sectionIsDirty(section.id, tabSettings, originalTabSettings);
        const active = activeSection === section.id;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{section.name}</span>
            {dirty ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-warning"
                title="Unsaved changes"
                aria-label="Unsaved changes"
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
