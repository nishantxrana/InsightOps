import React, { useState, useEffect } from "react";
import {
  Rocket,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Server,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHealth } from "../contexts/HealthContext";
import { releaseService } from "../api/releaseService";
import ErrorMessage from "../components/ErrorMessage";

export default function Releases() {
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [releases, setReleases] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    successRate: 0,
    pendingApprovals: 0,
    activeDeployments: 0,
  });
  
  const { checkConnection } = useHealth();

  useEffect(() => {
    loadReleasesData();
  }, []);

  const handleSync = async () => {
    await Promise.all([checkConnection(), loadReleasesData()]);
  };

  const loadReleasesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch release statistics
      const statsResponse = await releaseService.getReleaseStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
      
      // Fetch recent releases
      const releasesResponse = await releaseService.getReleases({ limit: 20 });
      if (releasesResponse.success) {
        setReleases(releasesResponse.data.releases || []);
      }
      
      setLoading(false);
      setInitialLoad(false);
    } catch (err) {
      setError("Failed to load releases data");
      console.error("Releases error:", err);
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const refreshIconClass = loading 
    ? "w-3.5 h-3.5 animate-spin transition-transform duration-300" 
    : "w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300";

  if (error) {
    return <ErrorMessage message={error} onRetry={loadReleasesData} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Releases
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Release deployments and environment status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={loading}
              className="group flex items-center gap-2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-full hover:bg-foreground/90 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={refreshIconClass} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-pulse"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-5 h-5 bg-muted rounded" />
                  <div className="w-12 h-4 bg-muted rounded-full" />
                </div>
                <div className="w-8 h-8 bg-muted rounded mb-0.5" />
                <div className="w-20 h-3 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
          {/* Total Releases */}
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
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

          {/* Success Rate */}
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
                Success
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-foreground mb-0.5">
                {stats.successRate}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/50 px-2 py-0.5 rounded-full">
                Pending
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-foreground mb-0.5">
                {stats.pendingApprovals}
              </div>
              <div className="text-sm text-muted-foreground">Approvals</div>
            </div>
          </div>

          {/* Active Deployments */}
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="mb-3">
              <div className="text-2xl font-bold text-foreground mb-0.5">
                {stats.activeDeployments}
              </div>
              <div className="text-sm text-muted-foreground">Deployments</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Releases Section */}
      <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-foreground">
              Recent Releases
            </h3>
          </div>
          {/* TODO: Add filters here */}
        </div>

        {releases.length === 0 ? (
          <div className="text-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Releases Found
            </h3>
            <p className="text-muted-foreground">
              No recent releases found. Check your Azure DevOps configuration or
              create a release.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[40vh] border border-border dark:border-[#1a1a1a] rounded-xl bg-card dark:bg-[#111111]">
            {/* TODO: Add releases list here */}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
