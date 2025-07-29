import React, { useState, useEffect } from 'react'
import { GitBranch, CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format } from 'date-fns'

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
      return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
    }
    
    switch (result) {
      case 'succeeded':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'canceled':
        return <XCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getBuildStatusBadge = (result, status) => {
    if (status === 'inProgress') {
      return 'badge bg-blue-100 text-blue-800'
    }
    
    switch (result) {
      case 'succeeded':
        return 'badge badge-success'
      case 'failed':
        return 'badge badge-error'
      case 'canceled':
        return 'badge bg-gray-100 text-gray-800'
      default:
        return 'badge bg-gray-100 text-gray-800'
    }
  }

  const formatDuration = (startTime, finishTime) => {
    if (!startTime) return 'N/A'
    
    const start = new Date(startTime)
    const end = finishTime ? new Date(finishTime) : new Date()
    const durationMs = end - start
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Build
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {builds.length > 0 ? (
                builds.map((build) => (
                  <tr key={build.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getBuildStatusIcon(build.result, build.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {build.definition?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{build.buildNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getBuildStatusBadge(build.result, build.status)}>
                        {build.status === 'inProgress' ? 'In Progress' : (build.result || 'Unknown')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {build.sourceBranch?.replace('refs/heads/', '') || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {build.requestedBy?.displayName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(build.startTime, build.finishTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {build.startTime ? format(new Date(build.startTime), 'MMM dd, HH:mm') : 'N/A'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No builds found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
