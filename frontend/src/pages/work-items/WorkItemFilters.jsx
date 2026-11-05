import { Button } from "@/components/ui/button";
import {
  ActiveFilters,
  DensityToggle,
  FacetFilter,
  ResultCount,
  SearchField,
  Toolbar,
} from "@/components/kit/Toolbar";

/**
 * Shared toolbar for Sprint / Overdue tabs.
 *
 * @param {{
 *   stateOptions: Array<{ value: string, label: string, count?: number }>,
 *   assigneeOptions: Array<{ value: string, label: string, count?: number }>,
 *   priorityOptions: Array<{ value: string, label: string, count?: number }>,
 *   states: string[],
 *   assignees: string[],
 *   priorities: string[],
 *   search: string,
 *   highPriority: boolean,
 *   shown: number,
 *   total: number,
 *   noun?: string,
 *   chips: Array<{ id: string, label: string }>,
 *   onStatesChange: (v: string[]) => void,
 *   onAssigneesChange: (v: string[]) => void,
 *   onPrioritiesChange: (v: string[]) => void,
 *   onSearchChange: (v: string) => void,
 *   onHighPriorityChange: (v: boolean) => void,
 *   onClear: (id?: string) => void,
 * }} props
 */
export function WorkItemFilters({
  stateOptions,
  assigneeOptions,
  priorityOptions,
  states,
  assignees,
  priorities,
  search,
  highPriority,
  shown,
  total,
  noun = "items",
  chips,
  onStatesChange,
  onAssigneesChange,
  onPrioritiesChange,
  onSearchChange,
  onHighPriorityChange,
  onClear,
}) {
  return (
    <div className="space-y-2">
      <Toolbar className="lg:flex-nowrap">
        <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
          <FacetFilter
            label="State"
            multiple
            options={stateOptions}
            value={states}
            onChange={onStatesChange}
          />
          <FacetFilter
            label="Assignee"
            multiple
            options={assigneeOptions}
            value={assignees}
            onChange={onAssigneesChange}
          />
          <FacetFilter
            label="Priority"
            multiple
            options={priorityOptions}
            value={priorities}
            onChange={onPrioritiesChange}
          />
          <SearchField value={search} onChange={onSearchChange} placeholder="Search items..." />
          <Button
            type="button"
            variant={highPriority ? "default" : "outline"}
            size="sm"
            aria-pressed={highPriority}
            onClick={() => onHighPriorityChange(!highPriority)}
          >
            High priority (P1/P2)
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DensityToggle />
          <ResultCount shown={shown} total={total} noun={noun} />
        </div>
      </Toolbar>
      <ActiveFilters chips={chips} onClear={onClear} />
    </div>
  );
}
