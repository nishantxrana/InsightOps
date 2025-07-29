import React, { useState, useEffect } from 'react'
import { GitPullRequest, User, Clock, GitBranch, MessageSquare, Eye } from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format, formatDistanceToNow } from 'date-fns'

export default function PullRequests() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pullRequests, setPullRequests] = useState([])
  const [idlePRs, setIdlePRs] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    idle: 0
  })

  useEffect(() => {
    loadPullRequestsData()
  }, [])

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
          active: prsList.filter(pr => pr.status === 'active').length,
          completed: prsList.filter(pr => pr.status === 'completed').length,
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
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'badge bg-blue-100 text-blue-800'
      case 'completed':
        return 'badge badge-success'
      case 'abandoned':
        return 'badge bg-gray-100 text-gray-800'
      default:
        return 'badge bg-gray-100 text-gray-800'
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pull Requests</h2>
        <p className="text-gray-600">Active pull requests and review status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-50">
              <GitPullRequest className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total PRs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-50">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-50">
              <GitPullRequest className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-yellow-50">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Idle (48h+)</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.idle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Idle Pull Requests Alert */}
      {idlePRs.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
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

      {/* Pull Requests Table */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Pull Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pull Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branches
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviewers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pullRequests.length > 0 ? (
                pullRequests.map((pr) => (
                  <tr key={pr.pullRequestId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        {getStatusIcon(pr.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            #{pr.pullRequestId}: {pr.title}
                          </div>
                          {pr.description && (
                            <div className="text-sm text-gray-500 mt-1 max-w-md truncate">
                              {pr.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(pr.status)}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <GitBranch className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-mono text-xs">
                          {pr.sourceRefName?.replace('refs/heads/', '')} → {pr.targetRefName?.replace('refs/heads/', '')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {pr.createdBy?.displayName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {pr.reviewers && pr.reviewers.length > 0 ? (
                          pr.reviewers.slice(0, 3).map((reviewer, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                            >
                              {reviewer.displayName}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No reviewers</span>
                        )}
                        {pr.reviewers && pr.reviewers.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{pr.reviewers.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getLastActivityTime(pr)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No pull requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
        <div className="card text-center py-12">
          <GitPullRequest className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pull Requests Found</h3>
          <p className="text-gray-600">
            No pull requests found. Check your Azure DevOps configuration or create a pull request.
          </p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadPullRequestsData}
          className="btn btn-secondary"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  )
}
