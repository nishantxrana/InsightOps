import React, { useState, useEffect } from "react";
import {
  GitPullRequest,
  User,
  Clock,
  GitBranch,
  Eye,
  ExternalLink,
  Building,
  FolderGit2,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiService } from "../api/apiService";
import { useHealth } from "../contexts/HealthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import PullRequestDetailModal from "../components/PullRequestDetailModal";
import { format, formatDistanceToNow } from "date-fns";

export default function PullRequests() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    pullRequests: true,
    idlePRs: true,
    stats: true,
  });
  const [error, setError] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);
  const [idlePRs, setIdlePRs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unassigned: 0,
    idle: 0,
    conflicts: 0,
  });
  const [selectedPR, setSelectedPR] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { checkConnection } = useHealth();

  useEffect(() => {
    loadPullRequestsData();
  }, []);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadPullRequestsData()]);
  };

  const loadPullRequestsData = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      setLoadingStates({
        pullRequests: true,
        idlePRs: true,
        stats: true,
      });

      // Load pull requests first
      try {
        const prsData = await apiService.getPullRequests();
        const prsList = prsData.value || [];
        setPullRequests(prsList);

        // Calculate stats
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
        // Don't set initialLoading false here - wait for all APIs or error
      } catch (err) {
        setPullRequests([]);
        setStats({ total: 0, active: 0, unassigned: 0, idle: 0, conflicts: 0 });
        setLoadingStates((prev) => ({ ...prev, pullRequests: false, stats: false }));
        setError(
          err.userMessage ||
            "Failed to load pull requests. Please check your Azure DevOps configuration."
        );
        return;
      }

      // Load idle PRs separately
      try {
        const idleData = await apiService.getIdlePullRequests();
        const idleList = idleData.value || [];
        setIdlePRs(idleList);
        setStats((prev) => ({ ...prev, idle: idleList.length }));
        setLoadingStates((prev) => ({ ...prev, idlePRs: false }));
      } catch {
        // Idle PRs are secondary, fail silently
        setIdlePRs([]);
        setStats((prev) => ({ ...prev, idle: 0 }));
        setLoadingStates((prev) => ({ ...prev, idlePRs: false }));
      }

      // Set initialLoading false only after all APIs complete successfully
      setInitialLoading(false);
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
    }
  };

  const getStatusBadge = (status) => {
    // Neutral bg, colored text/icon
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-blue-600 dark:text-blue-400">
            <Activity className="h-3 w-3" />
            Active
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "abandoned":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <XCircle className="h-3 w-3" />
            Abandoned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            {status}
          </span>
        );
    }
  };

  const getMergeStatusBadge = (mergeStatus) => {
    // Neutral bg, colored text/icon
    switch (mergeStatus) {
      case "succeeded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        );
      case "conflicts":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            Conflicts
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-blue-600 dark:text-blue-400">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            {mergeStatus || "Pending"}
          </span>
        );
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <GitPullRequest className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      case "completed":
        return <GitPullRequest className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case "abandoned":
        return <GitPullRequest className="h-5 w-5 text-muted-foreground" />;
      default:
        return <GitPullRequest className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getLastActivityTime = (pr) => {
    const lastCommitDate = pr.lastMergeCommit?.committer?.date;
    const creationDate = pr.creationDate;
    const lastActivity = lastCommitDate || creationDate;

    if (lastActivity) {
      return formatDistanceToNow(new Date(lastActivity), { addSuffix: true });
    }
    return "Unknown";
  };

  // Helper to check if PR has problems
  const getPRPriority = (pr) => {
    const isUnassigned = pr.status === "active" && (!pr.reviewers || pr.reviewers.length === 0);
    const hasConflicts = pr.mergeStatus === "conflicts";
    const isIdle = idlePRs.some((idle) => idle.pullRequestId === pr.pullRequestId);

    if (hasConflicts) return 0; // Conflicts first - merge blocked!
    if (isUnassigned) return 1; // Unassigned second - blocked waiting
    if (isIdle) return 2; // Idle third - needs attention
    if (pr.status === "active") return 3; // Active PRs
    return 4; // Completed/abandoned last
  };

  // Filter and sort PRs - problems first for operational clarity
  const getFilteredAndSortedPRs = () => {
    let filtered = [...pullRequests];

    // Apply filter
    switch (filter) {
      case "under-review":
        filtered = filtered.filter(
          (pr) => pr.status === "active" && pr.reviewers && pr.reviewers.length > 0
        );
        break;
      case "unassigned":
        filtered = filtered.filter(
          (pr) => pr.status === "active" && (!pr.reviewers || pr.reviewers.length === 0)
        );
        break;
      case "idle":
        filtered = filtered.filter((pr) =>
          idlePRs.some((idle) => idle.pullRequestId === pr.pullRequestId)
        );
        break;
      case "conflicts":
        filtered = filtered.filter((pr) => pr.mergeStatus === "conflicts");
        break;
      case "all":
      default:
        // No filter
        break;
    }

    // Sort by priority first (problems first), then by user-selected sort
    const sorted = [...filtered].sort((a, b) => {
      const priorityDiff = getPRPriority(a) - getPRPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, apply user sort
      switch (sortBy) {
        case "oldest":
          return new Date(a.creationDate) - new Date(b.creationDate);
        case "title":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return new Date(b.creationDate) - new Date(a.creationDate);
      }
    });

    return sorted;
  };

  if (error && initialLoading) {
    return <ErrorMessage message={error} onRetry={loadPullRequestsData} />;
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
        .shimmer {
          background: linear-gradient(90deg, 
            hsl(var(--muted)) 25%, 
            hsl(var(--muted) / 0.5) 50%, 
            hsl(var(--muted)) 75%
          );
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
        
        /* Custom Scrollbar - Refined */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.4);
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
        }
      `}</style>

      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Pull Requests
              </h1>
              {/* Quick health indicator - neutral bg, colored text/icon */}
              {!loadingStates.stats &&
                (stats.unassigned > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted">
                    <User className="h-3 w-3 text-orange-500" />
                    <span className="text-orange-600 dark:text-orange-400">
                      {stats.unassigned} need reviewers
                    </span>
                  </span>
                ) : stats.idle > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">{stats.idle} stale</span>
                  </span>
                ) : stats.active > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted">
                    <Activity className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400">
                      {stats.active} in review
                    </span>
                  </span>
                ) : stats.total > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                    All clear
                  </span>
                ) : null)}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {!loadingStates.stats && stats.unassigned > 0
                ? `${stats.unassigned} PR${stats.unassigned > 1 ? "s" : ""} waiting for reviewer assignment`
                : "Active pull requests and review status"}
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

      {/* Stats Cards */}
      <div
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 animate-fade-in"
        style={{ animationDelay: "0.1s" }}
      >
        {/* Total PRs - neutral */}
        <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          {loadingStates.stats ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <GitPullRequest className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Total
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Pull Requests</div>
              </div>
            </>
          )}
        </div>

        {/* Active PRs - neutral */}
        <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          {loadingStates.stats ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <Activity className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  In Review
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{stats.active}</div>
                <div className="text-sm text-muted-foreground">Under Review</div>
              </div>
            </>
          )}
        </div>

        {/* Unassigned PRs - neutral with colored icon/text */}
        <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          {loadingStates.stats ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <User
                  className={`h-5 w-5 ${stats.unassigned > 0 ? "text-orange-500" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${
                    stats.unassigned > 0
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {stats.unassigned > 0 ? `${stats.unassigned} unassigned` : "Clear"}
                </span>
              </div>
              <div className="mb-3">
                <div
                  className={`text-2xl font-bold mb-0.5 ${stats.unassigned > 0 ? "text-orange-600 dark:text-orange-400" : "text-foreground"}`}
                >
                  {stats.unassigned}
                </div>
                <div className="text-sm text-muted-foreground">No Reviewers</div>
              </div>
              <div
                className={`text-xs ${stats.unassigned > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}
              >
                {stats.unassigned > 0 ? "Assign reviewers to unblock" : "All PRs have reviewers"}
              </div>
            </>
          )}
        </div>

        {/* Idle PRs - neutral with colored icon/text */}
        <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          {loadingStates.idlePRs ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <Clock
                  className={`h-5 w-5 ${stats.idle > 0 ? "text-amber-500" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${
                    stats.idle > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                  }`}
                >
                  {stats.idle > 0 ? `${stats.idle} stale` : "Fresh"}
                </span>
              </div>
              <div className="mb-3">
                <div
                  className={`text-2xl font-bold mb-0.5 ${stats.idle > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
                >
                  {stats.idle}
                </div>
                <div className="text-sm text-muted-foreground">Idle 48h+</div>
              </div>
              <div
                className={`text-xs ${stats.idle > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
              >
                {stats.idle > 0 ? "Need review attention" : "No stale PRs"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div
        className="bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in"
        style={{ animationDelay: "0.25s" }}
      >
        <div className="p-4 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
          {/* Filter Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-500 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filter
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All", count: pullRequests.length },
                { value: "under-review", label: "In Review", count: stats.active },
                {
                  value: "unassigned",
                  label: "No Reviewers",
                  count: stats.unassigned,
                  isWarning: stats.unassigned > 0,
                },
                {
                  value: "conflicts",
                  label: "Conflicts",
                  count: stats.conflicts,
                  isDanger: stats.conflicts > 0,
                },
                {
                  value: "idle",
                  label: "Stale (48h+)",
                  count: stats.idle,
                  isWarning: stats.idle > 0,
                },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    filter === option.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  <span
                    className={
                      filter !== option.value && option.isDanger && option.count > 0
                        ? "text-red-600 dark:text-red-400"
                        : filter !== option.value && option.isWarning && option.count > 0
                          ? "text-orange-600 dark:text-orange-400"
                          : ""
                    }
                  >
                    {option.label}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      filter === option.value
                        ? "bg-white/20 text-white"
                        : option.isDanger && option.count > 0
                          ? "text-red-600 dark:text-red-400 bg-background"
                          : option.isWarning && option.count > 0
                            ? "text-orange-600 dark:text-orange-400 bg-background"
                            : "bg-background text-muted-foreground"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-border dark:bg-[#1a1a1a]"></div>

          {/* Sort Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <svg
                className="w-4 h-4 text-purple-500 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              Sort
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
                { value: "title", label: "A-Z" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    sortBy === option.value
                      ? "bg-purple-500 text-white shadow-md"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pull Requests List */}
      <div
        className="bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in"
        style={{ animationDelay: "0.3s" }}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted">
              <GitPullRequest className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">All Pull Requests</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filter === "all" ? "Showing all pull requests" : `Filtered results`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-foreground">
              {filter === "all" ? pullRequests.length : getFilteredAndSortedPRs().length} of{" "}
              {pullRequests.length}
            </span>
            {getFilteredAndSortedPRs().length !== pullRequests.length && (
              <button
                onClick={() => setFilter("all")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[55vh]">
          {loadingStates.pullRequests ? (
            <div className="divide-y divide-border dark:divide-[#1a1a1a]">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="shimmer w-5 h-5 rounded"></div>
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="shimmer h-4 rounded w-3/4 mb-1"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <div className="shimmer h-6 rounded-full w-16"></div>
                      <div className="shimmer h-6 rounded-full w-16"></div>
                    </div>
                  </div>
                  <div className="ml-7">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="shimmer h-3 rounded w-20"></div>
                      <div className="shimmer h-3 rounded w-16"></div>
                      <div className="shimmer h-3 rounded w-24"></div>
                    </div>
                    <div className="shimmer h-3 rounded w-1/2 mb-2"></div>
                    <div className="flex items-center gap-3">
                      <div className="shimmer h-3 rounded w-16"></div>
                      <div className="shimmer h-3 rounded w-20"></div>
                      <div className="shimmer h-3 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : getFilteredAndSortedPRs().length > 0 ? (
            <div className="divide-y divide-border dark:divide-[#1a1a1a]">
              {getFilteredAndSortedPRs().map((pr) => {
                const isUnassigned =
                  pr.status === "active" && (!pr.reviewers || pr.reviewers.length === 0);
                const hasConflicts = pr.mergeStatus === "conflicts";
                const isIdle = idlePRs.some((idle) => idle.pullRequestId === pr.pullRequestId);

                return (
                  <div
                    key={pr.pullRequestId}
                    className={`px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      hasConflicts
                        ? "border-l-2 border-l-red-500"
                        : isUnassigned
                          ? "border-l-2 border-l-orange-500"
                          : isIdle
                            ? "border-l-2 border-l-amber-500"
                            : ""
                    }`}
                    onClick={() => {
                      setSelectedPR(pr);
                      setIsModalOpen(true);
                    }}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center flex-1 min-w-0">
                        {getStatusIcon(pr.status)}
                        <div className="ml-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-foreground truncate">
                              #{pr.pullRequestId}: {pr.title}
                            </h4>
                            {pr.webUrl && (
                              <a
                                href={pr.webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                title="Open in Azure DevOps"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {/* Problem indicators */}
                        {isUnassigned && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-orange-600 dark:text-orange-400">
                            <User className="h-3 w-3" />
                            No reviewers
                          </span>
                        )}
                        {isIdle && !isUnassigned && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            Stale
                          </span>
                        )}
                        {getStatusBadge(pr.status)}
                        {getMergeStatusBadge(pr.mergeStatus)}
                      </div>
                    </div>

                    {/* All content aligned with title - no indentation */}
                    <div className="ml-7">
                      {/* Compact Info Row */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-24">
                            {pr.createdBy?.displayName || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{getLastActivityTime(pr)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          <span className="font-mono truncate max-w-32">
                            {pr.sourceRefName?.replace("refs/heads/", "")} →{" "}
                            {pr.targetRefName?.replace("refs/heads/", "")}
                          </span>
                        </div>
                      </div>

                      {/* Reviewers - Clear section with label */}
                      {pr.reviewers && pr.reviewers.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded">
                              Reviewers
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {pr.reviewers.slice(0, 3).map((reviewer, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                                >
                                  {reviewer.displayName}
                                </span>
                              ))}
                              {pr.reviewers.length > 3 && (
                                <span className="text-xs text-muted-foreground px-2 py-1">
                                  +{pr.reviewers.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Description - Only show if present */}
                      {pr.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                          {pr.description}
                        </p>
                      )}

                      {/* Project Info */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span className="truncate">
                            {pr.repository?.project?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FolderGit2 className="h-3 w-3" />
                          <span className="truncate">{pr.repository?.name || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(pr.creationDate), "MMM d")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No pull requests found
            </div>
          )}
        </ScrollArea>
      </div>

      {/* No Data State */}
      {pullRequests.length === 0 && (
        <div className="bg-card dark:bg-[#111111] p-6 rounded-lg border border-border dark:border-[#1a1a1a] shadow-sm text-center py-12">
          <GitPullRequest className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Pull Requests Found</h3>
          <p className="text-muted-foreground">
            No pull requests found. Check your Azure DevOps configuration or create a pull request.
          </p>
        </div>
      )}

      {/* Pull Request Detail Modal */}
      <PullRequestDetailModal
        pullRequest={selectedPR}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPR(null);
        }}
      />
    </div>
  );
}
