import React, { useState, useEffect } from "react";
import {
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  ExternalLink,
  Pause,
  AlertCircle,
  TrendingUp,
  Timer,
  Building,
  RefreshCw,
} from "lucide-react";
import { apiService } from "../api/apiService";
import { useHealth } from "../contexts/HealthContext";
import ErrorMessage from "../components/ErrorMessage";
import { format } from "date-fns";

export default function Pipelines() {
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    succeeded: 0,
    failed: 0,
    inProgress: 0,
  });
  const { checkConnection } = useHealth();

  useEffect(() => {
    loadPipelinesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadPipelinesData()]);
  };

  const loadPipelinesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const buildsData = await apiService.getRecentBuilds();
      const buildsList = buildsData?.value || [];
      setBuilds(buildsList);

      // Calculate stats
      const newStats = {
        total: buildsList.length,
        succeeded: buildsList.filter((b) => b.result === "succeeded").length,
        failed: buildsList.filter((b) => b.result === "failed").length,
        inProgress: buildsList.filter((b) => b.status === "inProgress").length,
      };
      setStats(newStats);
      setLoading(false);
      setInitialLoad(false);
    } catch (err) {
      setError("Failed to load pipelines data");
      console.error("Pipelines error:", err);
      setLoading(false);
      // Don't set initialLoad to false on error so error page shows
    }
  };

  const getBuildStatusIcon = (result, status) => {
    if (status === "inProgress") {
      return <Building className="h-5 w-5 text-blue-500 animate-pulse" />;
    }
    switch (result) {
      case "succeeded":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "canceled":
        return <Pause className="h-5 w-5 text-gray-500" />;
      case "partiallySucceeded":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getBuildStatusBadge = (result, status) => {
    if (status === "inProgress") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Building className="h-3 w-3 animate-pulse" /> In Progress
        </span>
      );
    }
    switch (result) {
      case "succeeded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" /> Succeeded
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" /> Failed
          </span>
        );
      case "canceled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Pause className="h-3 w-3" /> Canceled
          </span>
        );
      case "partiallySucceeded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3" /> Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3" /> {status || "Unknown"}
          </span>
        );
    }
  };

  const formatDuration = (startTime, finishTime) => {
    if (!startTime) return "N/A";
    const start = new Date(startTime);
    const end = finishTime ? new Date(finishTime) : new Date();
    const durationMs = end - start;
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
    if (durationMs < 3600000) return `${Math.round(durationMs / 60000)}m`;
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.round((durationMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (error && initialLoad) {
    return <ErrorMessage message={error} onRetry={loadPipelinesData} />;
  }

  const refreshIconClass =
    "w-3.5 h-3.5 transition-transform duration-300 " +
    (loading ? "animate-spin" : "group-hover:rotate-180");

  return (
    <div className="space-y-6">
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
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

      <div className={initialLoad ? "animate-slide-up" : ""}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Pipelines
            </h1>
            <p className="text-gray-600 text-sm mt-0.5">
              Recent build and deployment status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={loading}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={refreshIconClass} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-5 h-5 shimmer rounded" />
                  <div className="w-12 h-4 shimmer rounded-full" />
                </div>
                <div className="w-8 h-8 shimmer rounded mb-0.5" />
                <div className="w-20 h-3 shimmer rounded" />
                <div className="w-16 h-3 shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Total, Succeeded, Failed, InProgress cards (same structure as before) */}
          <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <GitBranch className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                Total
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-gray-900 mb-0.5">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600">Total Builds</div>
            </div>
          </div>

          <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Success
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-gray-900 mb-0.5">
                {stats.succeeded}
              </div>
              <div className="text-sm text-gray-600">Succeeded</div>
            </div>
          </div>

          <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                Failed
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-gray-900 mb-0.5">
                {stats.failed}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-gray-900 mb-0.5">
                {stats.inProgress}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Builds - Show skeleton while loading */}
      {loading ? (
        <div
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 shimmer rounded animate-pulse"></div>
              <div className="h-6 shimmer rounded w-32 animate-pulse"></div>
            </div>
            <div className="h-5 shimmer rounded-full w-20 animate-pulse"></div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 shimmer rounded-full"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-4 shimmer rounded w-32"></div>
                      <div className="h-4 shimmer rounded w-16"></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-3 shimmer rounded w-20"></div>
                      <div className="h-3 shimmer rounded w-16"></div>
                      <div className="h-3 shimmer rounded w-12"></div>
                      <div className="h-3 shimmer rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 shimmer rounded-full w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              Recent Builds
            </h3>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
            {builds.length} builds
          </span>
        </div>

        <div className="max-h-[45vh] overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg bg-white">
          {builds.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {builds.map((build) => (
                <div
                  key={build.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getBuildStatusIcon(build.result, build.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {build.definition?.name || "Unknown"}
                          </h4>
                          <span className="text-xs text-gray-500 font-mono">
                            #{build.buildNumber}
                          </span>
                          {build._links?.web?.href && (
                            <a
                              href={build._links.web.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors opacity-0 group-hover:opacity-100"
                              title="Open in Azure DevOps"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {build.sourceBranch?.replace("refs/heads/", "") ||
                              "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {build.requestedBy?.displayName || "Unknown"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {formatDuration(build.startTime, build.finishTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {build.startTime
                              ? format(
                                  new Date(build.startTime),
                                  "MMM d, HH:mm"
                                )
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {getBuildStatusBadge(build.result, build.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No builds found</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Build Success Rate - Show skeleton while loading */}
      {loading ? (
        <div
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex items-center justify-between mb-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 shimmer rounded"></div>
              <div className="h-5 shimmer rounded w-32"></div>
            </div>
            <div className="h-8 shimmer rounded w-12"></div>
          </div>
          <div className="mb-4">
            <div className="w-full shimmer rounded-full h-2 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="text-center animate-pulse">
                <div className="h-6 shimmer rounded w-8 mx-auto mb-1"></div>
                <div className="h-3 shimmer rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        builds.length > 0 && (
        <div
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Build Success Rate
              </h3>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.total > 0
                ? Math.round((stats.succeeded / stats.total) * 100)
                : 0}
              %
            </div>
          </div>

          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width:
                    stats.total > 0
                      ? `${(stats.succeeded / stats.total) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">
                {stats.succeeded}
              </div>
              <div className="text-xs text-emerald-700">Succeeded</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {stats.failed}
              </div>
              <div className="text-xs text-red-700">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {stats.inProgress}
              </div>
              <div className="text-xs text-blue-700">In Progress</div>
            </div>
          </div>
        </div>
        )
      )}

      {builds.length === 0 && !loading && (
        <div className="card text-center py-12">
          <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Builds Found
          </h3>
          <p className="text-gray-600">
            No recent builds found. Check your Azure DevOps configuration or
            trigger a build.
          </p>
        </div>
      )}
    </div>
  );
}
