import React, { useState, useEffect } from 'react'
import { 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  ExternalLink,
  Play,
  Pause,
  AlertCircle,
  TrendingUp,
  Activity,
  Timer,
  GitCommit,
  Building,
  Zap
} from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format, formatDistanceToNow } from 'date-fns'

export default function Pipelines() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [builds, setBuilds] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    succeeded: 0,
    failed: 0,
    inProgress: 0
  })

  useEffect(() => {
    loadPipelinesData()
  }, [])

  const loadPipelinesData = async () => {
    try {
      setLoading(true)
      setError(null)

      const buildsData = await apiService.getRecentBuilds()
      const buildsList = buildsData.value || []
      
      setBuilds(buildsList)
      
      // Calculate stats
      const stats = {
        total: buildsList.length,
        succeeded: buildsList.filter(b => b.result === 'succeeded').length,
        failed: buildsList.filter(b => b.result === 'failed').length,
        inProgress: buildsList.filter(b => b.status === 'inProgress').length
      }
      setStats(stats)

    } catch (err) {
      setError('Failed to load pipelines data')
      console.error('Pipelines error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getBuildStatusIcon = (result, status) => {
    if (status === 'inProgress') {
      return <Building className="h-5 w-5 text-blue-500 animate-pulse" />
    }
    
    switch (result) {
      case 'succeeded':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'canceled':
        return <Pause className="h-5 w-5 text-gray-500" />
      case 'partiallySucceeded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getBuildStatusBadge = (result, status) => {
    if (status === 'inProgress') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Building className="h-3 w-3 animate-pulse" />
          In Progress
        </span>
      )
    }
    
    switch (result) {
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Succeeded
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        )
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Pause className="h-3 w-3" />
            Canceled
          </span>
        )
      case 'partiallySucceeded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3" />
            Partial
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3" />
            {status || 'Unknown'}
          </span>
        )
    }
  }

  const formatBuildDuration = (startTime, finishTime) => {
    if (!startTime) return 'N/A'
    
    const start = new Date(startTime)
    const end = finishTime ? new Date(finishTime) : new Date()
    const durationMs = end - start
    
    if (durationMs < 60000) { // Less than 1 minute
      return `${Math.round(durationMs / 1000)}s`
    } else if (durationMs < 3600000) { // Less than 1 hour
      return `${Math.round(durationMs / 60000)}m`
    } else {
      const hours = Math.floor(durationMs / 3600000)
      const minutes = Math.round((durationMs % 3600000) / 60000)
      return `${hours}h ${minutes}m`
    }
  }

  const formatDuration = (startTime, finishTime) => {
    if (!startTime) return 'N/A'
    
    const start = new Date(startTime)
    const end = finishTime ? new Date(finishTime) : new Date()
    const durationMs = end - start
    
    if (durationMs < 60000) { // Less than 1 minute
      return `${Math.round(durationMs / 1000)}s`
    } else if (durationMs < 3600000) { // Less than 1 hour
      return `${Math.round(durationMs / 60000)}m`
    } else {
      const hours = Math.floor(durationMs / 3600000)
      const minutes = Math.round((durationMs % 3600000) / 60000)
      return `${hours}h ${minutes}m`
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadPipelinesData} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pipelines</h2>
        <p className="text-gray-600">Recent build and deployment status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-50">
              <GitBranch className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Builds</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Succeeded</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.succeeded}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-red-50">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-yellow-50">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Builds */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Builds</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {builds.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {builds.map((build) => (
                <div key={build.id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start flex-1 min-w-0">
                      {getBuildStatusIcon(build.result, build.status)}
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {build.definition?.name || 'Unknown'}
                          </h4>
                          {build._links?.web?.href && (
                            <a
                              href={build._links.web.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Open in Azure DevOps"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          #{build.buildNumber}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                      {getBuildStatusBadge(build.result, build.status)}
                    </div>
                  </div>

                  {/* All content aligned with title - no indentation */}
                  <div className="ml-7">
                    {/* Compact Info Row */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span className="font-mono truncate max-w-32">
                          {build.sourceBranch?.replace('refs/heads/', '') || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-24">{build.requestedBy?.displayName || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        <span>{formatDuration(build.startTime, build.finishTime)}</span>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Started {build.startTime ? format(new Date(build.startTime), 'MMM d, HH:mm') : 'N/A'}</span>
                      </div>
                      {build.finishTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Finished {format(new Date(build.finishTime), 'MMM d, HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              No builds found
            </div>
          )}
        </div>
      </div>

      {/* Build Success Rate */}
      {builds.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Build Success Rate</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.total > 0 ? Math.round((stats.succeeded / stats.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: stats.total > 0 ? `${(stats.succeeded / stats.total) * 100}%` : '0%'
                }}
              ></div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">{stats.succeeded}</div>
                <div className="text-xs text-gray-600">Succeeded</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">{stats.failed}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">{stats.inProgress}</div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {builds.length === 0 && (
        <div className="card text-center py-12">
          <GitBranch className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Builds Found</h3>
          <p className="text-gray-600">
            No recent builds found. Check your Azure DevOps configuration or trigger a build.
          </p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadPipelinesData}
          className="btn btn-secondary"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  )
}
