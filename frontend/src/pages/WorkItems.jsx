import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiService } from "../api/apiService";
import { useOrganization } from "../contexts/OrganizationContext";
import { useHealth } from "../contexts/HealthContext";
import WorkItemDetailModal from "../components/WorkItemDetailModal";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { InlineError, PageError } from "@/components/kit/InlineError";
import { PageHeader } from "@/components/kit/PageHeader";
import { SkeletonStatStrip } from "@/components/kit/Skeletons";
import { StatCell, StatStrip } from "@/components/kit/StatStrip";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { SyncButton } from "@/components/kit/SyncButton";
import { SegmentedFilter } from "@/components/kit/Toolbar";

import { OverdueTable } from "./work-items/OverdueTable";
import { SprintInsights } from "./work-items/SprintInsights";
import { SprintItemsTable } from "./work-items/SprintItemsTable";
import { WorkItemFilters } from "./work-items/WorkItemFilters";
import {
  applyWorkItemFilters,
  buildAssigneeOptions,
  buildPriorityOptions,
  buildStateOptions,
  flattenSprintItems,
} from "./work-items/helpers";

const TAB_VALUES = new Set(["sprint", "overdue"]);

const EMPTY_FILTERS = {
  states: [],
  assignees: [],
  priorities: [],
  search: "",
  highPriority: false,
};

function normalizeTab(raw) {
  if (TAB_VALUES.has(raw)) return raw;
  return "sprint";
}

function readAiSummaryEnabled() {
  const saved = localStorage.getItem("aiSummaryEnabled");
  if (saved === null) {
    localStorage.setItem("aiSummaryEnabled", "false");
    return false;
  }
  try {
    return JSON.parse(saved) === true;
  } catch {
    return false;
  }
}

function chipsFromFilters(filters) {
  const chips = [];
  filters.states.forEach((s) => chips.push({ id: `state:${s}`, label: `State: ${s}` }));
  filters.assignees.forEach((a) => chips.push({ id: `assignee:${a}`, label: `Assignee: ${a}` }));
  filters.priorities.forEach((p) => chips.push({ id: `priority:${p}`, label: `Priority: ${p}` }));
  if (filters.highPriority) chips.push({ id: "highPriority", label: "High priority (P1/P2)" });
  if (filters.search.trim())
    chips.push({ id: "search", label: `Search: ${filters.search.trim()}` });
  return chips;
}

function filtersActive(filters) {
  return (
    filters.states.length > 0 ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    Boolean(filters.search.trim()) ||
    filters.highPriority
  );
}

export default function WorkItems() {
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const { checkConnection } = useHealth();

  const [loadingStates, setLoadingStates] = useState({
    sprintSummary: true,
    aiSummary: false,
    overdueItems: true,
  });
  const [error, setError] = useState(null);
  const [overdueError, setOverdueError] = useState(null);
  const [sprintSummary, setSprintSummary] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [overdueItems, setOverdueItems] = useState([]);
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(readAiSummaryEnabled);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [tabParam, setTabParam] = useSearchParamState("tab", "sprint");
  const [stateFilter, setStateFilter] = useSearchParamState("state", [], { multiple: true });
  const [assigneeFilter, setAssigneeFilter] = useSearchParamState("assignee", [], {
    multiple: true,
  });
  const [priorityFilter, setPriorityFilter] = useSearchParamState("priority", [], {
    multiple: true,
  });

  const tab = normalizeTab(tabParam);

  // Independent filter bags per tab. URL mirrors the active tab only.
  const [sprintFilters, setSprintFilters] = useState(() =>
    tab === "sprint"
      ? {
          states: stateFilter,
          assignees: assigneeFilter,
          priorities: priorityFilter,
          search: "",
          highPriority: false,
        }
      : { ...EMPTY_FILTERS }
  );
  const [overdueFilters, setOverdueFilters] = useState(() =>
    tab === "overdue"
      ? {
          states: stateFilter,
          assignees: assigneeFilter,
          priorities: priorityFilter,
          search: "",
          highPriority: false,
        }
      : { ...EMPTY_FILTERS }
  );

  const rowRefs = useRef(new Map());
  const triggerRef = useRef(null);
  const skipUrlSync = useRef(false);

  useEffect(() => {
    if (tabParam && !TAB_VALUES.has(tabParam)) {
      setTabParam("sprint");
    }
  }, [tabParam, setTabParam]);

  const activeFilters = tab === "overdue" ? overdueFilters : sprintFilters;
  const setActiveFilters = tab === "overdue" ? setOverdueFilters : setSprintFilters;

  // Keep URL in sync with the active tab's facet filters (search / highPriority stay local).
  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    const sameStates =
      stateFilter.length === activeFilters.states.length &&
      stateFilter.every((v, i) => v === activeFilters.states[i]);
    const sameAssignees =
      assigneeFilter.length === activeFilters.assignees.length &&
      assigneeFilter.every((v, i) => v === activeFilters.assignees[i]);
    const samePriorities =
      priorityFilter.length === activeFilters.priorities.length &&
      priorityFilter.every((v, i) => v === activeFilters.priorities[i]);

    if (!sameStates) setStateFilter(activeFilters.states);
    if (!sameAssignees) setAssigneeFilter(activeFilters.assignees);
    if (!samePriorities) setPriorityFilter(activeFilters.priorities);
  }, [
    tab,
    activeFilters.states,
    activeFilters.assignees,
    activeFilters.priorities,
    stateFilter,
    assigneeFilter,
    priorityFilter,
    setStateFilter,
    setAssigneeFilter,
    setPriorityFilter,
  ]);

  const loadAiSummary = useCallback(async () => {
    try {
      setLoadingStates((prev) => ({ ...prev, aiSummary: true }));
      const aiData = await apiService.getAISummary();
      setAiSummary(aiData);
    } catch (err) {
      setAiSummary({
        summary: err.userMessage || "AI summary temporarily unavailable.",
        status: "error",
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, aiSummary: false }));
    }
  }, []);

  const loadWorkItemsData = useCallback(async () => {
    try {
      setError(null);
      setOverdueError(null);

      const currentAiEnabled = (() => {
        try {
          return JSON.parse(localStorage.getItem("aiSummaryEnabled") ?? "false") === true;
        } catch {
          return false;
        }
      })();

      setLoadingStates({
        sprintSummary: true,
        aiSummary: currentAiEnabled,
        overdueItems: true,
      });

      try {
        const sprintData = await apiService.getCurrentSprintSummary();
        setSprintSummary(sprintData);
        setLoadingStates((prev) => ({ ...prev, sprintSummary: false }));
        setHasLoadedOnce(true);
        clearSwitching();
      } catch (err) {
        setSprintSummary(null);
        setLoadingStates((prev) => ({ ...prev, sprintSummary: false }));
        setHasLoadedOnce(true);
        setError(
          err.userMessage ||
            "Failed to load sprint data. Please check your Azure DevOps configuration."
        );
        clearSwitching();
      }

      try {
        const overdueData = await apiService.getOverdueItems();
        setOverdueItems(overdueData.value || []);
        setOverdueError(null);
      } catch {
        setOverdueItems([]);
        setOverdueError("Could not load overdue items. Sprint data is still available.");
      } finally {
        setLoadingStates((prev) => ({ ...prev, overdueItems: false }));
      }

      if (currentAiEnabled) {
        await loadAiSummary();
      } else {
        setLoadingStates((prev) => ({ ...prev, aiSummary: false }));
      }

      setLastSyncedAt(new Date());
    } catch (err) {
      setError(
        err.userMessage || "Failed to load work items. Please check your connection and try again."
      );
      setHasLoadedOnce(true);
      clearSwitching();
      setLoadingStates({
        sprintSummary: false,
        aiSummary: false,
        overdueItems: false,
      });
    }
  }, [clearSwitching, loadAiSummary]);

  useEffect(() => {
    if (currentOrganization) {
      loadWorkItemsData();
    }
  }, [currentOrganization, currentProject, loadWorkItemsData]);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadWorkItemsData()]);
  };

  const toggleAiSummary = (next) => {
    setAiSummaryEnabled(next);
    localStorage.setItem("aiSummaryEnabled", JSON.stringify(next));
    if (next) {
      loadAiSummary();
    }
  };

  const pushFiltersToUrl = (filters) => {
    skipUrlSync.current = true;
    setStateFilter(filters.states);
    setAssigneeFilter(filters.assignees);
    setPriorityFilter(filters.priorities);
  };

  const handleTabChange = (next) => {
    const nextTab = normalizeTab(next);
    if (nextTab === tab) return;
    const nextBag = nextTab === "overdue" ? overdueFilters : sprintFilters;
    pushFiltersToUrl(nextBag);
    setTabParam(nextTab);
  };

  /** Jump to sprint with an explicit filter bag (StatStrip shortcuts). */
  const showSprintWithFilters = (filters) => {
    setSprintFilters(filters);
    pushFiltersToUrl(filters);
    setTabParam("sprint");
  };

  const patchActiveFilters = (patch) => {
    setActiveFilters((prev) => ({ ...prev, ...patch }));
  };

  const allSprintItems = useMemo(() => flattenSprintItems(sprintSummary), [sprintSummary]);

  const filteredSprintItems = useMemo(
    () =>
      applyWorkItemFilters(allSprintItems, {
        states: sprintFilters.states,
        assignees: sprintFilters.assignees,
        priorities: sprintFilters.priorities,
        search: sprintFilters.search,
        highPriority: sprintFilters.highPriority,
        mode: "sprint",
      }),
    [allSprintItems, sprintFilters]
  );

  const filteredOverdueItems = useMemo(
    () =>
      applyWorkItemFilters(overdueItems, {
        states: overdueFilters.states,
        assignees: overdueFilters.assignees,
        priorities: overdueFilters.priorities,
        search: overdueFilters.search,
        highPriority: overdueFilters.highPriority,
        mode: "overdue",
      }),
    [overdueItems, overdueFilters]
  );

  const activeList = tab === "overdue" ? filteredOverdueItems : filteredSprintItems;
  const activeTotal = tab === "overdue" ? overdueItems.length : allSprintItems.length;

  const sourceForOptions = tab === "overdue" ? overdueItems : allSprintItems;
  const optionMode = tab === "overdue" ? "overdue" : "sprint";

  const stateOptions = useMemo(
    () => buildStateOptions(sourceForOptions, optionMode),
    [sourceForOptions, optionMode]
  );
  const assigneeOptions = useMemo(
    () => buildAssigneeOptions(sourceForOptions, optionMode),
    [sourceForOptions, optionMode]
  );
  const priorityOptions = useMemo(() => buildPriorityOptions(sourceForOptions), [sourceForOptions]);

  const activeChips = useMemo(() => chipsFromFilters(activeFilters), [activeFilters]);
  const activeFiltersOn = filtersActive(activeFilters);

  const clearFilters = (id) => {
    if (!id) {
      patchActiveFilters({ ...EMPTY_FILTERS });
      return;
    }
    if (id === "search") {
      patchActiveFilters({ search: "" });
      return;
    }
    if (id === "highPriority") {
      patchActiveFilters({ highPriority: false });
      return;
    }
    if (id.startsWith("state:")) {
      const v = id.slice("state:".length);
      patchActiveFilters({ states: activeFilters.states.filter((s) => s !== v) });
      return;
    }
    if (id.startsWith("assignee:")) {
      const v = id.slice("assignee:".length);
      patchActiveFilters({ assignees: activeFilters.assignees.filter((a) => a !== v) });
      return;
    }
    if (id.startsWith("priority:")) {
      const v = id.slice("priority:".length);
      patchActiveFilters({ priorities: activeFilters.priorities.filter((p) => p !== v) });
    }
  };

  const openWorkItem = (item, index) => {
    const el = rowRefs.current.get(index);
    if (el) triggerRef.current = el;
    setSelectedWorkItem(item);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setSelectedWorkItem(null);
  };

  const navigateSheet = (nextIndex) => {
    const next = activeList[nextIndex];
    if (!next) return;
    setSelectedWorkItem(next);
    const el = rowRefs.current.get(nextIndex);
    if (el) triggerRef.current = el;
  };

  const progressPct =
    sprintSummary?.total > 0
      ? Math.round(((sprintSummary.completed || 0) / sprintSummary.total) * 100)
      : 0;

  const overdueCount = sprintSummary?.overdue ?? overdueItems.length;
  const isSyncing = Object.values(loadingStates).some(Boolean);

  const headerStatus = (() => {
    if (loadingStates.sprintSummary) return null;
    if (overdueCount > 0) {
      return <StatusBadge tone="danger" label={`${overdueCount} overdue`} />;
    }
    return <StatusBadge tone="success" label="On track" />;
  })();

  const sprintName = "Current sprint";

  const showPageError = Boolean(error && !hasLoadedOnce && loadingStates.sprintSummary);
  const showInlineError = Boolean(error && hasLoadedOnce);

  if (showPageError) {
    return <PageError message={error} onRetry={loadWorkItemsData} />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Work Items"
        description={sprintName}
        status={headerStatus}
        actions={
          <SyncButton onSync={handleSync} isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} />
        }
      />

      {loadingStates.sprintSummary && !sprintSummary ? (
        <SkeletonStatStrip cells={4} />
      ) : (
        <StatStrip loading={loadingStates.sprintSummary && !sprintSummary}>
          <StatCell
            label="Work Items"
            value={sprintSummary?.total ?? 0}
            sub={`${sprintName} · ${progressPct}%`}
            tone="neutral"
            onClick={() => showSprintWithFilters({ ...EMPTY_FILTERS })}
          />
          <StatCell
            label="In Progress"
            value={sprintSummary?.active ?? 0}
            sub="Active"
            tone="info"
            onClick={() =>
              showSprintWithFilters({
                ...EMPTY_FILTERS,
                states: ["Active"],
              })
            }
          />
          <StatCell
            label="Completed"
            value={sprintSummary?.completed ?? 0}
            sub="Done"
            tone="success"
            onClick={() =>
              showSprintWithFilters({
                ...EMPTY_FILTERS,
                states: ["Done", "Closed", "Resolved"],
              })
            }
          />
          <StatCell
            label="Overdue"
            value={overdueCount}
            sub={overdueCount > 0 ? "Needs attention" : "On track"}
            tone={overdueCount > 0 ? "danger" : "success"}
            onClick={() => handleTabChange("overdue")}
          />
        </StatStrip>
      )}

      <SprintInsights
        enabled={aiSummaryEnabled}
        onEnabledChange={toggleAiSummary}
        loading={loadingStates.aiSummary}
        summary={aiSummary}
        onRetry={loadAiSummary}
      />

      <div className="space-y-2">
        <SegmentedFilter
          className="h-auto max-w-full flex-wrap"
          options={[
            { value: "sprint", label: "Sprint items", count: allSprintItems.length },
            {
              value: "overdue",
              label: `Overdue (${overdueItems.length})`,
              count: overdueItems.length,
            },
          ]}
          value={tab}
          onChange={handleTabChange}
        />

        <WorkItemFilters
          stateOptions={stateOptions}
          assigneeOptions={assigneeOptions}
          priorityOptions={priorityOptions}
          states={activeFilters.states}
          assignees={activeFilters.assignees}
          priorities={activeFilters.priorities}
          search={activeFilters.search}
          highPriority={activeFilters.highPriority}
          shown={activeList.length}
          total={activeTotal}
          noun={tab === "overdue" ? "overdue items" : "work items"}
          chips={activeChips}
          onStatesChange={(v) => patchActiveFilters({ states: v })}
          onAssigneesChange={(v) => patchActiveFilters({ assignees: v })}
          onPrioritiesChange={(v) => patchActiveFilters({ priorities: v })}
          onSearchChange={(v) => patchActiveFilters({ search: v })}
          onHighPriorityChange={(next) => {
            patchActiveFilters({
              highPriority: next,
              ...(next ? { priorities: [] } : {}),
            });
          }}
          onClear={clearFilters}
        />
      </div>

      {showInlineError ? <InlineError message={error} onRetry={loadWorkItemsData} /> : null}
      {overdueError ? <InlineError message={overdueError} /> : null}

      {tab === "sprint" && !(error && !sprintSummary) ? (
        <SprintItemsTable
          items={filteredSprintItems}
          loading={loadingStates.sprintSummary}
          hasSprintData={Boolean(sprintSummary) && allSprintItems.length > 0}
          filtersActive={activeFiltersOn}
          selectedId={isSheetOpen ? selectedWorkItem?.id : null}
          onOpen={openWorkItem}
          onClearFilters={() => clearFilters()}
          rowRefs={rowRefs}
        />
      ) : null}

      {tab === "overdue" ? (
        <OverdueTable
          items={filteredOverdueItems}
          loading={loadingStates.overdueItems}
          hasOverdueSource={overdueItems.length > 0}
          filtersActive={activeFiltersOn}
          selectedId={isSheetOpen ? selectedWorkItem?.id : null}
          onOpen={openWorkItem}
          onClearFilters={() => clearFilters()}
          rowRefs={rowRefs}
        />
      ) : null}

      <WorkItemDetailModal
        workItem={selectedWorkItem}
        isOpen={isSheetOpen}
        onClose={closeSheet}
        list={activeList}
        onNavigate={navigateSheet}
        triggerRef={triggerRef}
      />
    </div>
  );
}
