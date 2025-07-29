import React, { useState, useEffect } from 'react'
import { CheckSquare, Clock, User, AlertTriangle, TrendingUp } from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format } from 'date-fns'

export default function WorkItems() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sprintSummary, setSprintSummary] = useState(null)
  const [overdueItems, setOverdueItems] = useState([])

  useEffect(() => {
    loadWorkItemsData()
  }, [])

  const loadWorkItemsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [sprintData, overdueData] = await Promise.allSettled([
        apiService.getCurrentSprintSummary(),
        apiService.getOverdueItems()
      ])

      if (sprintData.status === 'fulfilled') {
        setSprintSummary(sprintData.value)
      }

      if (overdueData.status === 'fulfilled') {
        setOverdueItems(overdueData.value.value || [])
      }

    } catch (err) {
      setError('Failed to load work items data')
      console.error('Work items error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStateColor = (state) => {
    switch (state?.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'active':
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkItemTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'bug':
        return '🐛'
      case 'user story':
        return '📖'
      case 'task':
        return '✅'
      case 'feature':
        return '⭐'
      default:
        return '📋'
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadWorkItemsData} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Work Items</h2>
        <p className="text-gray-600">Current sprint status and overdue items</p>
      </div>

      {/* Sprint Summary Stats */}
      {sprintSummary && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-blue-50">
                <CheckSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">{sprintSummary.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-yellow-50">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-semibold text-gray-900">{sprintSummary.active || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckSquare className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{sprintSummary.completed || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">{overdueItems.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Summary */}
      {sprintSummary?.summary && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sprint Summary</h3>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-sm text-gray-700">
              {sprintSummary.summary}
            </div>
          </div>
        </div>
      )}

      {/* Overdue Items */}
      {overdueItems.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Overdue Items</h3>
            <span className="badge badge-error">{overdueItems.length} items</span>
          </div>
          <div className="space-y-4">
            {overdueItems.map((item) => {
              const title = item.fields?.['System.Title'] || 'No title'
              const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned'
              const state = item.fields?.['System.State'] || 'Unknown'
              const workItemType = item.fields?.['System.WorkItemType'] || 'Item'
              const dueDate = item.fields?.['Microsoft.VSTS.Scheduling.DueDate']

              return (
                <div key={item.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getWorkItemTypeIcon(workItemType)}</span>
                        <span className="font-medium text-gray-900">#{item.id}</span>
                        <span className={`badge ${getStateColor(state)}`}>{state}</span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{assignee}</span>
                        </div>
                        {dueDate && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Due: {format(new Date(dueDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Work Items by State */}
      {sprintSummary?.workItemsByState && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Items by State</h3>
          <div className="space-y-3">
            {Object.entries(sprintSummary.workItemsByState).map(([state, items]) => (
              <div key={state} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`badge ${getStateColor(state)}`}>{state}</span>
                  <span className="text-sm text-gray-600">{items.length} items</span>
                </div>
                <div className="text-sm text-gray-500">
                  {items.map(item => `#${item.id}`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Items by Assignee */}
      {sprintSummary?.workItemsByAssignee && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Items by Assignee</h3>
          <div className="space-y-3">
            {Object.entries(sprintSummary.workItemsByAssignee).map(([assignee, items]) => (
              <div key={assignee} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{assignee}</span>
                  <span className="text-sm text-gray-600">{items.length} items</span>
                </div>
                <div className="text-sm text-gray-500">
                  {items.map(item => `#${item.id}`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!sprintSummary && overdueItems.length === 0 && (
        <div className="card text-center py-12">
          <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Items Found</h3>
          <p className="text-gray-600">
            No work items found in the current sprint. Check your Azure DevOps configuration.
          </p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadWorkItemsData}
          className="btn btn-secondary"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  )
}
