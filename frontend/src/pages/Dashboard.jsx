import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  GitBranch,
  GitPullRequest,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
  RefreshCw,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { apiService } from "../api/apiService";
import { useHealth } from "../contexts/HealthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import DevOpsActivityReport from "../components/DevOpsActivityReport";

export default function Dashboard() {
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    workItems: true,
    builds: true,
    pullRequests: true,
    releases: true,
    logs: true,
  });
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
    builds: { total: 0, succeeded: 0, failed: 0 },
    pullRequests: { total: 0, active: 0, idle: 0 },
    releases: { total: 0, successRate: 0 },
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [liveUptime, setLiveUptime] = useState(0);
  const { isConnected, isChecking, healthData, checkConnection } = useHealth();

  // Live uptime counter that updates every second
  useEffect(() => {
    if (isConnected && healthData?.serverStartTime) {
      // Calculate current uptime based on server start time
      const currentUptime = Math.floor((Date.now() - healthData.serverStartTime) / 1000);
      setLiveUptime(currentUptime);

      const interval = setInterval(() => {
        const newUptime = Math.floor((Date.now() - healthData.serverStartTime) / 1000);
        setLiveUptime(newUptime);
      }, 1000);

      return () => clearInterval(interval);
    } else if (isConnected && healthData?.uptime) {
      // Fallback to process uptime if serverStartTime not available
      setLiveUptime(Math.floor(healthData.uptime));

      const interval = setInterval(() => {
        setLiveUptime((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isConnected, healthData?.serverStartTime, healthData?.uptime]);

  // Format uptime to show hours, minutes, and seconds
  const formatUptime = (totalSeconds) => {
    const seconds = Math.floor(totalSeconds); // Ensure integer
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  useEffect(() => {
    if (currentOrganization) {
      loadDashboardData();
    }
  }, [currentOrganization, currentProject]);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadDashboardData()]);
  };

  const loadDashboardData = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      setLoadingStates({
        workItems: true,
        builds: true,
        pullRequests: true,
        releases: true,
        logs: true,
      });

      // Use aggregated endpoint for better performance
      // Single request fetches all dashboard data in parallel on the backend
      const [dashboardResult, logsResult] = await Promise.allSettled([
        apiService.getDashboardSummary(),
        apiService.getLogs({ limit: 10 }),
      ]);

      if (dashboardResult.status === "fulfilled" && dashboardResult.value.success) {
        const data = dashboardResult.value.data;

        // Update all stats at once
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

        // All data loaded at once
        setLoadingStates({
          workItems: false,
          builds: false,
          pullRequests: false,
          releases: false,
          logs: true, // Still loading logs
        });
        setInitialLoading(false);
        setError(null);
        clearSwitching(); // Clear switching overlay on success
      } else {
        // Handle error with user-friendly message
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
        setLoadingStates((prev) => ({
          ...prev,
          workItems: false,
          builds: false,
          pullRequests: false,
          releases: false,
        }));
        setInitialLoading(false);
        clearSwitching(); // Clear switching overlay after data loads
      }

      // Handle logs separately (local data, fast)
      if (logsResult.status === "fulfilled") {
        setRecentActivity(logsResult.value.logs || []);
      } else {
        setRecentActivity([]);
      }
      setLoadingStates((prev) => ({ ...prev, logs: false }));
    } catch (err) {
      // Use user-friendly message from interceptor if available
      const userMessage =
        err.userMessage || "Unable to connect. Please check your connection and try again.";
      setError(userMessage);
      setInitialLoading(false);
      // Reset stats to show empty state
      setStats({
        workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
        builds: { total: 0, succeeded: 0, failed: 0 },
        pullRequests: { total: 0, active: 0, idle: 0 },
        releases: { total: 0, successRate: 0 },
      });
      setRecentActivity([]);
      setLoadingStates({
        workItems: false,
        builds: false,
        pullRequests: false,
        releases: false,
        logs: false,
      });
      clearSwitching(); // Clear switching overlay on error
    }
  };

  if (initialLoading && error) {
    return <LoadingSpinner />;
  }

  if (error && initialLoading) {
    return <ErrorMessage message={error} onRetry={loadDashboardData} />;
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
        .shimmer {
          background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .progress-bar {
          transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .status-dot {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Header with status summary */}
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Overview</h1>
              {/* Quick status indicator - neutral bg, colored text/icon only */}
              {!loadingStates.workItems &&
                !loadingStates.builds &&
                !loadingStates.pullRequests &&
                (stats.builds.failed > 0 ||
                stats.workItems.overdue > 0 ||
                stats.pullRequests.idle > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-red-600 dark:text-red-400">
                      {stats.builds.failed + stats.workItems.overdue + stats.pullRequests.idle}{" "}
                      issues
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                    All clear
                  </span>
                ))}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {!loadingStates.workItems && (stats.builds.failed > 0 || stats.workItems.overdue > 0)
                ? "Action needed — see issues below"
                : "Your development workflow at a glance"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={Object.values(loadingStates).some((loading) => loading)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${Object.values(loadingStates).some((loading) => loading) ? "animate-spin" : "group-hover:rotate-180"} transition-transform duration-300`}
              />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Attention Required - FIRST (most actionable) - neutral cards with colored icons/text */}
      {(loadingStates.workItems ||
        loadingStates.builds ||
        loadingStates.pullRequests ||
        stats.workItems.overdue > 0 ||
        stats.builds.failed > 0 ||
        stats.pullRequests.idle > 0) && (
        <div className="animate-fade-in bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Needs Your Attention
            </h2>
          </div>
          <div className="p-4">
            {loadingStates.workItems || loadingStates.builds || loadingStates.pullRequests ? (
              <div className="flex gap-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex-1 flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="shimmer w-8 h-8 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-3 rounded w-3/4"></div>
                      <div className="shimmer h-2 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {stats.builds.failed > 0 && (
                  <Link
                    to="/pipelines"
                    className="group flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer flex-1 min-w-[200px]"
                  >
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {stats.builds.failed} failed builds
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Check pipeline logs →
                      </div>
                    </div>
                  </Link>
                )}
                {stats.workItems.overdue > 0 && (
                  <Link
                    to="/work-items"
                    className="group flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer flex-1 min-w-[200px]"
                  >
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {stats.workItems.overdue} overdue items
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Past target date →
                      </div>
                    </div>
                  </Link>
                )}
                {stats.pullRequests.idle > 0 && (
                  <Link
                    to="/pull-requests?filter=idle"
                    className="group flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer flex-1 min-w-[200px]"
                  >
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <GitPullRequest className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {stats.pullRequests.idle} stale PRs
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        No activity in 48h+ →
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats - Summary cards - neutral backgrounds, colored icons/text only */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Work Items */}
        <Link to="/work-items" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.workItems ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <CheckSquare
                    className={`w-5 h-5 ${stats.workItems.overdue > 0 ? "text-red-500" : "text-blue-500"}`}
                  />
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${stats.workItems.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
                  >
                    {stats.workItems.overdue > 0 ? `${stats.workItems.overdue} overdue` : "Sprint"}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">
                    {stats.workItems.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Work Items</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                      {stats.workItems.total > 0
                        ? Math.round((stats.workItems.completed / stats.workItems.total) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`progress-bar h-1.5 rounded-full ${stats.workItems.overdue > 0 ? "bg-red-500" : "bg-blue-500"}`}
                      style={{
                        width: `${stats.workItems.total > 0 ? (stats.workItems.completed / stats.workItems.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Builds */}
        <Link to="/pipelines" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.builds ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <GitBranch
                    className={`w-5 h-5 ${stats.builds.failed > 0 ? "text-red-500" : "text-emerald-500"}`}
                  />
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${
                      stats.builds.failed > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stats.builds.failed > 0 ? `${stats.builds.failed} failed` : "Healthy"}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">
                    {stats.builds.total > 0
                      ? `${Math.round((stats.builds.succeeded / stats.builds.total) * 100)}%`
                      : "0%"}
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{stats.builds.succeeded} passed</span>
                    <span
                      className={`${stats.builds.failed > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
                    >
                      {stats.builds.failed} failed
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`progress-bar h-1.5 rounded-full ${stats.builds.failed > 0 ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{
                        width: `${stats.builds.total > 0 ? (stats.builds.succeeded / stats.builds.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Releases */}
        <Link to="/releases" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.releases ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Rocket className="w-5 h-5 text-orange-500" />
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Recent
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">
                    {stats.releases?.total || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Releases</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium text-foreground">
                      {stats.releases?.successRate || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="progress-bar bg-orange-500 h-1.5 rounded-full"
                      style={{ width: `${stats.releases?.successRate || 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Pull Requests */}
        <Link to="/pull-requests" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.pullRequests ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <GitPullRequest
                    className={`w-5 h-5 ${stats.pullRequests.idle > 0 ? "text-amber-500" : "text-purple-500"}`}
                  />
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${stats.pullRequests.idle > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                  >
                    {stats.pullRequests.idle > 0 ? `${stats.pullRequests.idle} stale` : "Active"}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">
                    {stats.pullRequests.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Pull Requests</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {stats.pullRequests.active} active
                    </span>
                    <span
                      className={`${stats.pullRequests.idle > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
                    >
                      {stats.pullRequests.idle} idle
                    </span>
                  </div>
                  <div className="h-1.5"></div>
                </div>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* Quick Stats & Activity */}
      <div
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in"
        style={{ animationDelay: "0.2s" }}
      >
        {/* Status Summary - Only shown when all clear - neutral styling */}
        {!loadingStates.workItems &&
          !loadingStates.builds &&
          !loadingStates.pullRequests &&
          stats.workItems.overdue === 0 &&
          stats.builds.failed === 0 &&
          stats.pullRequests.idle === 0 && (
            <div className="md:col-span-1 lg:col-span-2 bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm sm:text-base">
                    All systems healthy
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    No failed builds, overdue items, or stale PRs
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Recent Activity - Collapsible */}
        <details
          className={`bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm overflow-hidden ${
            !loadingStates.workItems &&
            !loadingStates.builds &&
            !loadingStates.pullRequests &&
            stats.workItems.overdue === 0 &&
            stats.builds.failed === 0 &&
            stats.pullRequests.idle === 0
              ? "md:col-span-1 lg:col-span-1"
              : "md:col-span-2 lg:col-span-3"
          }`}
        >
          <summary className="p-4 cursor-pointer hover:bg-muted/50 transition-colors list-none">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Recent Activity
                {recentActivity.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({recentActivity.length})
                  </span>
                )}
              </h2>
              <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </div>
          </summary>
          <div className="px-4 pb-4">
            {loadingStates.logs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shimmer w-1.5 h-1.5 rounded-full mt-2"></div>
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-3 rounded w-full"></div>
                      <div className="shimmer h-2 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex gap-3 group">
                    <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* DevOps Activity Report - New Feature */}
      <div className="mt-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
        <DevOpsActivityReport />
      </div>
    </div>
  );
}
