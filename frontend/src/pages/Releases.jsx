import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rocket, Shield, XCircle } from "lucide-react";

import { releaseService } from "../api/releaseService";
import { useHealth } from "../contexts/HealthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import EnvironmentHealthDashboard from "../components/EnvironmentHealthDashboard";
import ReleaseDetailModal from "../components/ReleaseDetailModal";
import TimeRangeSelector from "../components/TimeRangeSelector";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { useDensity } from "@/hooks/useDensity";
import { useAiStatus } from "@/hooks/useAiStatus";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DataCell,
  DataHeader,
  DataHeaderCell,
  DataRow,
  DataTable,
  TimeAgo,
} from "@/components/kit/DataTable";
import { EmptyState } from "@/components/kit/EmptyState";
import { InlineError, PageError } from "@/components/kit/InlineError";
import { PageHeader } from "@/components/kit/PageHeader";
import { SkeletonRows } from "@/components/kit/Skeletons";
import { StatCell, StatStrip } from "@/components/kit/StatStrip";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { SyncButton } from "@/components/kit/SyncButton";
import {
  ActiveFilters,
  DensityToggle,
  FacetFilter,
  ResultCount,
  SearchField,
  Toolbar,
} from "@/components/kit/Toolbar";
import { releaseStatus } from "@/components/kit/statusMaps";
import { ENV_DOT_CLASS, envStatusTone } from "@/components/releases/releaseDetailHelpers";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 50;

const STATUS_VALUES = new Set([
  "all",
  "succeeded",
  "failed",
  "canceled",
  "abandoned",
  "waitingforapproval",
  "inprogress",
  "pending",
]);

const STATUS_LABELS = {
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
  abandoned: "Abandoned",
  waitingforapproval: "Waiting for Approval",
  inprogress: "In Progress",
  pending: "Pending",
};

function normalizeStatus(raw) {
  if (STATUS_VALUES.has(raw)) return raw;
  return "all";
}

function getReleasePriority(release) {
  const status = release.status?.toLowerCase();
  if (status === "waitingforapproval") return 0;
  if (status === "failed" || status === "rejected") return 1;
  if (status === "inprogress" || status === "deploying") return 2;
  if (status === "pending" || status === "notstarted") return 3;
  if (status === "canceled" || status === "cancelled" || status === "abandoned") return 4;
  return 5;
}

function successRateTone(rate) {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

function successRateLabel(rate) {
  if (rate >= 90) return "Healthy";
  if (rate >= 70) return "Fair";
  return "Critical";
}

function EnvironmentDots({ environments = [] }) {
  if (!environments.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-1" aria-label="Environments">
        {environments.map((env, index) => {
          const tone = envStatusTone(env.status);
          const badge = releaseStatus({ status: env.status });
          return (
            <Tooltip key={env.id ?? `${env.name}-${index}`}>
              <TooltipTrigger asChild>
                <span
                  className={cn("size-2 rounded-full", ENV_DOT_CLASS[tone])}
                  aria-label={`${env.name}: ${badge.label}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                {env.name}: {badge.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

export default function Releases() {
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const { checkConnection } = useHealth();
  const { density } = useDensity();
  const { aiStatus } = useAiStatus();

  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [releases, setReleases] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({
    totalReleases: 0,
    successRate: 0,
    pendingApprovals: 0,
    activeDeployments: 0,
  });
  const [timeRange, setTimeRange] = useState({
    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    to: new Date(),
    label: "1 Day",
    value: "1d",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [environments, setEnvironments] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [statusParam, setStatusParam] = useSearchParamState("status", "all");
  const [environmentParam, setEnvironmentParam] = useSearchParamState("environment", "all");
  const [definitionParam, setDefinitionParam] = useSearchParamState("definition", "all");

  const statusFilter = normalizeStatus(statusParam);
  const environmentFilter = environmentParam || "all";
  const definitionFilter = definitionParam || "all";

  const hasFailedDeploymentsStat = stats.failedDeployments != null;

  const rowRefs = useRef(new Map());
  const triggerRef = useRef(null);

  useEffect(() => {
    if (statusParam && !STATUS_VALUES.has(statusParam)) {
      setStatusParam("all");
    }
  }, [statusParam, setStatusParam]);

  const setStatusFilter = useCallback(
    (next) => {
      setStatusParam(normalizeStatus(next));
    },
    [setStatusParam]
  );

  const setEnvironmentFilter = useCallback(
    (next) => {
      setEnvironmentParam(next || "all");
    },
    [setEnvironmentParam]
  );

  const setDefinitionFilter = useCallback(
    (next) => {
      setDefinitionParam(next || "all");
    },
    [setDefinitionParam]
  );

  const loadReleasesData = useCallback(
    async (isPagination = false, page = currentPage) => {
      try {
        if (isPagination) {
          setPaginationLoading(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const statsResponse = await releaseService.getReleaseStats({
          fromDate: timeRange.from.toISOString(),
          toDate: timeRange.to.toISOString(),
        });
        if (statsResponse.success) {
          setStats(statsResponse.data);
          const totalReleases = statsResponse.data.totalReleases || 0;
          setTotalPages(Math.ceil(totalReleases / ITEMS_PER_PAGE));
        }

        const releasesResponse = await releaseService.getReleases({
          fromDate: timeRange.from.toISOString(),
          toDate: timeRange.to.toISOString(),
          limit: ITEMS_PER_PAGE,
          skip: (page - 1) * ITEMS_PER_PAGE,
        });

        if (releasesResponse.success) {
          const releasesList = releasesResponse.data.releases || [];
          setReleases(releasesList);

          const uniqueEnvironments = [
            ...new Set(
              releasesList.flatMap((release) => (release.environments || []).map((env) => env.name))
            ),
          ]
            .filter(Boolean)
            .sort();
          setEnvironments(uniqueEnvironments);

          const uniqueDefinitions = [
            ...new Set(releasesList.map((release) => release.definitionName)),
          ]
            .filter(Boolean)
            .sort();
          setDefinitions(uniqueDefinitions);
        }

        setLastSyncedAt(new Date());
        setHasLoadedOnce(true);
        setLoading(false);
        setPaginationLoading(false);
        clearSwitching();
      } catch (err) {
        setError(
          err.userMessage ||
            "Failed to load releases. Please check your Azure DevOps configuration."
        );
        setLoading(false);
        setPaginationLoading(false);
        setHasLoadedOnce(true);
        clearSwitching();
      }
    },
    [currentPage, timeRange, clearSwitching]
  );

  useEffect(() => {
    if (currentOrganization) {
      setCurrentPage(1);
      loadReleasesData(false, 1);
    }
    // Intentionally omit loadReleasesData — range/org remount is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, currentOrganization, currentProject]);

  useEffect(() => {
    if (currentPage > 1) {
      loadReleasesData(true, currentPage);
    }
    // Flag: navigating back to page 1 does not refetch (page-1 quirk).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Reset to page 1 when filters change (client-side; no refetch needed for same page data).
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, environmentFilter, definitionFilter, searchTerm]);

  const filteredReleases = useMemo(() => {
    let filtered = releases;

    if (statusFilter !== "all") {
      filtered = filtered.filter((release) => {
        const status = release.status?.toLowerCase();
        if (statusFilter === "inprogress") {
          return status === "inprogress" || status === "deploying";
        }
        if (statusFilter === "canceled") {
          return status === "canceled" || status === "cancelled";
        }
        return status === statusFilter;
      });
    }

    if (environmentFilter !== "all") {
      filtered = filtered.filter((release) =>
        release.environments?.some((env) => env.name === environmentFilter)
      );
    }

    if (definitionFilter !== "all") {
      filtered = filtered.filter((release) => release.definitionName === definitionFilter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (release) =>
          release.name?.toLowerCase().includes(q) ||
          release.definitionName?.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      const priorityDiff = getReleasePriority(a) - getReleasePriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdOn || 0) - new Date(a.createdOn || 0);
    });
  }, [releases, statusFilter, environmentFilter, definitionFilter, searchTerm]);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadReleasesData(false, currentPage)]);
  };

  const openRelease = (release, index) => {
    const el = rowRefs.current.get(index);
    if (el) triggerRef.current = el;
    setSelectedRelease(release);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setSelectedRelease(null);
  };

  const navigateSheet = (nextIndex) => {
    const release = filteredReleases[nextIndex];
    if (!release) return;
    const el = rowRefs.current.get(nextIndex);
    if (el) triggerRef.current = el;
    setSelectedRelease(release);
  };

  const clearFilters = (id) => {
    if (!id) {
      setStatusFilter("all");
      setEnvironmentFilter("all");
      setDefinitionFilter("all");
      setSearchTerm("");
      return;
    }
    if (id === "status") setStatusFilter("all");
    if (id === "environment") setEnvironmentFilter("all");
    if (id === "definition") setDefinitionFilter("all");
    if (id === "search") setSearchTerm("");
  };

  const activeChips = [];
  if (statusFilter !== "all") {
    activeChips.push({
      id: "status",
      label: STATUS_LABELS[statusFilter] || statusFilter,
    });
  }
  if (environmentFilter && environmentFilter !== "all") {
    activeChips.push({ id: "environment", label: environmentFilter });
  }
  if (definitionFilter && definitionFilter !== "all") {
    activeChips.push({ id: "definition", label: definitionFilter });
  }
  if (searchTerm) {
    activeChips.push({ id: "search", label: `“${searchTerm}”` });
  }

  const filtersActive = activeChips.length > 0;
  const rate = stats.successRate || 0;
  const totalReleases = stats.totalReleases || 0;

  const headerStatus = (() => {
    if (loading && !hasLoadedOnce) return null;
    if (stats.pendingApprovals > 0) {
      return <StatusBadge tone="warning" label={`${stats.pendingApprovals} blocked`} />;
    }
    if (hasFailedDeploymentsStat && stats.failedDeployments > 0) {
      return <StatusBadge tone="danger" label={`${stats.failedDeployments} failed`} />;
    }
    if (stats.activeDeployments > 0) {
      return <StatusBadge tone="info" label={`${stats.activeDeployments} deploying`} />;
    }
    if (totalReleases > 0) {
      return <StatusBadge tone="success" label="Healthy" />;
    }
    return null;
  })();

  const statusOptions = [
    { value: "succeeded", label: "Succeeded" },
    { value: "failed", label: "Failed" },
    { value: "canceled", label: "Canceled" },
    { value: "abandoned", label: "Abandoned" },
    { value: "waitingforapproval", label: "Waiting for Approval" },
    { value: "inprogress", label: "In Progress" },
    { value: "pending", label: "Pending" },
  ];

  const environmentOptions = environments.map((env) => ({ value: env, label: env }));
  const definitionOptions = definitions.map((def) => ({ value: def, label: def }));

  const rowPad = density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3" : "py-2";

  const showPageError = error && !hasLoadedOnce && releases.length === 0;
  const showInlineError = Boolean(error) && !showPageError;

  const rangeStart = totalReleases === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalReleases);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4 md:space-y-5 animate-fade-in">
      <PageHeader
        title="Releases"
        description="Deployments in the selected time range"
        status={headerStatus}
        actions={
          <>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <SyncButton
              onSync={handleSync}
              isSyncing={loading || paginationLoading}
              lastSyncedAt={lastSyncedAt}
            />
          </>
        }
      />

      <StatStrip loading={loading && !hasLoadedOnce}>
        <StatCell
          label="Releases"
          value={totalReleases}
          sub="Total"
          tone="neutral"
          onClick={() => setStatusFilter("all")}
        />
        <StatCell
          label="Success Rate"
          value={`${rate}%`}
          sub={successRateLabel(rate)}
          tone={successRateTone(rate)}
          onClick={() => setStatusFilter("succeeded")}
        />
        <StatCell
          label="Awaiting Approval"
          value={stats.pendingApprovals || 0}
          sub={stats.pendingApprovals > 0 ? "Blocked" : "Clear"}
          tone={stats.pendingApprovals > 0 ? "warning" : "neutral"}
          onClick={() => setStatusFilter("waitingforapproval")}
        />
        <StatCell
          label="In Progress"
          value={stats.activeDeployments || 0}
          sub={stats.activeDeployments > 0 ? "Deploying" : "Idle"}
          tone="info"
          onClick={() => setStatusFilter("inprogress")}
        />
      </StatStrip>

      <EnvironmentHealthDashboard
        environmentStats={stats.environmentStats}
        loading={loading && !hasLoadedOnce}
      />

      <div className="space-y-2">
        <Toolbar className="lg:flex-nowrap">
          <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
            <FacetFilter
              label="Status"
              options={statusOptions}
              value={statusFilter === "all" ? "" : statusFilter}
              onChange={(v) => setStatusFilter(v || "all")}
            />
            <FacetFilter
              label="Environment"
              options={environmentOptions}
              value={environmentFilter === "all" ? "" : environmentFilter}
              onChange={(v) => setEnvironmentFilter(v || "all")}
            />
            <FacetFilter
              label="Definition"
              options={definitionOptions}
              value={definitionFilter === "all" ? "" : definitionFilter}
              onChange={(v) => setDefinitionFilter(v || "all")}
            />
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search releases..."
            />
            {stats.pendingApprovals > 0 && statusFilter !== "waitingforapproval" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-warning-foreground"
                onClick={() => setStatusFilter("waitingforapproval")}
              >
                <Shield className="size-3.5" aria-hidden="true" />
                Blocked
              </Button>
            ) : null}
            {hasFailedDeploymentsStat &&
            stats.failedDeployments > 0 &&
            statusFilter !== "failed" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-danger-foreground"
                onClick={() => setStatusFilter("failed")}
              >
                <XCircle className="size-3.5" aria-hidden="true" />
                Failed
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DensityToggle />
            <ResultCount shown={filteredReleases.length} total={releases.length} noun="releases" />
          </div>
        </Toolbar>
        <ActiveFilters chips={activeChips} onClear={clearFilters} />
      </div>

      {showInlineError ? (
        <InlineError message={error} onRetry={() => loadReleasesData(false, currentPage)} />
      ) : null}

      {showPageError ? (
        <PageError message={error} onRetry={() => loadReleasesData(false, 1)} />
      ) : loading && !hasLoadedOnce ? (
        <SkeletonRows rows={6} columns={5} />
      ) : filteredReleases.length === 0 ? (
        <EmptyState
          icon={<Rocket />}
          title={
            filtersActive || releases.length > 0 ? "No matching releases" : "No releases found"
          }
          description={
            filtersActive || releases.length > 0
              ? "Clear filters to see releases on this page."
              : "No releases in the selected time range. Check your Azure DevOps configuration or create a release."
          }
          action={
            filtersActive ? (
              <Button type="button" variant="outline" size="sm" onClick={() => clearFilters()}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <DataTable
            maxHeight="min(55vh, 640px)"
            className={cn("min-h-[12rem]", paginationLoading && "opacity-60")}
          >
            <DataHeader className="hidden md:flex">
              <DataHeaderCell className="max-w-[9rem] flex-none basis-36">Status</DataHeaderCell>
              <DataHeaderCell className="min-w-0 flex-[2]">Release</DataHeaderCell>
              <DataHeaderCell className="max-w-[8rem] flex-none basis-32">
                Environments
              </DataHeaderCell>
              <DataHeaderCell className="min-w-0">Created by</DataHeaderCell>
              <DataHeaderCell className="max-w-[7rem] flex-none basis-28" align="right">
                Created
              </DataHeaderCell>
            </DataHeader>

            {filteredReleases.map((release, index) => {
              const selected = selectedRelease?.id === release.id && isSheetOpen;
              const createdBy = release.createdBy?.displayName || "Unknown";

              return (
                <DataRow
                  key={release.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(index, el);
                    else rowRefs.current.delete(index);
                  }}
                  selected={selected}
                  onClick={() => openRelease(release, index)}
                  className={cn(
                    "h-auto items-stretch md:items-center",
                    "flex-col gap-2 md:flex-row md:gap-3",
                    rowPad
                  )}
                >
                  {/* Mobile stacked */}
                  <div className="flex w-full min-w-0 flex-col gap-2 md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5 text-left">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {release.name}
                          </span>
                          <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">
                            #{release.id}
                          </span>
                        </div>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {release.definitionName || "—"}
                        </p>
                      </div>
                      <StatusBadge {...releaseStatus(release)} />
                    </div>
                    <EnvironmentDots environments={release.environments} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="truncate max-w-[10rem]">{createdBy}</span>
                      {release.createdOn ? <TimeAgo date={release.createdOn} /> : null}
                    </div>
                  </div>

                  {/* Desktop columns */}
                  <DataCell className="hidden max-w-[9rem] flex-none basis-36 md:block">
                    <StatusBadge {...releaseStatus(release)} />
                  </DataCell>
                  <DataCell className="hidden min-w-0 flex-[2] md:block">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {release.name}
                      </span>
                      <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">
                        #{release.id}
                      </span>
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {release.definitionName || "—"}
                    </p>
                  </DataCell>
                  <DataCell className="hidden max-w-[8rem] flex-none basis-32 md:block">
                    <EnvironmentDots environments={release.environments} />
                  </DataCell>
                  <DataCell className="hidden truncate md:block">{createdBy}</DataCell>
                  <DataCell
                    className="hidden max-w-[7rem] flex-none basis-28 md:block"
                    align="right"
                  >
                    {release.createdOn ? <TimeAgo date={release.createdOn} /> : "—"}
                  </DataCell>
                </DataRow>
              );
            })}
          </DataTable>

          {totalPages > 1 || totalReleases > 0 ? (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs tabular-nums text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {totalReleases}
              </p>
              {totalPages > 1 ? (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-disabled={currentPage === 1}
                        className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    {pageNumbers.map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={pageNum === currentPage}
                          onClick={() => setCurrentPage(pageNum)}
                          aria-label={`Page ${pageNum}`}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        aria-disabled={currentPage === totalPages}
                        className={cn(
                          currentPage === totalPages && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <ReleaseDetailModal
        release={selectedRelease}
        isOpen={isSheetOpen}
        onClose={closeSheet}
        list={filteredReleases}
        onNavigate={navigateSheet}
        triggerRef={triggerRef}
        aiStatus={aiStatus}
      />
    </div>
  );
}
