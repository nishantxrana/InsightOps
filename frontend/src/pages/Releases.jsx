import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Rocket,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Server,
  ChevronRight,
  Filter,
  Search,
  X,
  Building,
  User,
  Calendar,
  ExternalLink,
  FileText,
  UserCheck,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useHealth } from "../contexts/HealthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import { releaseService } from "../api/releaseService";
import ReleaseFilterDropdown from "../components/ReleaseFilterDropdown";
import ReleaseDetailModal from "../components/ReleaseDetailModal";
import EnvironmentHealthDashboard from "../components/EnvironmentHealthDashboard";
import AIReleaseInsights from "../components/AIReleaseInsights";
import TimeRangeSelector from "../components/TimeRangeSelector";
import ErrorMessage from "../components/ErrorMessage";

// Helper functions for status display
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "succeeded":
      return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />;
    case "failed":
    case "rejected":
      return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
    case "canceled":
    case "cancelled":
      return <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    case "abandoned":
      return <X className="h-5 w-5 text-orange-500 dark:text-orange-400" />;
    case "waitingforapproval":
      return <UserCheck className="h-5 w-5 text-orange-500 dark:text-orange-400" />;
    case "inprogress":
    case "deploying":
      return <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-pulse" />;
    case "pending":
    case "notstarted":
    case "notDeployed":
      return <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadgeIcon = (status) => {
  switch (status?.toLowerCase()) {
    case "succeeded":
      return <CheckCircle className="h-3 w-3" />;
    case "failed":
    case "rejected":
      return <XCircle className="h-3 w-3" />;
    case "canceled":
    case "cancelled":
      return <X className="h-3 w-3" />;
    case "waitingforapproval":
      return <UserCheck className="h-3 w-3" />;
    case "inprogress":
    case "deploying":
      return <Clock className="h-3 w-3 animate-pulse" />;
    case "pending":
    case "notstarted":
    case "notDeployed":
      return <AlertCircle className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

const getStatusColor = (status) => {
  // Neutral bg, colored text only
  switch (status?.toLowerCase()) {
    case "succeeded":
      return "bg-muted text-emerald-600 dark:text-emerald-400";
    case "failed":
    case "rejected":
      return "bg-muted text-red-600 dark:text-red-400";
    case "canceled":
    case "cancelled":
      return "bg-muted text-muted-foreground";
    case "abandoned":
      return "bg-muted text-orange-600 dark:text-orange-400";
    case "waitingforapproval":
      return "bg-muted text-orange-600 dark:text-orange-400";
    case "inprogress":
    case "deploying":
      return "bg-muted text-blue-600 dark:text-blue-400";
    case "pending":
    case "notstarted":
    case "notDeployed":
      return "bg-muted text-amber-600 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getEnvironmentStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "succeeded":
      return "bg-green-500";
    case "failed":
    case "rejected":
      return "bg-red-500";
    case "canceled":
    case "cancelled":
      return "bg-gray-500";
    case "abandoned":
      return "bg-orange-500";
    case "waitingforapproval":
      return "bg-orange-500";
    case "inprogress":
    case "deploying":
      return "bg-blue-500";
    case "pending":
    case "notstarted":
    case "notDeployed":
      return "bg-yellow-500";
    default:
      return "bg-gray-400";
  }
};

export default function Releases() {
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [releases, setReleases] = useState([]);
  const [filteredReleases, setFilteredReleases] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 50;
  const [stats, setStats] = useState({
    total: 0,
    successRate: 0,
    pendingApprovals: 0,
    activeDeployments: 0,
  });

  // Time range state
  const [timeRange, setTimeRange] = useState({
    from: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    to: new Date(),
    label: "1 Day",
    value: "1d",
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [definitionFilter, setDefinitionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [environments, setEnvironments] = useState([]);
  const [definitions, setDefinitions] = useState([]);

  // Modal state
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // AI insights state
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(() => {
    const saved = localStorage.getItem("releaseAiInsightsEnabled");
    return saved !== null ? JSON.parse(saved) : false;
  });

  const { checkConnection } = useHealth();

  useEffect(() => {
    if (currentOrganization) {
      setCurrentPage(1); // Reset to first page when time range changes
      loadReleasesData();
    }
  }, [timeRange, currentOrganization, currentProject]); // Reset page and reload when time range, org, or project changes

  useEffect(() => {
    if (currentPage > 1) {
      // Only load if not first page (first page loads from time range effect)
      loadReleasesData(true); // Pass true for pagination
    }
  }, [currentPage]); // Reload when page changes

  // Filter and sort releases - blocked/failed first for operational clarity
  useEffect(() => {
    let filtered = releases;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((release) => release.status === statusFilter);
    }

    // Environment filter
    if (environmentFilter !== "all") {
      filtered = filtered.filter((release) =>
        release.environments?.some((env) => env.name === environmentFilter)
      );
    }

    // Definition filter
    if (definitionFilter !== "all") {
      filtered = filtered.filter((release) => release.definitionName === definitionFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (release) =>
          release.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          release.definitionName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by operational priority: blocked first, then failed, then in-progress, then others
    const sorted = [...filtered].sort((a, b) => {
      const getPriority = (release) => {
        const status = release.status?.toLowerCase();
        if (status === "waitingforapproval") return 0; // Blocked first
        if (status === "failed" || status === "rejected") return 1; // Failures second
        if (status === "inprogress" || status === "deploying") return 2; // In progress third
        if (status === "pending" || status === "notstarted") return 3;
        if (status === "canceled" || status === "cancelled" || status === "abandoned") return 4;
        return 5; // Succeeded last
      };

      const priorityDiff = getPriority(a) - getPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by time (most recent first)
      return new Date(b.createdOn || 0) - new Date(a.createdOn || 0);
    });

    setFilteredReleases(sorted);
  }, [releases, statusFilter, environmentFilter, definitionFilter, searchTerm]);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadReleasesData()]);
  };

  const openReleaseModal = (release) => {
    setSelectedRelease(release);
    setIsModalOpen(true);
  };

  const closeReleaseModal = () => {
    setSelectedRelease(null);
    setIsModalOpen(false);
  };

  const toggleAiInsights = () => {
    const newValue = !aiInsightsEnabled;
    setAiInsightsEnabled(newValue);
    localStorage.setItem("releaseAiInsightsEnabled", JSON.stringify(newValue));
  };

  const loadReleasesData = async (isPagination = false) => {
    try {
      if (isPagination) {
        setPaginationLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch release statistics with time range
      const statsResponse = await releaseService.getReleaseStats({
        fromDate: timeRange.from.toISOString(),
        toDate: timeRange.to.toISOString(),
      });
      if (statsResponse.success) {
        setStats(statsResponse.data);
        // Calculate total pages based on total releases
        const totalReleases = statsResponse.data.totalReleases || 0;
        setTotalPages(Math.ceil(totalReleases / itemsPerPage));
      }

      // Fetch releases with time range and pagination
      const releasesResponse = await releaseService.getReleases({
        fromDate: timeRange.from.toISOString(),
        toDate: timeRange.to.toISOString(),
        limit: itemsPerPage,
        skip: (currentPage - 1) * itemsPerPage,
      });

      if (releasesResponse.success) {
        const releasesList = releasesResponse.data.releases || [];
        setReleases(releasesList);

        // Extract unique environments from releases
        const uniqueEnvironments = [
          ...new Set(
            releasesList.flatMap((release) => (release.environments || []).map((env) => env.name))
          ),
        ]
          .filter(Boolean)
          .sort();
        setEnvironments(uniqueEnvironments);

        // Extract unique definitions from releases
        const uniqueDefinitions = [
          ...new Set(releasesList.map((release) => release.definitionName)),
        ]
          .filter(Boolean)
          .sort();
        setDefinitions(uniqueDefinitions);
      }

      setLoading(false);
      setPaginationLoading(false);
      setInitialLoad(false);
      clearSwitching(); // Clear switching overlay
    } catch (err) {
      setError(
        err.userMessage || "Failed to load releases. Please check your Azure DevOps configuration."
      );
      setLoading(false);
      setPaginationLoading(false);
      setInitialLoad(false);
      clearSwitching(); // Clear switching overlay on error
    }
  };

  const refreshIconClass = loading
    ? "w-3.5 h-3.5 animate-spin transition-transform duration-300"
    : "w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300";

  const handleRetry = () => {
    // Reset to default 1-day range and clear error
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    setTimeRange({ from, to, label: "1 Day", value: "1d" });
    setError(null);
    // loadReleasesData will be called automatically by useEffect when timeRange changes
  };

  if (error) {
    return <ErrorMessage message={error} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
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
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}</style>

      {/* Header */}
      <div className={initialLoad ? "animate-slide-up" : ""}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Releases</h1>
              {/* Quick health indicator - neutral bg, colored text/icon */}
              {!loading &&
                (stats.pendingApprovals > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted">
                    <UserCheck className="h-3 w-3 text-orange-500" />
                    <span className="text-orange-600 dark:text-orange-400">
                      {stats.pendingApprovals} blocked
                    </span>
                  </span>
                ) : stats.failedDeployments > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-red-600 dark:text-red-400">
                      {stats.failedDeployments} failed
                    </span>
                  </span>
                ) : stats.activeDeployments > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400">
                      {stats.activeDeployments} deploying
                    </span>
                  </span>
                ) : stats.totalReleases > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                    Healthy
                  </span>
                ) : null)}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {!loading && stats.pendingApprovals > 0
                ? `${stats.pendingApprovals} release${stats.pendingApprovals > 1 ? "s" : ""} waiting for approval`
                : "Release deployments and environment status"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <button
              onClick={handleSync}
              disabled={loading}
              className="group flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={refreshIconClass} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="shimmer w-5 h-5 rounded" />
                  <div className="shimmer w-12 h-4 rounded-full" />
                </div>
                <div className="shimmer w-8 h-8 rounded mb-0.5" />
                <div className="shimmer w-20 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Total Releases - neutral */}
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Rocket className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Total
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-foreground mb-0.5">
                {stats.totalReleases || 0}
              </div>
              <div className="text-sm text-muted-foreground">Releases</div>
            </div>
          </div>

          {/* Success Rate - neutral with colored text */}
          {(() => {
            const rate = stats.successRate || 0;
            const isHealthy = rate >= 90;
            const isWarning = rate >= 70 && rate < 90;
            const isCritical = rate < 70;

            return (
              <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle
                    className={`h-5 w-5 ${
                      isCritical
                        ? "text-red-500"
                        : isWarning
                          ? "text-amber-500"
                          : "text-emerald-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${
                      isCritical
                        ? "text-red-600 dark:text-red-400"
                        : isWarning
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {isCritical ? "Critical" : isWarning ? "Fair" : "Healthy"}
                  </span>
                </div>
                <div className="mb-3">
                  <div
                    className={`text-2xl font-bold mb-0.5 ${
                      isCritical
                        ? "text-red-600 dark:text-red-400"
                        : isWarning
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground"
                    }`}
                  >
                    {rate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            );
          })()}

          {/* Pending Approvals - neutral with colored icon/text */}
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <UserCheck
                className={`h-5 w-5 ${stats.pendingApprovals > 0 ? "text-orange-500" : "text-muted-foreground"}`}
              />
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${
                  stats.pendingApprovals > 0
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-muted-foreground"
                }`}
              >
                {stats.pendingApprovals > 0 ? `${stats.pendingApprovals} blocked` : "Clear"}
              </span>
            </div>
            <div className="mb-3">
              <div
                className={`text-2xl font-bold mb-0.5 ${stats.pendingApprovals > 0 ? "text-orange-600 dark:text-orange-400" : "text-foreground"}`}
              >
                {stats.pendingApprovals}
              </div>
              <div className="text-sm text-muted-foreground">Awaiting Approval</div>
            </div>
            <div
              className={`text-xs ${stats.pendingApprovals > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}
            >
              {stats.pendingApprovals > 0 ? "Blocking deployment" : "No pending approvals"}
            </div>
          </div>

          {/* Active Deployments - neutral */}
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Clock
                className={`h-5 w-5 ${stats.activeDeployments > 0 ? "text-blue-500" : "text-muted-foreground"}`}
              />
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${
                  stats.activeDeployments > 0
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground"
                }`}
              >
                {stats.activeDeployments > 0 ? "Deploying" : "Idle"}
              </span>
            </div>
            <div className="mb-3">
              <div
                className={`text-2xl font-bold mb-0.5 ${stats.activeDeployments > 0 ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}
              >
                {stats.activeDeployments}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.activeDeployments > 0 ? "Deploying now" : "No active deployments"}
            </div>
          </div>
        </div>
      )}

      {/* Environment Health Dashboard */}
      {loading ? (
        <div
          className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="shimmer w-5 h-5 rounded" />
            <div className="shimmer w-40 h-6 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="shimmer w-4 h-4 rounded" />
                  <div className="shimmer w-8 h-4 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="shimmer w-full h-3 rounded" />
                  <div className="shimmer w-3/4 h-3 rounded" />
                  <div className="shimmer w-1/2 h-3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        stats.environmentStats && (
          <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <EnvironmentHealthDashboard environmentStats={stats.environmentStats} />
          </div>
        )
      )}

      {/* AI Release Insights - Disabled */}
      {/* <AIReleaseInsights 
        enabled={aiInsightsEnabled}
        onToggle={toggleAiInsights}
      /> */}

      {/* Recent Releases Section */}
      <div
        className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in"
        style={{ animationDelay: "0.4s" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-foreground">Recent Releases</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <ReleaseFilterDropdown
              options={[
                { value: "all", label: "All Status" },
                { value: "succeeded", label: "Succeeded" },
                { value: "failed", label: "Failed" },
                { value: "canceled", label: "Canceled" },
                { value: "abandoned", label: "Abandoned" },
                { value: "waitingforapproval", label: "Waiting for Approval" },
                { value: "inprogress", label: "In Progress" },
                { value: "pending", label: "Pending" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={Filter}
              placeholder="All Status"
            />

            {/* Environment Filter */}
            <ReleaseFilterDropdown
              options={[
                { value: "all", label: "All Environments" },
                ...environments.map((env) => ({ value: env, label: env })),
              ]}
              value={environmentFilter}
              onChange={setEnvironmentFilter}
              icon={Server}
              placeholder="All Environments"
            />

            {/* Definition Filter */}
            <ReleaseFilterDropdown
              options={[
                { value: "all", label: "All Definitions" },
                ...definitions.map((def) => ({ value: def, label: def })),
              ]}
              value={definitionFilter}
              onChange={setDefinitionFilter}
              icon={Rocket}
              placeholder="All Definitions"
            />

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:focus:border-blue-600 w-32 hover:border-muted-foreground transition-colors bg-card dark:bg-[#111111] text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Quick filters for blocked/failed - neutral bg */}
            <div className="flex items-center gap-1 border-l border-border pl-2">
              {stats.pendingApprovals > 0 && statusFilter !== "waitingforapproval" && (
                <button
                  onClick={() => setStatusFilter("waitingforapproval")}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:bg-muted/80 bg-muted px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1"
                  title="Show blocked releases"
                >
                  <UserCheck className="w-3 h-3" />
                  Blocked
                </button>
              )}
              {stats.failedDeployments > 0 && statusFilter !== "failed" && (
                <button
                  onClick={() => setStatusFilter("failed")}
                  className="text-xs text-red-600 dark:text-red-400 hover:bg-muted/80 bg-muted px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1"
                  title="Show failed releases"
                >
                  <XCircle className="w-3 h-3" />
                  Failed
                </button>
              )}
            </div>

            {/* Clear Filters */}
            {(statusFilter !== "all" ||
              environmentFilter !== "all" ||
              definitionFilter !== "all" ||
              searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setEnvironmentFilter("all");
                  setDefinitionFilter("all");
                  setSearchTerm("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-full transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(statusFilter !== "all" || environmentFilter !== "all" || definitionFilter !== "all") && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium border border-border">
                <Filter className="h-3 w-3" />
                {statusFilter}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="hover:bg-blue-200 dark:hover:bg-blue-900 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {environmentFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium border border-border">
                <Server className="h-3 w-3" />
                {environmentFilter}
                <button
                  onClick={() => setEnvironmentFilter("all")}
                  className="hover:bg-green-200 dark:hover:bg-green-900 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {definitionFilter !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800">
                <Rocket className="h-3 w-3" />
                {definitionFilter}
                <button
                  onClick={() => setDefinitionFilter("all")}
                  className="hover:bg-purple-200 dark:hover:bg-purple-900 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="px-6 py-4 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="shimmer w-5 h-5 rounded" />
                    <div className="shimmer w-32 h-5 rounded" />
                  </div>
                  <div className="shimmer w-16 h-5 rounded-full" />
                </div>
                <div className="space-y-2 mb-3">
                  <div className="shimmer w-3/4 h-4 rounded" />
                  <div className="shimmer w-1/2 h-3 rounded" />
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, envIdx) => (
                    <div key={envIdx} className="shimmer w-20 h-6 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredReleases.length === 0 ? (
          <div className="text-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {releases.length === 0 ? "No Releases Found" : "No Matching Releases"}
            </h3>
            <p className="text-muted-foreground">
              {releases.length === 0
                ? "No recent releases found. Check your Azure DevOps configuration or create a release."
                : "No releases match the current filters. Try adjusting your search criteria."}
            </p>
            {releases.length > 0 && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setEnvironmentFilter("all");
                  setDefinitionFilter("all");
                  setSearchTerm("");
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <ScrollArea className="h-[40vh] border border-border dark:border-[#1a1a1a] rounded-xl bg-card dark:bg-[#111111]">
              {paginationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <div className="divide-y divide-border dark:divide-[#1a1a1a]">
                  {filteredReleases.map((release, index) => {
                    const status = release.status?.toLowerCase();
                    const isBlocked = status === "waitingforapproval";
                    const isFailed = status === "failed" || status === "rejected";
                    const isInProgress = status === "inprogress" || status === "deploying";

                    return (
                      <div
                        key={release.id}
                        onClick={() => openReleaseModal(release)}
                        className={`px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer group ${
                          isBlocked
                            ? "border-l-2 border-l-orange-500"
                            : isFailed
                              ? "border-l-2 border-l-red-500"
                              : isInProgress
                                ? "border-l-2 border-l-blue-500"
                                : ""
                        }`}
                        title="Click to view details"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getStatusIcon(release.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-foreground truncate">
                                  {release.name}
                                </h4>
                                <span className="text-xs text-muted-foreground font-mono">
                                  #{release.id}
                                </span>
                                {(release.status === "failed" || release.status === "rejected") && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                                    <FileText className="h-3 w-3" />
                                    {release.failureReason === "approval_rejected"
                                      ? "Approval Rejected"
                                      : "View Logs"}
                                  </span>
                                )}
                                {(release.status === "canceled" ||
                                  release.status === "cancelled") && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                                    <X className="h-3 w-3" />
                                    Canceled
                                  </span>
                                )}
                                {release.status === "waitingforapproval" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-orange-600 dark:text-orange-400 rounded-full text-xs font-medium">
                                    <UserCheck className="h-3 w-3" />
                                    View Approvals
                                  </span>
                                )}
                                {release.webUrl && (
                                  <a
                                    href={release.webUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Open in Azure DevOps"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {release.definitionName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {release.createdBy?.displayName || "Unknown"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(release.createdOn).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              {/* Environment progression */}
                              {release.environments && release.environments.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  {release.environments.map((env, envIndex) => (
                                    <div key={env.id} className="flex items-center gap-1">
                                      <div
                                        className={`w-2 h-2 rounded-full ${getEnvironmentStatusColor(env.status)}`}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {env.name}
                                      </span>
                                      {envIndex < release.environments.length - 1 && (
                                        <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${getStatusColor(release.status)}`}
                          >
                            {getStatusBadgeIcon(release.status)}
                            <span className="hidden sm:inline">
                              {release.status === "succeeded"
                                ? "Succeeded"
                                : release.status === "failed"
                                  ? "Failed"
                                  : release.status === "rejected"
                                    ? "Rejected"
                                    : release.status === "canceled"
                                      ? "Canceled"
                                      : release.status === "cancelled"
                                        ? "Canceled"
                                        : release.status === "abandoned"
                                          ? "Abandoned"
                                          : release.status === "waitingforapproval"
                                            ? "Waiting for Approval"
                                            : release.status === "inprogress"
                                              ? "In Progress"
                                              : release.status === "deploying"
                                                ? "Deploying"
                                                : release.status === "pending"
                                                  ? "Not Deployed"
                                                  : release.status === "notstarted"
                                                    ? "Not Deployed"
                                                    : release.status === "notDeployed"
                                                      ? "Not Deployed"
                                                      : release.status}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Results Summary */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, stats.totalReleases || 0)} of{" "}
                  {stats.totalReleases || releases.length} releases
                </span>
                {(statusFilter !== "all" ||
                  environmentFilter !== "all" ||
                  definitionFilter !== "all" ||
                  searchTerm) && <span className="text-blue-600">Filtered results</span>}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          className={
                            currentPage === 1 || paginationLoading
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => !paginationLoading && setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className={
                                paginationLoading
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          className={
                            currentPage === totalPages || paginationLoading
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Release Detail Modal */}
      <ReleaseDetailModal
        release={selectedRelease}
        isOpen={isModalOpen}
        onClose={closeReleaseModal}
      />
    </div>
  );
}
