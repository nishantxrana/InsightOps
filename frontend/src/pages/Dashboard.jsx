import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { GitBranch, Clock, GitPullRequest, ChevronRight } from "lucide-react";
import { apiService } from "../api/apiService";
import { useHealth } from "../contexts/HealthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import DevOpsActivityReport from "../components/DevOpsActivityReport";
import { PageHeader } from "@/components/kit/PageHeader";
import { SyncButton } from "@/components/kit/SyncButton";
import { StatCell, StatStrip } from "@/components/kit/StatStrip";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { InlineError } from "@/components/kit/InlineError";
import { TimeAgo } from "@/components/kit/DataTable";
import { logLevel } from "@/components/kit/statusMaps";
import { Skeleton } from "@/components/ui/skeleton";

function releaseSuccessTone(rate) {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

function attentionCount(stats) {
  return (
    (stats.builds.failed || 0) + (stats.workItems.overdue || 0) + (stats.pullRequests.idle || 0)
  );
}

export default function Dashboard() {
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [stats, setStats] = useState({
    workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
    builds: { total: 0, succeeded: 0, failed: 0 },
    pullRequests: { total: 0, active: 0, idle: 0 },
    releases: { total: 0, successRate: 0 },
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const { isConnected, checkConnection } = useHealth();

  const loadDashboardData = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setLogsLoading(true);
      setError(null);

      const [dashboardResult, logsResult] = await Promise.allSettled([
        apiService.getDashboardSummary(),
        apiService.getLogs({ limit: 10 }),
      ]);

      if (dashboardResult.status === "fulfilled" && dashboardResult.value.success) {
        const data = dashboardResult.value.data;

        setStats({
          workItems: {
            total: data.workItems?.total || 0,
            active: data.workItems?.active || 0,
            completed: data.workItems?.completed || 0,
            overdue: data.workItems?.overdue || 0,
          },
          builds: {
            total: data.builds?.total || 0,
            succeeded: data.builds?.succeeded || 0,
            failed: data.builds?.failed || 0,
          },
          pullRequests: {
            total: data.pullRequests?.total || 0,
            active: data.pullRequests?.active || 0,
            idle: data.pullRequests?.idle || 0,
          },
          releases: {
            total: data.releases?.total || 0,
            successRate: data.releases?.successRate || 0,
          },
        });
        setError(null);
        setLastSyncedAt(new Date());
        clearSwitching();
      } else {
        const errorReason = dashboardResult.reason || dashboardResult.value;
        const userMessage =
          errorReason?.userMessage ||
          errorReason?.error ||
          "Unable to load dashboard data. Please check your Azure DevOps configuration.";

        setError(userMessage);
        setStats({
          workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
          builds: { total: 0, succeeded: 0, failed: 0 },
          pullRequests: { total: 0, active: 0, idle: 0 },
          releases: { total: 0, successRate: 0 },
        });
        clearSwitching();
      }

      if (logsResult.status === "fulfilled") {
        setRecentActivity(logsResult.value.logs || []);
      } else {
        setRecentActivity([]);
      }
    } catch (err) {
      const userMessage =
        err.userMessage || "Unable to connect. Please check your connection and try again.";
      setError(userMessage);
      setStats({
        workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
        builds: { total: 0, succeeded: 0, failed: 0 },
        pullRequests: { total: 0, active: 0, idle: 0 },
        releases: { total: 0, successRate: 0 },
      });
      setRecentActivity([]);
      clearSwitching();
    } finally {
      setSummaryLoading(false);
      setLogsLoading(false);
    }
  }, [clearSwitching]);

  useEffect(() => {
    if (currentOrganization) {
      loadDashboardData();
    }
  }, [currentOrganization, currentProject, loadDashboardData]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await Promise.all([checkConnection(), loadDashboardData()]);
    } finally {
      setIsSyncing(false);
    }
  };

  const offline = !isConnected;
  const showError = Boolean(error) || offline;
  const errorMessage = offline
    ? "You appear to be offline. Check your connection and try again."
    : error;
  const issues = attentionCount(stats);
  const hasCritical = stats.builds.failed > 0 || stats.workItems.overdue > 0;
  const workProgress =
    stats.workItems.total > 0
      ? Math.round((stats.workItems.completed / stats.workItems.total) * 100)
      : 0;
  const buildSuccessRate =
    stats.builds.total > 0 ? Math.round((stats.builds.succeeded / stats.builds.total) * 100) : 0;
  const releaseRate = stats.releases?.successRate || 0;

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Overview"
        description="Your development workflow at a glance"
        actions={
          <SyncButton
            onSync={handleSync}
            isSyncing={isSyncing || summaryLoading}
            lastSyncedAt={lastSyncedAt}
          />
        }
      />

      {showError ? (
        <InlineError message={errorMessage} onRetry={handleSync} />
      ) : summaryLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-panel" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-control" />
            <Skeleton className="h-10 w-full rounded-control" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {issues === 0 ? (
            <StatusCallout tone="success" title="All systems healthy">
              No failed builds, overdue work items, or stale pull requests.
            </StatusCallout>
          ) : (
            <>
              <StatusCallout
                tone={hasCritical ? "danger" : "warning"}
                title={`${issues} items need attention`}
              >
                Count includes failed builds, overdue work items, and stale pull requests.
              </StatusCallout>
              <div className="overflow-hidden rounded-panel border border-border bg-surface divide-y divide-border">
                {stats.builds.failed > 0 ? (
                  <AttentionRow
                    to="/pipelines?status=failed"
                    icon={<GitBranch className="size-4 text-danger" aria-hidden="true" />}
                    label="Failed builds"
                    count={stats.builds.failed}
                  />
                ) : null}
                {stats.workItems.overdue > 0 ? (
                  <AttentionRow
                    to="/work-items?tab=overdue"
                    icon={<Clock className="size-4 text-danger" aria-hidden="true" />}
                    label="Overdue work items"
                    count={stats.workItems.overdue}
                  />
                ) : null}
                {stats.pullRequests.idle > 0 ? (
                  <AttentionRow
                    to="/pull-requests?filter=idle"
                    icon={<GitPullRequest className="size-4 text-warning" aria-hidden="true" />}
                    label="Stale pull requests"
                    count={stats.pullRequests.idle}
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      )}

      <StatStrip loading={summaryLoading}>
        <StatCell
          label="Work Items"
          value={stats.workItems.total}
          sub={
            stats.workItems.overdue > 0
              ? `${workProgress}% · ${stats.workItems.overdue} overdue`
              : `${workProgress}% progress`
          }
          tone={stats.workItems.overdue > 0 ? "danger" : "success"}
          to={stats.workItems.overdue > 0 ? "/work-items?tab=overdue" : "/work-items"}
        />
        <StatCell
          label="Success Rate"
          value={`${buildSuccessRate}%`}
          sub={stats.builds.failed > 0 ? `${stats.builds.failed} failed` : "Healthy"}
          tone={stats.builds.failed > 0 ? "danger" : "success"}
          to={stats.builds.failed > 0 ? "/pipelines?status=failed" : "/pipelines"}
        />
        <StatCell
          label="Releases"
          value={stats.releases.total}
          sub={`${releaseRate}% success`}
          tone={releaseSuccessTone(releaseRate)}
          to="/releases"
        />
        <StatCell
          label="Pull Requests"
          value={stats.pullRequests.active}
          sub={stats.pullRequests.idle > 0 ? `${stats.pullRequests.idle} stale` : "No stale PRs"}
          tone={stats.pullRequests.idle > 0 ? "warning" : "neutral"}
          to={stats.pullRequests.idle > 0 ? "/pull-requests?filter=idle" : "/pull-requests"}
        />
      </StatStrip>

      <section className="rounded-panel border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            <p className="text-xs text-muted-foreground">Sample log feed for demo</p>
          </div>
          <Link
            to="/logs"
            className="text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-control"
          >
            View all logs
          </Link>
        </div>
        <div className="px-4 py-2">
          {logsLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-14 rounded-control" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentActivity.slice(0, 10).map((activity, index) => {
                const badge = logLevel(activity.level);
                return (
                  <li
                    key={`${activity.timestamp || "log"}-${index}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <StatusBadge tone={badge.tone} label={badge.label} dot />
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {activity.message}
                    </p>
                    <TimeAgo date={activity.timestamp} className="shrink-0 text-xs" />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity</p>
          )}
        </div>
      </section>

      <DevOpsActivityReport />
    </div>
  );
}

function AttentionRow({ to, icon, label, count }) {
  return (
    <Link
      to={to}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1 font-medium text-foreground">{label}</span>
      <span className="tabular-nums text-muted-foreground">{count}</span>
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        View
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
