import React, { useState, useEffect } from 'react'
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
  RefreshCw
} from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiService } from '../api/apiService'
import { useHealth } from '../contexts/HealthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format, formatDistanceToNow } from 'date-fns'

export default function PullRequests() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState({
    pullRequests: true,
    idlePRs: true,
    stats: true
  })
  const [error, setError] = useState(null)
  const [pullRequests, setPullRequests] = useState([])
  const [idlePRs, setIdlePRs] = useState([])
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unassigned: 0,
    idle: 0
  })
  const { checkConnection } = useHealth()

  useEffect(() => {
    loadPullRequestsData()
  }, [])

  const handleSync = async () => {
    await Promise.all([
      checkConnection(),
      loadPullRequestsData()
    ])
  }

  const loadPullRequestsData = async () => {
    try {
      setInitialLoading(true)
      setError(null)
      setLoadingStates({
        pullRequests: true,
        idlePRs: true,
        stats: true
      })

      // Load pull requests first
      try {
        const prsData = await apiService.getPullRequests()
        const prsList = prsData.value || []
        setPullRequests(prsList)
        
        // Calculate stats
        const newStats = {
          total: prsList.length,
          active: prsList.filter(pr => pr.status === 'active' && pr.reviewers && pr.reviewers.length > 0).length,
          unassigned: prsList.filter(pr => pr.status === 'active' && (!pr.reviewers || pr.reviewers.length === 0)).length,
          idle: 0
        }
        setStats(prev => ({ ...prev, ...newStats }))
        setLoadingStates(prev => ({ ...prev, pullRequests: false, stats: false }))
        // Don't set initialLoading false here - wait for all APIs or error
      } catch (err) {
        console.error('Failed to load pull requests:', err)
        setPullRequests([])
        setStats({ total: 0, active: 0, unassigned: 0, idle: 0 })
        setLoadingStates(prev => ({ ...prev, pullRequests: false, stats: false }))
        // Set error and return early to show error page
        setError('Failed to load pull requests data')
        return
      }

      // Load idle PRs separately
      try {
        const idleData = await apiService.getIdlePullRequests()
        const idleList = idleData.value || []
        setIdlePRs(idleList)
        setStats(prev => ({ ...prev, idle: idleList.length }))
        setLoadingStates(prev => ({ ...prev, idlePRs: false }))
      } catch (err) {
        console.error('Failed to load idle PRs:', err)
        setIdlePRs([])
        setStats(prev => ({ ...prev, idle: 0 }))
        setLoadingStates(prev => ({ ...prev, idlePRs: false }))
      }

      // Set initialLoading false only after all APIs complete successfully
      setInitialLoading(false)

    } catch (err) {
      setError('Failed to load pull requests data')
      console.error('Pull requests error:', err)
      // Don't set initialLoading to false on error so error page shows
      setPullRequests([])
      setIdlePRs([])
      setStats({ total: 0, active: 0, unassigned: 0, idle: 0 })
      setLoadingStates({
        pullRequests: false,
        idlePRs: false,
        stats: false
      })
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200">
            <Activity className="h-3 w-3" />
            Active
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        )
      case 'abandoned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <XCircle className="h-3 w-3" />
            Abandoned
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            {status}
          </span>
        )
    }
  }

  const getMergeStatusBadge = (mergeStatus) => {
    switch (mergeStatus) {
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        )
      case 'conflicts':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200">
            <AlertCircle className="h-3 w-3" />
            Conflicts
          </span>
        )
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            {mergeStatus || 'Unknown'}
          </span>
        )
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <GitPullRequest className="h-5 w-5 text-blue-500 dark:text-blue-400" />
      case 'completed':
        return <GitPullRequest className="h-5 w-5 text-green-500 dark:text-green-400" />
      case 'abandoned':
        return <GitPullRequest className="h-5 w-5 text-muted-foreground" />
      default:
        return <GitPullRequest className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getLastActivityTime = (pr) => {
    const lastCommitDate = pr.lastMergeCommit?.committer?.date
    const creationDate = pr.creationDate
    const lastActivity = lastCommitDate || creationDate
    
    if (lastActivity) {
      return formatDistanceToNow(new Date(lastActivity), { addSuffix: true })
    }
    return 'Unknown'
  }

  // Filter and sort PRs
  const getFilteredAndSortedPRs = () => {
    let filtered = [...pullRequests]

    // Apply filter
    switch (filter) {
      case 'under-review':
        filtered = filtered.filter(pr => pr.status === 'active' && pr.reviewers && pr.reviewers.length > 0)
        break
      case 'unassigned':
        filtered = filtered.filter(pr => pr.status === 'active' && (!pr.reviewers || pr.reviewers.length === 0))
        break
      case 'idle':
        filtered = filtered.filter(pr => idlePRs.some(idle => idle.pullRequestId === pr.pullRequestId))
        break
      case 'all':
      default:
        // No filter
        break
    }

    // Apply sort
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.creationDate) - new Date(b.creationDate))
        break
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate))
        break
    }

    return filtered
  }

  if (error && initialLoading) {
    return <ErrorMessage message={error} onRetry={loadPullRequestsData} />
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
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Pull Requests</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Active pull requests and review status</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={Object.values(loadingStates).some(loading => loading)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-full hover:bg-foreground/90 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${Object.values(loadingStates).some(loading => loading) ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
        {/* Total PRs */}
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
                <GitPullRequest className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
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

        {/* Active PRs */}
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
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{stats.active}</div>
                <div className="text-sm text-muted-foreground">Under Review</div>
              </div>
            </>
          )}
        </div>

        {/* Unassigned PRs */}
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
                <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-full">
                  Unassigned
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{stats.unassigned}</div>
                <div className="text-sm text-muted-foreground">Need Reviewers</div>
              </div>
            </>
          )}
        </div>

        {/* Idle PRs */}
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
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/50 px-2 py-0.5 rounded-full">
                  Idle
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{stats.idle}</div>
                <div className="text-sm text-muted-foreground">Stale (48h+)</div>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Filter and Sort Controls */}
      <div className="bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in" style={{animationDelay: '0.25s'}}>
        <div className="p-4 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:justify-between">
          {/* Filter Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All', count: pullRequests.length },
                { value: 'under-review', label: 'Under Review', count: stats.active },
                { value: 'unassigned', label: 'Unassigned', count: stats.unassigned },
                { value: 'idle', label: 'Idle', count: stats.idle }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    filter === option.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                    filter === option.value
                      ? 'bg-white/20 text-white'
                      : 'bg-background text-muted-foreground'
                  }`}>
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
              <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Sort
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'newest', label: 'Newest' },
                { value: 'oldest', label: 'Oldest' },
                { value: 'title', label: 'A-Z' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    sortBy === option.value
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
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
      <div className="bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in" style={{animationDelay: '0.3s'}}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50">
              <GitPullRequest className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">All Pull Requests</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filter === 'all' ? 'Showing all pull requests' : `Filtered results`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-foreground">
              {filter === 'all' ? pullRequests.length : getFilteredAndSortedPRs().length} of {pullRequests.length}
            </span>
            {getFilteredAndSortedPRs().length !== pullRequests.length && (
              <button
                onClick={() => setFilter('all')}
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
              {[1, 2, 3, 4, 5].map(i => (
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
              {getFilteredAndSortedPRs().map((pr) => (
                <div key={pr.pullRequestId} className="px-6 py-4 hover:bg-muted/50 transition-colors">
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
                        <span className="truncate max-w-24">{pr.createdBy?.displayName || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{getLastActivityTime(pr)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span className="font-mono truncate max-w-32">
                          {pr.sourceRefName?.replace('refs/heads/', '')} → {pr.targetRefName?.replace('refs/heads/', '')}
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
                        <span className="truncate">{pr.repository?.project?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderGit2 className="h-3 w-3" />
                        <span className="truncate">{pr.repository?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(pr.creationDate), 'MMM d')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  )
}
