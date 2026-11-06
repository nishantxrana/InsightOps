import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, ExternalLink, XCircle } from "lucide-react";

import { apiService } from "../api/apiService";
import { useHealth } from "../contexts/HealthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import BuildDetailModal from "../components/BuildDetailModal";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { useDensity } from "@/hooks/useDensity";
import { useAiStatus } from "@/hooks/useAiStatus";
import { Button } from "@/components/ui/button";
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
  SegmentedFilter,
  Toolbar,
} from "@/components/kit/Toolbar";
import { buildStatus } from "@/components/kit/statusMaps";
import { cn } from "@/lib/utils";

const STATUS_VALUES = new Set([
  "all",
  "succeeded",
  "failed",
  "inProgress",
  "canceled",
  "partiallySucceeded",
]);

const LIMIT_OPTIONS = [
  { value: "10", label: "10 builds" },
  { value: "20", label: "20 builds" },
  { value: "30", label: "30 builds" },
  { value: "50", label: "50 builds" },
];

/** Map URL status (Dashboard deep-link) → internal filter value. */
function normalizeStatus(raw) {
  if (raw === "running") return "inProgress";
  if (STATUS_VALUES.has(raw)) return raw;
  return "all";
}

/** Map internal filter → URL status param. */
function statusToUrl(filter) {
  if (filter === "inProgress") return "running";
  return filter;
}

function formatDuration(startTime, finishTime) {
  if (!startTime) return "—";
  const start = new Date(startTime);
  const end = finishTime ? new Date(finishTime) : new Date();
  const durationMs = end - start;
  if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
  if (durationMs < 3600000) return `${Math.round(durationMs / 60000)}m`;
  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.round((durationMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function branchName(ref) {
  return (ref || "").replace("refs/heads/", "") || "—";
}

function repoName(build) {
  return build.repository?.name || build.definition?.name || "Unknown";
}

function getBuildPriority(build) {
  if (build.status === "inProgress") return 0;
  if (build.result === "failed") return 1;
  if (build.result === "partiallySucceeded") return 2;
  if (build.result === "canceled") return 3;
  return 4;
}

function healthLabel(successRate) {
  if (successRate < 70) return "Needs attention";
  if (successRate < 90) return "Fair";
  return "Healthy";
}

export default function Pipelines() {
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const { aiStatus } = useAiStatus();
  const { checkConnection } = useHealth();
  const { density } = useDensity();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    succeeded: 0,
    failed: 0,
    inProgress: 0,
    partiallySucceeded: 0,
    canceled: 0,
  });
  const [repositories, setRepositories] = useState([]);
  const [buildLimit, setBuildLimit] = useState(20);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [statusParam, setStatusParam] = useSearchParamState("status", "all");
  const [repositoryFilter, setRepositoryFilter] = useSearchParamState("repository", "all");

  const statusFilter = normalizeStatus(statusParam);

  const rowRefs = useRef(new Map());
  const triggerRef = useRef(null);

  useEffect(() => {
    if (statusParam === "running") return;
    if (statusParam && !STATUS_VALUES.has(statusParam) && statusParam !== "running") {
      setStatusParam("all");
    }
  }, [statusParam, setStatusParam]);

  const setStatusFilter = useCallback(
    (next) => {
      setStatusParam(statusToUrl(normalizeStatus(next)));
    },
    [setStatusParam]
  );

  const loadPipelinesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const buildsData = await apiService.getRecentBuilds(buildLimit, repositoryFilter);
      const buildsList = buildsData?.value || [];
      setBuilds(buildsList);

      const uniqueRepos = [...new Set(buildsList.map((build) => repoName(build)))]
        .filter(Boolean)
        .sort();
      setRepositories(uniqueRepos);

      setStats({
        total: buildsList.length,
        succeeded: buildsList.filter((b) => b.result === "succeeded").length,
        failed: buildsList.filter((b) => b.result === "failed").length,
        inProgress: buildsList.filter((b) => b.status === "inProgress").length,
        partiallySucceeded: buildsList.filter((b) => b.result === "partiallySucceeded").length,
        canceled: buildsList.filter((b) => b.result === "canceled").length,
      });
      setLastSyncedAt(new Date());
      setHasLoadedOnce(true);
      setLoading(false);
      clearSwitching();
    } catch (err) {
      setError(
        err.userMessage || "Failed to load pipelines. Please check your Azure DevOps configuration."
      );
      setLoading(false);
      clearSwitching();
    }
  }, [buildLimit, repositoryFilter, clearSwitching]);

  useEffect(() => {
    if (currentOrganization) {
      loadPipelinesData();
    }
  }, [currentOrganization, currentProject, loadPipelinesData]);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadPipelinesData()]);
  };

  const filteredBuilds = useMemo(() => {
    let filtered = builds;

    if (statusFilter !== "all") {
      filtered = filtered.filter((build) => {
        if (statusFilter === "succeeded") return build.result === "succeeded";
        if (statusFilter === "failed") return build.result === "failed";
        if (statusFilter === "inProgress") return build.status === "inProgress";
        if (statusFilter === "canceled") return build.result === "canceled";
        if (statusFilter === "partiallySucceeded") return build.result === "partiallySucceeded";
        return true;
      });
    }

    return [...filtered].sort((a, b) => {
      const priorityDiff = getBuildPriority(a) - getBuildPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.startTime || 0) - new Date(a.startTime || 0);
    });
  }, [builds, statusFilter]);

  const openBuild = (build, index) => {
    const el = rowRefs.current.get(index);
    if (el) triggerRef.current = el;
    setSelectedBuild(build);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setSelectedBuild(null);
  };

  const navigateSheet = (nextIndex) => {
    const build = filteredBuilds[nextIndex];
    if (!build) return;
    const el = rowRefs.current.get(nextIndex);
    if (el) triggerRef.current = el;
    setSelectedBuild(build);
  };

  const clearFilters = (id) => {
    if (!id) {
      setStatusFilter("all");
      setRepositoryFilter("all");
      setBuildLimit(20);
      return;
    }
    if (id === "status") setStatusFilter("all");
    if (id === "repository") setRepositoryFilter("all");
    if (id === "limit") setBuildLimit(20);
  };

  const statusLabels = {
    succeeded: "Succeeded",
    failed: "Failed",
    inProgress: "In Progress",
    canceled: "Canceled",
    partiallySucceeded: "Partially Succeeded",
  };

  const activeChips = [];
  if (statusFilter !== "all") {
    activeChips.push({ id: "status", label: statusLabels[statusFilter] || statusFilter });
  }
  if (repositoryFilter && repositoryFilter !== "all") {
    activeChips.push({ id: "repository", label: repositoryFilter });
  }
  if (buildLimit !== 20) {
    activeChips.push({ id: "limit", label: `${buildLimit} builds` });
  }

  const successRate = stats.total > 0 ? Math.round((stats.succeeded / stats.total) * 100) : 0;
  const barSucceeded = stats.succeeded;
  const barFailed = stats.failed;
  const barRunning = stats.inProgress;
  const barTotal = Math.max(stats.total, 1);

  const headerStatus = (() => {
    if (loading && !hasLoadedOnce) return null;
    if (stats.total === 0) return null;
    if (stats.failed > 0) {
      return <StatusBadge tone="danger" label={`${stats.failed} failed`} />;
    }
    if (stats.inProgress > 0) {
      return <StatusBadge tone="info" label={`${stats.inProgress} running`} />;
    }
    return <StatusBadge tone="success" label="All passing" />;
  })();

  const statusOptions = [
    { value: "all", label: "All", count: builds.length },
    { value: "succeeded", label: "Succeeded", count: stats.succeeded },
    { value: "failed", label: "Failed", count: stats.failed },
    { value: "inProgress", label: "In Progress", count: stats.inProgress },
    { value: "canceled", label: "Canceled", count: stats.canceled },
    {
      value: "partiallySucceeded",
      label: "Partial",
      count: stats.partiallySucceeded,
    },
  ];

  const repoOptions = [
    { value: "all", label: "All repositories" },
    ...repositories.map((repo) => ({ value: repo, label: repo })),
  ];

  const rowPad = density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3" : "py-2";

  const showPageError = error && !hasLoadedOnce && builds.length === 0;
  const showInlineError = Boolean(error) && !showPageError;
  const filtersActive = activeChips.length > 0;

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Pipelines"
        description="Recent builds and failure analysis"
        status={headerStatus}
        actions={<SyncButton onSync={handleSync} isSyncing={loading} lastSyncedAt={lastSyncedAt} />}
      />

      <div className="space-y-2">
        <StatStrip loading={loading && !hasLoadedOnce}>
          <StatCell
            label="Succeeded"
            value={stats.succeeded}
            sub={
              stats.total > 0
                ? `${Math.round((stats.succeeded / stats.total) * 100)}% of builds`
                : "No builds"
            }
            tone="success"
            onClick={() => setStatusFilter("succeeded")}
          />
          <StatCell
            label="Failed Builds"
            value={stats.failed}
            sub={stats.failed > 0 ? "Check logs" : "Healthy"}
            tone={stats.failed > 0 ? "danger" : "success"}
            onClick={() => setStatusFilter("failed")}
          />
          <StatCell
            label="In Progress"
            value={stats.inProgress}
            sub={stats.inProgress > 0 ? "Running now" : "Idle"}
            tone="info"
            onClick={() => setStatusFilter("inProgress")}
          />
        </StatStrip>

        {!(loading && !hasLoadedOnce) && stats.total > 0 ? (
          <div className="space-y-1.5 px-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{healthLabel(successRate)}</span>
                <span className="mx-1.5 text-border">·</span>
                {successRate}% succeeded
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {barSucceeded} succeeded ({Math.round((barSucceeded / barTotal) * 100)}%)
                <span className="mx-1.5">·</span>
                {barFailed} failed ({Math.round((barFailed / barTotal) * 100)}%)
                <span className="mx-1.5">·</span>
                {barRunning} running ({Math.round((barRunning / barTotal) * 100)}%)
              </p>
            </div>
            <div
              className="flex h-1.5 w-full overflow-hidden rounded-control bg-muted"
              role="img"
              aria-label={`Build health: ${barSucceeded} succeeded, ${barFailed} failed, ${barRunning} running`}
            >
              {barSucceeded > 0 ? (
                <div
                  className="h-full bg-success"
                  style={{ width: `${(barSucceeded / barTotal) * 100}%` }}
                />
              ) : null}
              {barFailed > 0 ? (
                <div
                  className="h-full bg-danger"
                  style={{ width: `${(barFailed / barTotal) * 100}%` }}
                />
              ) : null}
              {barRunning > 0 ? (
                <div
                  className="h-full bg-info"
                  style={{ width: `${(barRunning / barTotal) * 100}%` }}
                />
              ) : null}
              {barSucceeded + barFailed + barRunning < stats.total ? (
                <div
                  className="h-full bg-muted-foreground/30"
                  style={{
                    width: `${((stats.total - barSucceeded - barFailed - barRunning) / barTotal) * 100}%`,
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Toolbar className="lg:flex-nowrap">
          <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
            <FacetFilter
              label="Repository"
              options={repoOptions}
              value={repositoryFilter === "all" ? "" : repositoryFilter}
              onChange={(v) => setRepositoryFilter(v || "all")}
            />
            <SegmentedFilter
              className="h-auto max-w-full flex-wrap"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            {stats.failed > 0 && statusFilter !== "failed" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-danger-foreground"
                onClick={() => setStatusFilter("failed")}
              >
                <XCircle className="size-3.5" aria-hidden="true" />
                Show failures
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FacetFilter
              label="Count"
              options={LIMIT_OPTIONS}
              value={String(buildLimit)}
              onChange={(v) => {
                const n = Number(v);
                if ([10, 20, 30, 50].includes(n)) setBuildLimit(n);
              }}
            />
            <DensityToggle />
            <ResultCount shown={filteredBuilds.length} total={builds.length} noun="builds" />
          </div>
        </Toolbar>
        <ActiveFilters chips={activeChips} onClear={clearFilters} />
      </div>

      {showInlineError ? <InlineError message={error} onRetry={loadPipelinesData} /> : null}

      {showPageError ? (
        <PageError message={error} onRetry={loadPipelinesData} />
      ) : loading && !hasLoadedOnce ? (
        <SkeletonRows rows={6} columns={4} />
      ) : filteredBuilds.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={
            filtersActive || statusFilter !== "all"
              ? "No builds match your filters"
              : "No builds found"
          }
          description={
            filtersActive || statusFilter !== "all"
              ? "Clear filters to see all recent builds."
              : "No recent builds found. Check your Azure DevOps configuration or trigger a build."
          }
          action={
            filtersActive || statusFilter !== "all" ? (
              <Button type="button" variant="outline" size="sm" onClick={() => clearFilters()}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <DataTable maxHeight="min(55vh, 640px)" className="min-h-[12rem]">
          <DataHeader className="hidden md:flex">
            <DataHeaderCell className="max-w-[7rem] flex-none basis-28">Status</DataHeaderCell>
            <DataHeaderCell className="min-w-0 flex-[2]">Pipeline</DataHeaderCell>
            <DataHeaderCell className="min-w-0">Repository</DataHeaderCell>
            <DataHeaderCell className="min-w-0">Triggered by</DataHeaderCell>
            <DataHeaderCell className="max-w-[5rem] flex-none basis-20" align="right">
              Duration
            </DataHeaderCell>
            <DataHeaderCell className="max-w-[7rem] flex-none basis-28" align="right">
              Started
            </DataHeaderCell>
          </DataHeader>

          {filteredBuilds.map((build, index) => {
            const selected = selectedBuild?.id === build.id && isSheetOpen;
            const defName = build.definition?.name || "Unknown";
            const branch = branchName(build.sourceBranch);
            const repo = repoName(build);
            const triggeredBy = build.requestedBy?.displayName || "Unknown";
            const duration = formatDuration(build.startTime, build.finishTime);
            const adoUrl = build._links?.web?.href;

            return (
              <DataRow
                key={build.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(index, el);
                  else rowRefs.current.delete(index);
                }}
                selected={selected}
                onClick={() => openBuild(build, index)}
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
                          {defName}
                        </span>
                        <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">
                          #{build.buildNumber}
                        </span>
                        {adoUrl ? (
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
                      <p className="truncate font-mono text-[12px] text-muted-foreground">
                        {branch}
                      </p>
                    </div>
                    <StatusBadge {...buildStatus(build)} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate max-w-[10rem]">{repo}</span>
                    <span className="truncate max-w-[8rem]">{triggeredBy}</span>
                    <span className="tabular-nums">{duration}</span>
                    {build.startTime ? <TimeAgo date={build.startTime} /> : null}
                  </div>
                </div>

                {/* Desktop columns */}
                <DataCell className="hidden max-w-[7rem] flex-none basis-28 md:block">
                  <StatusBadge {...buildStatus(build)} />
                </DataCell>
                <DataCell className="hidden min-w-0 flex-[2] md:block">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{defName}</span>
                    <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">
                      #{build.buildNumber}
                    </span>
                    {adoUrl ? (
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
                  <p className="truncate font-mono text-[12px] text-muted-foreground">{branch}</p>
                </DataCell>
                <DataCell className="hidden truncate md:block">{repo}</DataCell>
                <DataCell className="hidden truncate md:block">{triggeredBy}</DataCell>
                <DataCell
                  className="hidden max-w-[5rem] flex-none basis-20 md:block"
                  tabular
                  align="right"
                >
                  {duration}
                </DataCell>
                <DataCell className="hidden max-w-[7rem] flex-none basis-28 md:block" align="right">
                  {build.startTime ? <TimeAgo date={build.startTime} /> : "—"}
                </DataCell>
              </DataRow>
            );
          })}
        </DataTable>
      )}

      <BuildDetailModal
        build={selectedBuild}
        isOpen={isSheetOpen}
        onClose={closeSheet}
        list={filteredBuilds}
        onNavigate={navigateSheet}
        triggerRef={triggerRef}
        aiStatus={aiStatus}
      />
    </div>
  );
}
