import { CheckSquare, ExternalLink } from "lucide-react";

import {
  DataCell,
  DataHeader,
  DataHeaderCell,
  DataRow,
  DataTable,
  TimeAgo,
} from "@/components/kit/DataTable";
import { EmptyState } from "@/components/kit/EmptyState";
import { SkeletonRows } from "@/components/kit/Skeletons";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { workItemState } from "@/components/kit/statusMaps";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDensity } from "@/hooks/useDensity";

import { WorkItemTypeIcon } from "./WorkItemTypeIcon";
import {
  getInitials,
  getPriorityValue,
  getWorkItemUrl,
  isPastDue,
  priorityLabel,
  priorityTone,
} from "./helpers";

/**
 * @param {{
 *   items: object[],
 *   loading: boolean,
 *   hasSprintData: boolean,
 *   filtersActive: boolean,
 *   selectedId?: number|string|null,
 *   onOpen: (item: object, index: number) => void,
 *   onClearFilters: () => void,
 *   rowRefs?: React.MutableRefObject<Map<number, HTMLElement>>,
 * }} props
 */
export function SprintItemsTable({
  items,
  loading,
  hasSprintData,
  filtersActive,
  selectedId,
  onOpen,
  onClearFilters,
  rowRefs,
}) {
  const { density } = useDensity();
  const rowPad = density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3" : "py-2";

  if (loading) {
    return <SkeletonRows rows={6} columns={6} />;
  }

  if (!hasSprintData) {
    return (
      <EmptyState
        icon={<CheckSquare />}
        title="No work items found in the current sprint"
        description="Sync again after work items are added to the sprint, or check your Azure DevOps project."
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<CheckSquare />}
        title={
          filtersActive
            ? "No work items match the current filters"
            : "No work items found in the current sprint"
        }
        description={
          filtersActive
            ? "Clear filters to see all sprint items."
            : "There are no work items in the current sprint."
        }
        action={
          filtersActive ? (
            <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <DataTable maxHeight="min(55vh, 640px)" className="min-h-[12rem]">
      <DataHeader className="hidden md:flex">
        <DataHeaderCell className="max-w-[2.5rem] flex-none basis-10">Type</DataHeaderCell>
        <DataHeaderCell className="max-w-[5rem] flex-none basis-20">ID</DataHeaderCell>
        <DataHeaderCell className="min-w-0 flex-[2]">Title</DataHeaderCell>
        <DataHeaderCell className="max-w-[8rem] flex-none basis-32">State</DataHeaderCell>
        <DataHeaderCell className="max-w-[4.5rem] flex-none basis-16">Priority</DataHeaderCell>
        <DataHeaderCell className="min-w-0 flex-1">Assignee</DataHeaderCell>
        <DataHeaderCell className="max-w-[7rem] flex-none basis-28" align="right">
          Due
        </DataHeaderCell>
      </DataHeader>

      {items.map((item, index) => {
        const type = item.fields?.["System.WorkItemType"];
        const dueDate = item.fields?.["Microsoft.VSTS.Scheduling.DueDate"];
        const priority = getPriorityValue(item);
        const pastDue = isPastDue(dueDate);
        const adoUrl = getWorkItemUrl(item);
        const selected = selectedId != null && String(selectedId) === String(item.id);

        return (
          <DataRow
            key={item.id}
            ref={(el) => {
              if (!rowRefs) return;
              if (el) rowRefs.current.set(index, el);
              else rowRefs.current.delete(index);
            }}
            selected={selected}
            onClick={() => onOpen(item, index)}
            className={cn(
              "h-auto items-stretch md:items-center",
              "flex-col gap-2 md:flex-row md:gap-3",
              rowPad
            )}
          >
            <div className="flex w-full min-w-0 flex-col gap-2 md:hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <WorkItemTypeIcon type={type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">
                        #{item.id}
                      </span>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate text-sm font-medium text-foreground">
                              {item.title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">{item.title}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.assignee || "Unassigned"}
                    </p>
                  </div>
                </div>
                <StatusBadge {...workItemState(item.state)} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge
                  tone={priorityTone(priority)}
                  label={priorityLabel(priority)}
                  dot={false}
                />
                {dueDate ? (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      pastDue ? "text-danger-foreground" : "text-muted-foreground"
                    )}
                  >
                    <TimeAgo date={dueDate} />
                  </span>
                ) : null}
              </div>
            </div>

            <DataCell className="hidden max-w-[2.5rem] flex-none basis-10 md:block">
              <WorkItemTypeIcon type={type} />
            </DataCell>
            <DataCell className="hidden max-w-[5rem] flex-none basis-20 md:block" mono>
              #{item.id}
            </DataCell>
            <DataCell className="hidden min-w-0 flex-[2] md:block">
              <div className="flex min-w-0 items-center gap-2">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">{item.title}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {adoUrl && adoUrl !== `#${item.id}` ? (
                  <a
                    href={adoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Open in Azure DevOps"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </DataCell>
            <DataCell className="hidden max-w-[8rem] flex-none basis-32 md:block">
              <StatusBadge {...workItemState(item.state)} />
            </DataCell>
            <DataCell className="hidden max-w-[4.5rem] flex-none basis-16 md:block">
              <StatusBadge
                tone={priorityTone(priority)}
                label={priorityLabel(priority)}
                dot={false}
              />
            </DataCell>
            <DataCell className="hidden min-w-0 flex-1 md:block">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-control bg-muted text-[10px] font-medium text-muted-foreground"
                  aria-hidden="true"
                >
                  {getInitials(item.assignee)}
                </span>
                <span className="truncate text-sm text-foreground">
                  {item.assignee || "Unassigned"}
                </span>
              </div>
            </DataCell>
            <DataCell className="hidden max-w-[7rem] flex-none basis-28 md:block" align="right">
              {dueDate ? (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    pastDue ? "text-danger-foreground" : "text-muted-foreground"
                  )}
                >
                  <TimeAgo date={dueDate} />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </DataCell>
          </DataRow>
        );
      })}
    </DataTable>
  );
}
