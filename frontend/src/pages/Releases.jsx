import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHealth } from "../contexts/HealthContext";
import { releaseService } from "../api/releaseService";
import ReleaseFilterDropdown from "../components/ReleaseFilterDropdown";
import ReleaseDetailModal from "../components/ReleaseDetailModal";
import EnvironmentHealthDashboard from "../components/EnvironmentHealthDashboard";
import AIReleaseInsights from "../components/AIReleaseInsights";
import ErrorMessage from "../components/ErrorMessage";

// Helper functions for status display
const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'failed':
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'inprogress':
    case 'deploying':
      return <Clock className="w-4 h-4 text-blue-600" />;
    case 'pending':
    case 'notstarted':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'failed':
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'inprogress':
    case 'deploying':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'pending':
    case 'notstarted':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

const getEnvironmentStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return 'bg-green-500';
    case 'failed':
    case 'rejected':
      return 'bg-red-500';
    case 'inprogress':
    case 'deploying':
      return 'bg-blue-500';
    case 'pending':
    case 'notstarted':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
};

export default function Releases() {
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [releases, setReleases] = useState([]);
  const [filteredReleases, setFilteredReleases] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    successRate: 0,
    pendingApprovals: 0,
    activeDeployments: 0,
  });
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  const [definitionFilter, setDefinitionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  
  // Modal state
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // AI insights state
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(() => {
    const saved = localStorage.getItem('releaseAiInsightsEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });
  
  const { checkConnection } = useHealth();

  useEffect(() => {
    loadReleasesData();
  }, []);

  // Filter releases when filters change
  useEffect(() => {
    let filtered = releases;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(release => release.status === statusFilter);
    }

    // Environment filter
    if (environmentFilter !== 'all') {
      filtered = filtered.filter(release => 
        release.environments?.some(env => env.name === environmentFilter)
      );
    }

    // Definition filter
    if (definitionFilter !== 'all') {
      filtered = filtered.filter(release => release.definitionName === definitionFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(release =>
        release.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        release.definitionName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReleases(filtered);
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
    localStorage.setItem('releaseAiInsightsEnabled', JSON.stringify(newValue));
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
      const releasesResponse = await releaseService.getReleases({ limit: 50 });
      if (releasesResponse.success) {
        const releasesList = releasesResponse.data.releases || [];
        setReleases(releasesList);

        // Extract unique environments
        const uniqueEnvironments = [...new Set(
          releasesList.flatMap(release => 
            (release.environments || []).map(env => env.name)
          )
        )].filter(Boolean).sort();
        setEnvironments(uniqueEnvironments);

        // Extract unique definitions
        const uniqueDefinitions = [...new Set(
          releasesList.map(release => release.definitionName)
        )].filter(Boolean).sort();
        setDefinitions(uniqueDefinitions);
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

      {/* Environment Health Dashboard */}
      {!loading && stats.environmentStats && (
        <EnvironmentHealthDashboard 
          environmentStats={stats.environmentStats}
          releases={releases}
        />
      )}

      {/* AI Release Insights */}
      <AIReleaseInsights 
        enabled={aiInsightsEnabled}
        onToggle={toggleAiInsights}
      />

      {/* Recent Releases Section */}
      <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xl font-semibold text-foreground">
              Recent Releases
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <ReleaseFilterDropdown
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'succeeded', label: 'Succeeded' },
                { value: 'failed', label: 'Failed' },
                { value: 'inprogress', label: 'In Progress' },
                { value: 'pending', label: 'Pending' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={Filter}
              placeholder="All Status"
              minWidth="120px"
            />

            {/* Environment Filter */}
            <ReleaseFilterDropdown
              options={[
                { value: 'all', label: 'All Environments' },
                ...environments.map(env => ({ value: env, label: env }))
              ]}
              value={environmentFilter}
              onChange={setEnvironmentFilter}
              icon={Server}
              placeholder="All Environments"
              minWidth="150px"
            />

            {/* Definition Filter */}
            <ReleaseFilterDropdown
              options={[
                { value: 'all', label: 'All Definitions' },
                ...definitions.map(def => ({ value: def, label: def }))
              ]}
              value={definitionFilter}
              onChange={setDefinitionFilter}
              icon={Rocket}
              placeholder="All Definitions"
              minWidth="150px"
            />

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search releases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 border border-border rounded-full text-base sm:text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:focus:border-blue-600 w-full sm:w-36 hover:border-muted-foreground transition-colors bg-card dark:bg-[#111111] text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Clear Filters */}
            {(statusFilter !== 'all' || environmentFilter !== 'all' || definitionFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setEnvironmentFilter('all');
                  setDefinitionFilter('all');
                  setSearchTerm('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-full transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(statusFilter !== 'all' || environmentFilter !== 'all' || definitionFilter !== 'all') && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                <Filter className="h-3 w-3" />
                {statusFilter}
                <button
                  onClick={() => setStatusFilter('all')}
                  className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {environmentFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                <Server className="h-3 w-3" />
                {environmentFilter}
                <button
                  onClick={() => setEnvironmentFilter('all')}
                  className="hover:bg-green-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {definitionFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                <Rocket className="h-3 w-3" />
                {definitionFilter}
                <button
                  onClick={() => setDefinitionFilter('all')}
                  className="hover:bg-purple-100 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {filteredReleases.length === 0 ? (
          <div className="text-center py-12">
            <Rocket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {releases.length === 0 ? "No Releases Found" : "No Matching Releases"}
            </h3>
            <p className="text-muted-foreground">
              {releases.length === 0 
                ? "No recent releases found. Check your Azure DevOps configuration or create a release."
                : "No releases match the current filters. Try adjusting your search criteria."
              }
            </p>
            {releases.length > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setEnvironmentFilter('all');
                  setDefinitionFilter('all');
                  setSearchTerm('');
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
              <div className="divide-y divide-border dark:divide-[#1a1a1a]">
                {filteredReleases.map((release, index) => (
                  <div 
                    key={release.id} 
                    onClick={() => openReleaseModal(release)}
                    className="px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    title="Click to view details"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          #{release.id}
                        </span>
                        <div>
                          <h4 className="font-medium text-foreground group-hover:text-blue-600 transition-colors">
                            {release.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {release.definitionName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(release.status)}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(release.status)}`}>
                          {release.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Environment progression */}
                    {release.environments && release.environments.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        {release.environments.map((env, envIndex) => (
                          <div key={env.id} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getEnvironmentStatusColor(env.status)}`} />
                            <span className="text-xs text-muted-foreground">{env.name}</span>
                            {envIndex < release.environments.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Created by {release.createdBy?.displayName || 'Unknown'}
                      </span>
                      <span>
                        {new Date(release.createdOn).toLocaleDateString()} {new Date(release.createdOn).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Results Summary */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {filteredReleases.length} of {releases.length} releases
                </span>
                {(statusFilter !== 'all' || environmentFilter !== 'all' || definitionFilter !== 'all' || searchTerm) && (
                  <span className="text-blue-600">
                    Filtered results
                  </span>
                )}
              </div>
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
