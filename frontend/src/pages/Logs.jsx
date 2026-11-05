import { useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Download, ScrollText } from "lucide-react";

import { apiService } from "../api/apiService";
import { useHealth } from "../contexts/HealthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import { useDensity } from "@/hooks/useDensity";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/ui/shadcn-io/copy-button";
import {
  DataCell,
  DataHeader,
  DataHeaderCell,
  DataRow,
  DataTable,
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
  SegmentedFilter,
  Toolbar,
} from "@/components/kit/Toolbar";
import { logLevel } from "@/components/kit/statusMaps";
import { cn } from "@/lib/utils";

const LEVEL_VALUES = new Set(["all", "error", "warn", "info", "debug"]);
const KNOWN_LOG_FIELDS = new Set(["timestamp", "level", "service", "message"]);

function logRowKey(log) {
  return `${log.timestamp ?? ""}|${log.level ?? ""}|${log.service ?? ""}|${log.message ?? ""}`;
}

function AbsoluteTime({ date, className }) {
  const parsed = useMemo(() => {
    const d = date instanceof Date ? date : new Date(date);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [date]);

  if (!parsed) {
    return <span className={cn("font-mono text-[13px] text-muted-foreground", className)}>—</span>;
  }

  let relative = "—";
  try {
    relative = formatDistanceToNowStrict(parsed, { addSuffix: true });
  } catch {
    relative = format(parsed, "PPpp");
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <time
            dateTime={parsed.toISOString()}
            className={cn("font-mono text-[13px] tabular-nums text-foreground", className)}
          >
            {format(parsed, "yyyy-MM-dd HH:mm:ss")}
          </time>
        </TooltipTrigger>
        <TooltipContent>{relative}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function extraLogFields(log) {
  return Object.entries(log || {}).filter(([key, value]) => {
    if (KNOWN_LOG_FIELDS.has(key)) return false;
    return value != null && value !== "";
  });
}

export default function Logs() {
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const { checkConnection } = useHealth();
  const { density } = useDensity("compact");

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getLogs({ limit: 100 });
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setHasLoadedOnce(true);
      setLastSyncedAt(new Date());
    } catch (err) {
      // Keep stale rows visible after the first successful load.
      setError(err.userMessage || "Failed to load logs. Please try again.");
    } finally {
      setLoading(false);
      clearSwitching();
    }
  }, [clearSwitching]);

  useEffect(() => {
    if (currentOrganization) {
      loadLogs();
    } else {
      setLoading(false);
      clearSwitching();
    }
    // Remount-style refetch when org/project changes (auto-refresh resets with remount).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [currentOrganization, currentProject]);

  useEffect(() => {
    if (!autoRefresh || !currentOrganization) return undefined;
    const interval = setInterval(() => {
      loadLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, currentOrganization, loadLogs]);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadLogs()]);
  };

  const counts = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let info = 0;
    let debug = 0;
    for (const log of logs) {
      const level = String(log?.level || "").toLowerCase();
      if (level === "error") errors += 1;
      else if (level === "warn" || level === "warning") warnings += 1;
      else if (level === "info") info += 1;
      else if (level === "debug") debug += 1;
    }
    return { errors, warnings, info, debug, total: logs.length };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const level = String(log?.level || "").toLowerCase();
      if (levelFilter !== "all" && level !== levelFilter) return false;
      if (!q) return true;
      const message = String(log?.message || "").toLowerCase();
      const service = String(log?.service || "").toLowerCase();
      return message.includes(q) || service.includes(q);
    });
  }, [logs, searchTerm, levelFilter]);

  const setLevel = (value) => {
    const next = LEVEL_VALUES.has(value) ? value : "all";
    setLevelFilter(next);
  };

  const clearFilters = (id) => {
    if (!id) {
      setLevelFilter("all");
      setSearchTerm("");
      return;
    }
    if (id === "level") setLevelFilter("all");
    if (id === "search") setSearchTerm("");
  };

  const activeChips = [];
  if (levelFilter !== "all") {
    const labels = { error: "Error", warn: "Warning", info: "Info", debug: "Debug" };
    activeChips.push({ id: "level", label: labels[levelFilter] || levelFilter });
  }
  if (searchTerm.trim()) {
    activeChips.push({ id: "search", label: `Search: ${searchTerm.trim()}` });
  }

  const exportLogs = () => {
    const csvContent = [
      ["Timestamp", "Level", "Service", "Message"],
      ...filteredLogs.map((log) => [
        log.timestamp ?? "",
        log.level ?? "",
        log.service || "",
        log.message ?? "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devops-agent-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const headerStatus = (() => {
    if (loading && !hasLoadedOnce) return null;
    if (!hasLoadedOnce || logs.length === 0) return null;
    if (counts.errors > 0) {
      return (
        <StatusBadge
          tone="danger"
          label={`${counts.errors} error${counts.errors === 1 ? "" : "s"}`}
        />
      );
    }
    if (counts.warnings > 0) {
      return (
        <StatusBadge
          tone="warning"
          label={`${counts.warnings} warning${counts.warnings === 1 ? "" : "s"}`}
        />
      );
    }
    return <StatusBadge tone="success" label="Clean" />;
  })();

  const levelFacetOptions = [
    { value: "error", label: "Error", count: counts.errors },
    { value: "warn", label: "Warning", count: counts.warnings },
    { value: "info", label: "Info", count: counts.info },
    { value: "debug", label: "Debug", count: counts.debug },
  ];

  const segmentOptions = [
    { value: "all", label: "All", count: counts.total },
    { value: "error", label: "Errors", count: counts.errors },
    { value: "warn", label: "Warnings", count: counts.warnings },
    { value: "info", label: "Info", count: counts.info },
    { value: "debug", label: "Debug", count: counts.debug },
  ];

  const rowPad = density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3" : "py-2";
  const isRefreshing = loading && hasLoadedOnce;
  const showPageError = Boolean(error && !hasLoadedOnce && logs.length === 0);
  const showInlineError = Boolean(error) && !showPageError;
  const filtersActive = activeChips.length > 0;
  const searchActive = Boolean(searchTerm.trim());

  const emptyTitle = (() => {
    if (logs.length === 0 && !filtersActive) return "No logs available";
    if (levelFilter === "error" && !searchActive) return "No errors found";
    return "No matching logs";
  })();

  const emptyDescription = (() => {
    if (logs.length === 0 && !filtersActive) {
      return "Logs will appear here as events occur.";
    }
    if (levelFilter === "error" && !searchActive) {
      return "No error-level entries in the current set.";
    }
    return "Try adjusting your search or filters.";
  })();

  if (!currentOrganization) {
    return (
      <div className="space-y-4 md:space-y-5">
        <PageHeader title="Logs" description="Application logs. Sample log feed for demo." />
        <EmptyState
          icon={<ScrollText />}
          title="No organization selected"
          description="Select or set up an organization to view application logs."
        />
      </div>
    );
  }

  const emptyState = (
    <EmptyState
      icon={<ScrollText />}
      title={emptyTitle}
      description={emptyDescription}
      action={
        filtersActive ? (
          <Button type="button" variant="outline" size="sm" onClick={() => clearFilters()}>
            Clear filters
          </Button>
        ) : null
      }
    />
  );

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Logs"
        description="Application logs. Sample log feed for demo."
        status={headerStatus}
        actions={
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={(checked) => setAutoRefresh(Boolean(checked))}
              />
              <label htmlFor="auto-refresh" className="cursor-pointer text-sm text-foreground">
                Auto-refresh
              </label>
            </div>
            <div className="flex items-center gap-2">
              <SyncButton onSync={handleSync} isSyncing={loading} lastSyncedAt={lastSyncedAt} />
              {isRefreshing ? (
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  Refreshing…
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0 || (loading && !hasLoadedOnce)}
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export
            </Button>
          </>
        }
      />

      <StatStrip loading={loading && !hasLoadedOnce}>
        <StatCell
          label="Total Logs"
          value={counts.total}
          sub="All levels"
          tone="neutral"
          onClick={() => setLevel("all")}
        />
        <StatCell
          label="Errors"
          value={counts.errors}
          sub={counts.errors > 0 ? "Show errors only" : "Clear"}
          tone={counts.errors > 0 ? "danger" : "neutral"}
          onClick={() => setLevel("error")}
        />
        <StatCell
          label="Warnings"
          value={counts.warnings}
          sub={counts.warnings > 0 ? "Show warnings only" : "Clear"}
          tone={counts.warnings > 0 ? "warning" : "neutral"}
          onClick={() => setLevel("warn")}
        />
        <StatCell
          label="Info"
          value={counts.info}
          sub="Informational"
          tone="info"
          onClick={() => setLevel("info")}
        />
      </StatStrip>

      <div className="space-y-2">
        <Toolbar className="lg:flex-nowrap">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search logs by message or service..."
              className="sm:max-w-sm"
            />
            <FacetFilter
              label="Level"
              options={levelFacetOptions}
              value={levelFilter === "all" ? "" : levelFilter}
              onChange={(v) => setLevel(v || "all")}
            />
            <SegmentedFilter
              className="h-auto max-w-full flex-wrap"
              options={segmentOptions}
              value={levelFilter}
              onChange={setLevel}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DensityToggle />
            <ResultCount shown={filteredLogs.length} total={logs.length} noun="logs" />
          </div>
        </Toolbar>
        <ActiveFilters chips={activeChips} onClear={clearFilters} />
      </div>

      {showInlineError ? <InlineError message={error} onRetry={loadLogs} /> : null}

      {showPageError ? (
        <PageError message={error} onRetry={loadLogs} />
      ) : loading && !hasLoadedOnce ? (
        <SkeletonRows rows={8} columns={4} />
      ) : filteredLogs.length === 0 ? (
        emptyState
      ) : (
        <DataTable maxHeight="min(60vh, 720px)" className="min-h-[12rem]">
          <DataHeader className="hidden md:flex">
            <DataHeaderCell className="max-w-[11rem] flex-none basis-44">Timestamp</DataHeaderCell>
            <DataHeaderCell className="max-w-[6rem] flex-none basis-24">Level</DataHeaderCell>
            <DataHeaderCell className="max-w-[8rem] flex-none basis-32">Service</DataHeaderCell>
            <DataHeaderCell className="min-w-0 flex-[2]">Message</DataHeaderCell>
          </DataHeader>

          {filteredLogs.map((log) => {
            const key = logRowKey(log);
            const expanded = expandedKeys.has(key);
            const level = log?.level;
            const message = log?.message != null && log.message !== "" ? String(log.message) : "—";
            const service = log?.service || "system";
            const extras = extraLogFields(log);

            return (
              <div key={key} className="border-b border-border last:border-b-0">
                <DataRow
                  selected={expanded}
                  aria-expanded={expanded}
                  onClick={() => toggleExpanded(key)}
                  className={cn(
                    "h-auto items-stretch border-b-0 md:items-center",
                    "flex-col gap-2 md:flex-row md:gap-3",
                    rowPad
                  )}
                >
                  {/* Mobile stacked */}
                  <div className="flex w-full min-w-0 flex-col gap-2 md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <StatusBadge {...logLevel(level)} />
                      <AbsoluteTime date={log.timestamp} className="text-xs" />
                    </div>
                    <p
                      className={cn(
                        "font-mono text-[13px] text-foreground",
                        !expanded && "truncate"
                      )}
                    >
                      {message}
                    </p>
                    <span className="inline-flex w-fit rounded-control bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {service}
                    </span>
                  </div>

                  {/* Desktop */}
                  <DataCell className="hidden max-w-[11rem] flex-none basis-44 md:block">
                    <AbsoluteTime date={log.timestamp} />
                  </DataCell>
                  <DataCell className="hidden max-w-[6rem] flex-none basis-24 md:block">
                    <StatusBadge {...logLevel(level)} />
                  </DataCell>
                  <DataCell className="hidden max-w-[8rem] flex-none basis-32 md:block">
                    <span className="inline-flex max-w-full truncate rounded-control bg-muted px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground">
                      {service}
                    </span>
                  </DataCell>
                  <DataCell
                    className={cn(
                      "hidden min-w-0 flex-[2] md:block",
                      expanded && "whitespace-normal"
                    )}
                    mono
                  >
                    <span className={cn(!expanded && "block truncate")}>{message}</span>
                  </DataCell>
                </DataRow>

                {expanded ? (
                  <div className="space-y-2 border-t border-border bg-muted/30 px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[13px] text-foreground">
                        {message}
                      </pre>
                      <CopyButton
                        content={message === "—" ? "" : message}
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      />
                    </div>
                    {extras.length > 0 ? (
                      <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        {extras.map(([field, value]) => (
                          <div key={field} className="flex min-w-0 gap-2">
                            <dt className="shrink-0 font-medium text-foreground">{field}</dt>
                            <dd className="min-w-0 truncate font-mono">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
