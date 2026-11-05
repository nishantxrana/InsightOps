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
  const [searchTerm, setSearchTerm] = useState("");
  const [highPriority, setHighPriority] = useState(false);
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
  const rowRefs = useRef(new Map());
  const triggerRef = useRef(null);

  useEffect(() => {
    if (tabParam && !TAB_VALUES.has(tabParam)) {
      setTabParam("sprint");
    }
  }, [tabParam, setTabParam]);

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

  const allSprintItems = useMemo(() => flattenSprintItems(sprintSummary), [sprintSummary]);

  const filterBag = useMemo(
    () => ({
      states: stateFilter,
      assignees: assigneeFilter,
      priorities: priorityFilter,
      search: searchTerm,
      highPriority,
    }),
    [stateFilter, assigneeFilter, priorityFilter, searchTerm, highPriority]
  );

  const filteredSprintItems = useMemo(
    () => applyWorkItemFilters(allSprintItems, { ...filterBag, mode: "sprint" }),
    [allSprintItems, filterBag]
  );

  const filteredOverdueItems = useMemo(
    () => applyWorkItemFilters(overdueItems, { ...filterBag, mode: "overdue" }),
    [overdueItems, filterBag]
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

  const filtersActive =
    stateFilter.length > 0 ||
    assigneeFilter.length > 0 ||
    priorityFilter.length > 0 ||
    Boolean(searchTerm.trim()) ||
    highPriority;

  const activeChips = useMemo(() => {
    const chips = [];
    stateFilter.forEach((s) => chips.push({ id: `state:${s}`, label: `State: ${s}` }));
    assigneeFilter.forEach((a) => chips.push({ id: `assignee:${a}`, label: `Assignee: ${a}` }));
    priorityFilter.forEach((p) => chips.push({ id: `priority:${p}`, label: `Priority: ${p}` }));
    if (highPriority) chips.push({ id: "highPriority", label: "High priority (P1/P2)" });
    if (searchTerm.trim()) chips.push({ id: "search", label: `Search: ${searchTerm.trim()}` });
    return chips;
  }, [stateFilter, assigneeFilter, priorityFilter, highPriority, searchTerm]);

  const clearFilters = (id) => {
    if (!id) {
      setStateFilter([]);
      setAssigneeFilter([]);
      setPriorityFilter([]);
      setSearchTerm("");
      setHighPriority(false);
      return;
    }
    if (id === "search") {
      setSearchTerm("");
      return;
    }
    if (id === "highPriority") {
      setHighPriority(false);
      return;
    }
    if (id.startsWith("state:")) {
      const v = id.slice("state:".length);
      setStateFilter(stateFilter.filter((s) => s !== v));
      return;
    }
    if (id.startsWith("assignee:")) {
      const v = id.slice("assignee:".length);
      setAssigneeFilter(assigneeFilter.filter((a) => a !== v));
      return;
    }
    if (id.startsWith("priority:")) {
      const v = id.slice("priority:".length);
      setPriorityFilter(priorityFilter.filter((p) => p !== v));
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
            onClick={() => {
              setTabParam("sprint");
              clearFilters();
            }}
          />
          <StatCell
            label="In Progress"
            value={sprintSummary?.active ?? 0}
            sub="Active"
            tone="info"
            onClick={() => {
              setTabParam("sprint");
              setStateFilter(["Active"]);
            }}
          />
          <StatCell
            label="Completed"
            value={sprintSummary?.completed ?? 0}
            sub="Done"
            tone="success"
            onClick={() => {
              setTabParam("sprint");
              setStateFilter(["Done", "Closed", "Resolved"]);
            }}
          />
          <StatCell
            label="Overdue"
            value={overdueCount}
            sub={overdueCount > 0 ? "Needs attention" : "On track"}
            tone={overdueCount > 0 ? "danger" : "success"}
            onClick={() => setTabParam("overdue")}
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
          onChange={setTabParam}
        />

        <WorkItemFilters
          stateOptions={stateOptions}
          assigneeOptions={assigneeOptions}
          priorityOptions={priorityOptions}
          states={stateFilter}
          assignees={assigneeFilter}
          priorities={priorityFilter}
          search={searchTerm}
          highPriority={highPriority}
          shown={activeList.length}
          total={activeTotal}
          noun={tab === "overdue" ? "overdue items" : "work items"}
          chips={activeChips}
          onStatesChange={setStateFilter}
          onAssigneesChange={setAssigneeFilter}
          onPrioritiesChange={setPriorityFilter}
          onSearchChange={setSearchTerm}
          onHighPriorityChange={(next) => {
            setHighPriority(next);
            if (next) setPriorityFilter([]);
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
          filtersActive={filtersActive}
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
          filtersActive={filtersActive}
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
