import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, ExternalLink, GitPullRequest } from "lucide-react";
import { format } from "date-fns";

import { apiService } from "../api/apiService";
import { useOrganization } from "../contexts/OrganizationContext";
import { useHealth } from "../contexts/HealthContext";
import PullRequestDetailModal from "../components/PullRequestDetailModal";
import TimeRangeSelector from "../components/TimeRangeSelector";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { useDensity } from "@/hooks/useDensity";
import { useAiStatus } from "@/hooks/useAiStatus";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AvatarStack } from "@/components/kit/AvatarStack";
import { DataRow, DataTable, TimeAgo } from "@/components/kit/DataTable";
import { EmptyState } from "@/components/kit/EmptyState";
import { InlineError } from "@/components/kit/InlineError";
import { PageHeader } from "@/components/kit/PageHeader";
import { SkeletonRows } from "@/components/kit/Skeletons";
import { StatCell, StatStrip } from "@/components/kit/StatStrip";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { SyncButton } from "@/components/kit/SyncButton";
import {
  ActiveFilters,
  DensityToggle,
  ResultCount,
  SearchField,
  SegmentedFilter,
  SortSelect,
  Toolbar,
} from "@/components/kit/Toolbar";
import { prStatus } from "@/components/kit/statusMaps";
import { cn } from "@/lib/utils";

const FILTER_VALUES = new Set(["all", "in-review", "no-reviewers", "conflicts", "stale"]);

function normalizeFilter(raw) {
  if (raw === "idle") return "stale";
  if (FILTER_VALUES.has(raw)) return raw;
  return "all";
}

function mergeStatusBadge(mergeStatus) {
  const merge = (mergeStatus || "").toLowerCase();
  if (merge === "succeeded") return { tone: "success", label: "Ready" };
  if (merge === "conflicts") return { tone: "danger", label: "Conflicts" };
  if (merge === "queued") return { tone: "info", label: "Queued" };
  return { tone: "warning", label: "Pending" };
}

function branchName(ref) {
  return (ref || "").replace("refs/heads/", "");
}

function projectRepoLabel(pr) {
  const project = pr.repository?.project?.name || "";
  const repo = pr.repository?.name || "";
  if (!project && !repo) return "—";
  if (project && repo && project.toLowerCase() === repo.toLowerCase()) return project;
  if (project && repo) return `${project} · ${repo}`;
  return project || repo;
}

function activityDate(pr) {
  return pr.lastMergeCommit?.committer?.date || pr.creationDate || null;
}

function matchesSearch(pr, q) {
  if (!q) return true;
  const hay = [
    pr.title,
    String(pr.pullRequestId ?? ""),
    pr.createdBy?.displayName,
    pr.createdBy?.uniqueName,
    branchName(pr.sourceRefName),
    branchName(pr.targetRefName),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function PullRequests() {
  const { aiStatus } = useAiStatus();
  const [loadingStates, setLoadingStates] = useState({
    pullRequests: true,
    idlePRs: true,
    stats: true,
  });
  const [error, setError] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);
  const [idlePRs, setIdlePRs] = useState([]);
  const [filterParam, setFilterParam] = useSearchParamState("filter", "all");
  const [sortBy, setSortBy] = useSearchParamState("sort", "newest");
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState({
    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    to: new Date(),
    label: "1 Day",
    value: "1d",
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unassigned: 0,
    idle: 0,
    conflicts: 0,
  });
  const [selectedPR, setSelectedPR] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const { checkConnection } = useHealth();
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const { density } = useDensity();
  const parentRef = useRef(null);
  const rowRefs = useRef(new Map());
  const triggerRef = useRef(null);

  const filter = normalizeFilter(filterParam);

  useEffect(() => {
    if (
      filterParam === "idle" ||
      (filterParam && !FILTER_VALUES.has(filterParam) && filterParam !== "idle")
    ) {
      if (filterParam === "idle") setFilterParam("stale");
      else if (!FILTER_VALUES.has(filterParam)) setFilterParam("all");
    }
  }, [filterParam, setFilterParam]);

  const loadPullRequestsData = useCallback(async () => {
    try {
      setError(null);
      setLoadingStates({
        pullRequests: true,
        idlePRs: true,
        stats: true,
      });

      let prsList = [];

      try {
        const days = Math.ceil((timeRange.to - timeRange.from) / (1000 * 60 * 60 * 24));

        const response = await fetch(`/api/pull-requests/by-date?days=${days}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "X-Organization-ID": localStorage.getItem("currentOrganizationId"),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch pull requests");
        }

        const prsData = await response.json();
        prsList = prsData.value || [];
        setPullRequests(prsList);

        const newStats = {
          total: prsList.length,
          active: prsList.filter(
            (pr) => pr.status === "active" && pr.reviewers && pr.reviewers.length > 0
          ).length,
          unassigned: prsList.filter(
            (pr) => pr.status === "active" && (!pr.reviewers || pr.reviewers.length === 0)
          ).length,
          conflicts: prsList.filter((pr) => pr.mergeStatus === "conflicts").length,
          idle: 0,
        };
        setStats((prev) => ({ ...prev, ...newStats }));
        setLoadingStates((prev) => ({ ...prev, pullRequests: false, stats: false }));
      } catch (err) {
        setPullRequests([]);
        setStats({ total: 0, active: 0, unassigned: 0, idle: 0, conflicts: 0 });
        setLoadingStates((prev) => ({
          ...prev,
          pullRequests: false,
          stats: false,
          idlePRs: false,
        }));
        setError(
          err.userMessage ||
            "Failed to load pull requests. Please check your Azure DevOps configuration."
        );
        clearSwitching();
        return;
      }

      try {
        const idleData = await apiService.getIdlePullRequests();
        const idleList = idleData.value || [];
        const prIds = new Set(prsList.map((pr) => pr.pullRequestId));
        const filteredIdlePRs = idleList.filter((idlePR) => prIds.has(idlePR.pullRequestId));

        setIdlePRs(filteredIdlePRs);
        setStats((prev) => ({ ...prev, idle: filteredIdlePRs.length }));
        setLoadingStates((prev) => ({ ...prev, idlePRs: false }));
      } catch {
        setIdlePRs([]);
        setStats((prev) => ({ ...prev, idle: 0 }));
        setLoadingStates((prev) => ({ ...prev, idlePRs: false }));
      }

      setLastSyncedAt(new Date());
      clearSwitching();
    } catch (err) {
      setError(
        err.userMessage ||
          "Failed to load pull requests. Please check your connection and try again."
      );
      setPullRequests([]);
      setIdlePRs([]);
      setStats({ total: 0, active: 0, unassigned: 0, idle: 0, conflicts: 0 });
      setLoadingStates({
        pullRequests: false,
        idlePRs: false,
        stats: false,
      });
      clearSwitching();
    }
  }, [timeRange, clearSwitching]);

  useEffect(() => {
    if (currentOrganization) {
      loadPullRequestsData();
    }
  }, [timeRange, currentOrganization, currentProject, loadPullRequestsData]);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadPullRequestsData()]);
  };

  const idleIdSet = useMemo(() => new Set(idlePRs.map((p) => p.pullRequestId)), [idlePRs]);

  const getPRPriority = useCallback(
    (pr) => {
      const isUnassigned = pr.status === "active" && (!pr.reviewers || pr.reviewers.length === 0);
      const hasConflicts = pr.mergeStatus === "conflicts";
      const isIdle = idleIdSet.has(pr.pullRequestId);

      if (hasConflicts) return 0;
      if (isUnassigned) return 1;
      if (isIdle) return 2;
      if (pr.status === "active") return 3;
      return 4;
    },
    [idleIdSet]
  );

  const filteredPRs = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = pullRequests.filter((pr) => matchesSearch(pr, q));

    switch (filter) {
      case "in-review":
        filtered = filtered.filter(
          (pr) => pr.status === "active" && pr.reviewers && pr.reviewers.length > 0
        );
        break;
      case "no-reviewers":
        filtered = filtered.filter(
          (pr) => pr.status === "active" && (!pr.reviewers || pr.reviewers.length === 0)
        );
        break;
      case "stale":
        filtered = filtered.filter((pr) => idleIdSet.has(pr.pullRequestId));
        break;
      case "conflicts":
        filtered = filtered.filter((pr) => pr.mergeStatus === "conflicts");
        break;
      default:
        break;
    }

    return [...filtered].sort((a, b) => {
      const priorityDiff = getPRPriority(a) - getPRPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      switch (sortBy) {
        case "oldest":
          return new Date(a.creationDate) - new Date(b.creationDate);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        case "newest":
        default:
          return new Date(b.creationDate) - new Date(a.creationDate);
      }
    });
  }, [pullRequests, filter, sortBy, search, idleIdSet, getPRPriority]);

  const estimateSize = density === "compact" ? 56 : density === "comfortable" ? 72 : 64;

  const rowVirtualizer = useVirtualizer({
    count: filteredPRs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  const isLoading = loadingStates.pullRequests;
  const isSyncing = Object.values(loadingStates).some(Boolean);

  const handleExportCSV = () => {
    if (filteredPRs.length === 0) return;

    const headers = [
      "ID",
      "Title",
      "Status",
      "Repository",
      "Source Branch",
      "Target Branch",
      "Created By",
      "Created Date",
      "Reviewers",
      "Merge Status",
      "URL",
    ];

    const rows = filteredPRs.map((pr) => {
      const reviewers =
        pr.reviewers?.map((r) => r.displayName || r.uniqueName).join("; ") || "None";
      const createdDate = pr.creationDate
        ? format(new Date(pr.creationDate), "yyyy-MM-dd HH:mm:ss")
        : "";
      const url = pr.webUrl || pr._links?.web?.href || "";

      return [
        pr.pullRequestId || "",
        (pr.title || "").replace(/"/g, '""'),
        pr.status || "",
        pr.repository?.name || "",
        branchName(pr.sourceRefName),
        branchName(pr.targetRefName),
        pr.createdBy?.displayName || pr.createdBy?.uniqueName || "",
        createdDate,
        reviewers.replace(/"/g, '""'),
        pr.mergeStatus || "",
        url,
      ]
        .map((field) => `"${field}"`)
        .join(",");
    });

    const csv = [headers.map((h) => `"${h}"`).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
    const filterSuffix = filter !== "all" ? `-${filter}` : "";
    link.download = `pull-requests${filterSuffix}-${timestamp}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openPR = (pr, index) => {
    const el = rowRefs.current.get(index);
    if (el) triggerRef.current = el;
    setSelectedPR(pr);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setSelectedPR(null);
  };

  const navigateSheet = (nextIndex) => {
    const pr = filteredPRs[nextIndex];
    if (!pr) return;
    const el = rowRefs.current.get(nextIndex);
    if (el) triggerRef.current = el;
    setSelectedPR(pr);
  };

  const clearFilters = (id) => {
    if (!id) {
      setFilterParam("all");
      setSearch("");
      setSortBy("newest");
      return;
    }
    if (id === "filter") setFilterParam("all");
    if (id === "search") setSearch("");
    if (id === "sort") setSortBy("newest");
  };

  const activeChips = [];
  if (filter !== "all") {
    const labels = {
      "in-review": "In Review",
      "no-reviewers": "No Reviewers",
      conflicts: "Conflicts",
      stale: "Stale (48h+)",
    };
    activeChips.push({ id: "filter", label: labels[filter] || filter });
  }
  if (search.trim()) {
    activeChips.push({ id: "search", label: `Search: ${search.trim()}` });
  }
  if (sortBy && sortBy !== "newest") {
    activeChips.push({
      id: "sort",
      label: sortBy === "oldest" ? "Oldest" : "A–Z",
    });
  }

  const headerStatus = (() => {
    if (isLoading || stats.total === 0) return null;
    if (stats.unassigned > 0) {
      return <StatusBadge tone="danger" label={`${stats.unassigned} need reviewers`} />;
    }
    if (stats.idle > 0) {
      return <StatusBadge tone="warning" label={`${stats.idle} stale`} />;
    }
    return <StatusBadge tone="success" label="All clear" />;
  })();

  const segmentOptions = [
    { value: "all", label: "All", count: pullRequests.length },
    { value: "in-review", label: "In Review", count: stats.active },
    { value: "no-reviewers", label: "No Reviewers", count: stats.unassigned },
    { value: "conflicts", label: "Conflicts", count: stats.conflicts },
    { value: "stale", label: "Stale (48h+)", count: stats.idle },
  ];

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Pull Requests"
        description="Active pull requests and review status"
        status={headerStatus}
        actions={
          <>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <SyncButton onSync={handleSync} isSyncing={isSyncing} lastSyncedAt={lastSyncedAt} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredPRs.length === 0 || isSyncing}
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export
            </Button>
          </>
        }
      />

      <StatStrip loading={loadingStates.stats}>
        <StatCell
          label="Total"
          value={stats.total}
          sub="Pull requests"
          tone="neutral"
          onClick={() => setFilterParam("all")}
        />
        <StatCell
          label="In Review"
          value={stats.active}
          sub="With reviewers"
          tone="info"
          onClick={() => setFilterParam("in-review")}
        />
        <StatCell
          label="No Reviewers"
          value={stats.unassigned}
          sub="All PRs have reviewers"
          tone={stats.unassigned > 0 ? "danger" : "success"}
          onClick={() => setFilterParam("no-reviewers")}
        />
        <StatCell
          label="Idle 48h+"
          value={stats.idle}
          sub="Within selected range"
          tone={stats.idle > 0 ? "warning" : "neutral"}
          onClick={() => setFilterParam("stale")}
        />
      </StatStrip>

      <div className="space-y-2">
        <Toolbar className="lg:flex-nowrap">
          <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
            <SegmentedFilter
              className="h-auto max-w-full flex-wrap"
              options={segmentOptions}
              value={filter}
              onChange={setFilterParam}
            />
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search title, id, author, branch…"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SortSelect
              value={
                sortBy === "title" || sortBy === "oldest" || sortBy === "newest" ? sortBy : "newest"
              }
              onChange={setSortBy}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "title", label: "A–Z" },
              ]}
            />
            <DensityToggle />
            <ResultCount
              shown={filteredPRs.length}
              total={pullRequests.length}
              noun="pull requests"
            />
          </div>
        </Toolbar>
        <ActiveFilters chips={activeChips} onClear={clearFilters} />
      </div>

      {error ? <InlineError message={error} onRetry={loadPullRequestsData} /> : null}

      {isLoading ? (
        <SkeletonRows rows={6} columns={3} />
      ) : !error && filteredPRs.length === 0 ? (
        <EmptyState
          icon={<GitPullRequest />}
          title="No pull requests found"
          description="Widen the date range or clear filters to see more results."
          action={
            activeChips.length > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => clearFilters()}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : !error ? (
        <DataTable scrollRef={parentRef} maxHeight="min(55vh, 640px)" className="min-h-[12rem]">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const pr = filteredPRs[virtualRow.index];
              const isUnassigned =
                pr.status === "active" && (!pr.reviewers || pr.reviewers.length === 0);
              const isIdle = idleIdSet.has(pr.pullRequestId);
              const at = activityDate(pr);
              const source = branchName(pr.sourceRefName);
              const target = branchName(pr.targetRefName);
              const scope = projectRepoLabel(pr);
              const selected = selectedPR?.pullRequestId === pr.pullRequestId && isSheetOpen;

              return (
                <DataRow
                  key={virtualRow.key}
                  as="div"
                  data-index={virtualRow.index}
                  ref={(el) => {
                    if (el) rowRefs.current.set(virtualRow.index, el);
                    else rowRefs.current.delete(virtualRow.index);
                    rowVirtualizer.measureElement(el);
                  }}
                  selected={selected}
                  onClick={() => openPR(pr, virtualRow.index)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn(
                    "h-auto min-h-[56px] items-stretch py-2 sm:min-h-[64px]",
                    "flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-1 text-left">
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">
                            #{pr.pullRequestId}
                          </span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate text-sm font-medium text-foreground">
                                  {pr.title}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">{pr.title}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {pr.webUrl ? (
                            <a
                              href={pr.webUrl}
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
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="truncate max-w-[10rem]">
                        {pr.createdBy?.displayName || "Unknown"}
                      </span>
                      <span className="max-w-[14rem] truncate font-mono text-[12px]">
                        {source} → {target}
                      </span>
                      {at ? <TimeAgo date={at} /> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
                      <StatusBadge {...prStatus(pr)} />
                      <StatusBadge {...mergeStatusBadge(pr.mergeStatus)} />
                      {isUnassigned ? <StatusBadge tone="danger" label="No reviewers" /> : null}
                      {isIdle ? <StatusBadge tone="warning" label="Stale" /> : null}
                    </div>
                  </div>

                  <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 sm:flex">
                    <StatusBadge {...prStatus(pr)} />
                    <StatusBadge {...mergeStatusBadge(pr.mergeStatus)} />
                    {isUnassigned ? <StatusBadge tone="danger" label="No reviewers" /> : null}
                    {isIdle ? <StatusBadge tone="warning" label="Stale" /> : null}
                    <AvatarStack people={pr.reviewers || []} max={3} />
                    <span className="max-w-[9rem] truncate text-xs text-muted-foreground">
                      {scope}
                    </span>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {pr.creationDate ? format(new Date(pr.creationDate), "MMM d") : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:hidden">
                    <AvatarStack people={pr.reviewers || []} max={3} />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="max-w-[8rem] truncate">{scope}</span>
                      <span className="tabular-nums">
                        {pr.creationDate ? format(new Date(pr.creationDate), "MMM d") : "—"}
                      </span>
                    </div>
                  </div>
                </DataRow>
              );
            })}
          </div>
        </DataTable>
      ) : null}

      <PullRequestDetailModal
        pullRequest={selectedPR}
        isOpen={isSheetOpen}
        onClose={closeSheet}
        list={filteredPRs}
        onNavigate={navigateSheet}
        triggerRef={triggerRef}
        aiStatus={aiStatus}
      />
    </div>
  );
}
