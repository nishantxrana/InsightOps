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
import { apiService } from '../api/apiService'
import { useHealth } from '../contexts/HealthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format, formatDistanceToNow } from 'date-fns'

export default function PullRequests() {
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)
  const [pullRequests, setPullRequests] = useState([])
  const [idlePRs, setIdlePRs] = useState([])
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
      setLoading(true)
      setError(null)

      const [prsData, idleData] = await Promise.allSettled([
        apiService.getPullRequests(),
        apiService.getIdlePullRequests()
      ])

      if (prsData.status === 'fulfilled') {
        const prsList = prsData.value.value || []
        setPullRequests(prsList)
        
        // Calculate stats
        const stats = {
          total: prsList.length,
          active: prsList.filter(pr => pr.status === 'active' && pr.reviewers && pr.reviewers.length > 0).length,
          unassigned: prsList.filter(pr => pr.status === 'active' && (!pr.reviewers || pr.reviewers.length === 0)).length,
          idle: 0
        }
        setStats(prev => ({ ...prev, ...stats }))
      }

      if (idleData.status === 'fulfilled') {
        const idleList = idleData.value.value || []
        setIdlePRs(idleList)
        setStats(prev => ({ ...prev, idle: idleList.length }))
      }

    } catch (err) {
      setError('Failed to load pull requests data')
      console.error('Pull requests error:', err)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Activity className="h-3 w-3" />
            Active
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        )
      case 'abandoned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3" />
            Abandoned
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        )
      case 'conflicts':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" />
            Conflicts
          </span>
        )
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle className="h-3 w-3" />
            {mergeStatus || 'Unknown'}
          </span>
        )
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <GitPullRequest className="h-5 w-5 text-blue-500" />
      case 'completed':
        return <GitPullRequest className="h-5 w-5 text-green-500" />
      case 'abandoned':
        return <GitPullRequest className="h-5 w-5 text-gray-500" />
      default:
        return <GitPullRequest className="h-5 w-5 text-gray-400" />
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

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadPullRequestsData} />
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}</style>
      
      {/* Header - Always visible with slideUp animation */}
      <div className={initialLoad ? "animate-slide-up" : ""}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Pull Requests</h1>
            <p className="text-gray-600 text-sm mt-0.5">Active pull requests and review status</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={loading}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
        {/* Total PRs */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <GitPullRequest className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Total
            </span>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{stats.total}</div>
            <div className="text-sm text-gray-600">Pull Requests</div>
          </div>
          <div className="text-xs text-blue-600">
            All repositories
          </div>
        </div>

        {/* Active PRs */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Activity className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{stats.active}</div>
            <div className="text-sm text-gray-600">Under Review</div>
          </div>
          <div className="text-xs text-green-600">
            {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total
          </div>
        </div>

        {/* Unassigned PRs */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <User className="h-5 w-5 text-orange-600" />
            <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
              Unassigned
            </span>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{stats.unassigned}</div>
            <div className="text-sm text-gray-600">Need Reviewers</div>
          </div>
          <div className="text-xs text-orange-600">
            {stats.unassigned > 0 ? 'Assign reviewers' : 'All assigned'}
          </div>
        </div>

        {/* Idle PRs */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
              Idle
            </span>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{stats.idle}</div>
            <div className="text-sm text-gray-600">Stale (48h+)</div>
          </div>
          <div className="text-xs text-yellow-600">
            {stats.idle > 0 ? 'Needs attention' : 'All active'}
          </div>
        </div>
      </div>

      {/* Idle Pull Requests Alert */}
      {idlePRs.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-yellow-200 shadow-sm bg-yellow-50">
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {idlePRs.length} Pull Request{idlePRs.length > 1 ? 's' : ''} Need Attention
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                The following pull requests have been inactive for more than 48 hours:
              </p>
              <ul className="mt-2 text-sm text-yellow-700">
                {idlePRs.slice(0, 3).map(pr => (
                  <li key={pr.pullRequestId}>
                    #{pr.pullRequestId}: {pr.title} (by {pr.createdBy?.displayName})
                  </li>
                ))}
                {idlePRs.length > 3 && (
                  <li>...and {idlePRs.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Pull Requests List */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-0">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Pull Requests</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {pullRequests.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {pullRequests.map((pr) => (
                <div key={pr.pullRequestId} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center flex-1 min-w-0">
                      {getStatusIcon(pr.status)}
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            #{pr.pullRequestId}: {pr.title}
                          </h4>
                          {pr.webUrl && (
                            <a
                              href={pr.webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
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
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
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
                          <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            Reviewers
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {pr.reviewers.slice(0, 3).map((reviewer, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-200"
                              >
                                {reviewer.displayName}
                              </span>
                            ))}
                            {pr.reviewers.length > 3 && (
                              <span className="text-xs text-gray-500 px-2 py-1">
                                +{pr.reviewers.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description - Only show if present */}
                    {pr.description && (
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                        {pr.description}
                      </p>
                    )}

                    {/* Project Info */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
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
            <div className="px-6 py-12 text-center text-gray-500">
              No pull requests found
            </div>
          )}
        </div>
      </div>

      {/* Review Status Summary */}
      {pullRequests.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Needs Review</span>
                <span className="text-sm font-medium text-gray-900">
                  {pullRequests.filter(pr => pr.status === 'active' && (!pr.reviewers || pr.reviewers.length === 0)).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Under Review</span>
                <span className="text-sm font-medium text-gray-900">
                  {pullRequests.filter(pr => pr.status === 'active' && pr.reviewers && pr.reviewers.length > 0).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-gray-900">
                  {pullRequests.filter(pr => pr.status === 'completed').length}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Created Today</span>
                <span className="text-sm font-medium text-gray-900">
                  {pullRequests.filter(pr => {
                    const today = new Date()
                    const created = new Date(pr.creationDate)
                    return created.toDateString() === today.toDateString()
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Idle (48h+)</span>
                <span className="text-sm font-medium text-gray-900">{stats.idle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Age</span>
                <span className="text-sm font-medium text-gray-900">
                  {pullRequests.length > 0 ? Math.round(
                    pullRequests.reduce((acc, pr) => {
                      const age = (new Date() - new Date(pr.creationDate)) / (1000 * 60 * 60 * 24)
                      return acc + age
                    }, 0) / pullRequests.length
                  ) : 0} days
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {pullRequests.length === 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm text-center py-12">
          <GitPullRequest className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pull Requests Found</h3>
          <p className="text-gray-600">
            No pull requests found. Check your Azure DevOps configuration or create a pull request.
          </p>
        </div>
      )}
    </div>
  )
}
