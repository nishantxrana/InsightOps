import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { 
  CheckSquare, 
  Clock, 
  User, 
  AlertTriangle, 
  TrendingUp, 
  ExternalLink,
  Calendar,
  Target,
  BarChart3,
  Filter,
  Search,
  Bug,
  BookOpen,
  Star,
  FileText,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format, formatDistanceToNow } from 'date-fns'

export default function WorkItems() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sprintSummary, setSprintSummary] = useState(null)
  const [overdueItems, setOverdueItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedState, setSelectedState] = useState('all')
  const [selectedAssignee, setSelectedAssignee] = useState('all')
  
  // Progressive disclosure for overdue items
  const [visibleOverdueCount, setVisibleOverdueCount] = useState(5)
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true)

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

  // Helper function to construct work item URL
  const getWorkItemUrl = (item) => {
    // Use webUrl if available from backend (preferred)
    if (item.webUrl) {
      return item.webUrl
    }
    
    // Fallback: try to extract from API URL if available
    if (item.url) {
      // Azure DevOps API URL format: https://dev.azure.com/{org}/{project}/_apis/wit/workItems/{id}
      // Convert to web URL: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
      const apiUrl = item.url
      const match = apiUrl.match(/https:\/\/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_apis\/wit\/workItems\/(\d+)/)
      if (match) {
        const [, org, project, id] = match
        const encodedProject = encodeURIComponent(decodeURIComponent(project))
        return `https://dev.azure.com/${org}/${encodedProject}/_workitems/edit/${id}`
      }
    }
    
    // Last resort: construct with available info (may not work without org info)
    const project = item.fields?.['System.TeamProject'] || 'Unknown'
    const encodedProject = encodeURIComponent(project)
    return `#${item.id}` // Just show the ID if we can't construct a proper URL
  }

  const getWorkItemTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'bug':
        return <Bug className="h-4 w-4 text-red-500" />
      case 'user story':
        return <BookOpen className="h-4 w-4 text-blue-500" />
      case 'task':
        return <CheckSquare className="h-4 w-4 text-green-500" />
      case 'feature':
        return <Star className="h-4 w-4 text-purple-500" />
      case 'epic':
        return <Target className="h-4 w-4 text-orange-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority?.toString()) {
      case '1':
        return <ArrowUp className="h-4 w-4 text-red-600" />
      case '2':
        return <ArrowUp className="h-4 w-4 text-orange-500" />
      case '3':
        return <ArrowUp className="h-4 w-4 text-yellow-500" />
      case '4':
        return <ArrowUp className="h-4 w-4 text-blue-500" />
      default:
        return <ArrowUp className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityText = (priority) => {
    switch (priority?.toString()) {
      case '1': return 'Critical'
      case '2': return 'High'
      case '3': return 'Medium'
      case '4': return 'Low'
      default: return 'None'
    }
  }

  // Progressive disclosure functions for overdue items
  const visibleOverdueItems = overdueItems.slice(0, visibleOverdueCount)
  const hasMoreOverdueItems = visibleOverdueCount < overdueItems.length
  const remainingOverdueCount = overdueItems.length - visibleOverdueCount

  const showMoreOverdueItems = () => {
    setVisibleOverdueCount(prev => Math.min(prev + 5, overdueItems.length))
  }

  const showAllOverdueItems = () => {
    setVisibleOverdueCount(overdueItems.length)
  }

  const resetOverdueView = () => {
    setVisibleOverdueCount(5)
  }

  const toggleOverdueExpanded = () => {
    setIsOverdueExpanded(!isOverdueExpanded)
  }

  // Reset visible count when overdue items change
  useEffect(() => {
    setVisibleOverdueCount(5)
  }, [overdueItems.length])

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

      {/* Enhanced Sprint Summary Stats */}
      {sprintSummary && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="flex items-center justify-between">
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
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Sprint Progress</span>
                  <span>{Math.round(((sprintSummary.completed || 0) / (sprintSummary.total || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.round(((sprintSummary.completed || 0) / (sprintSummary.total || 1)) * 100)}%` }}
                  ></div>
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
              <p className="mt-2 text-xs text-gray-500">
                {sprintSummary.total > 0 ? Math.round(((sprintSummary.active || 0) / sprintSummary.total) * 100) : 0}% of total items
              </p>
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
              <p className="mt-2 text-xs text-green-600 font-medium">
                ✓ {sprintSummary.total > 0 ? Math.round(((sprintSummary.completed || 0) / sprintSummary.total) * 100) : 0}% completion rate
              </p>
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
              {overdueItems.length > 0 && (
                <p className="mt-2 text-xs text-red-600 font-medium">
                  ⚠️ Requires immediate attention
                </p>
              )}
            </div>
          </div>

          {/* Sprint Velocity & Burndown Info */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Sprint Velocity</h3>
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Planned</span>
                  <span className="text-sm font-medium text-gray-900">{sprintSummary.total || 0} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium text-green-600">{sprintSummary.completed || 0} items</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Remaining</span>
                  <span className="text-sm font-medium text-yellow-600">{(sprintSummary.total || 0) - (sprintSummary.completed || 0)} items</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Work Distribution</h3>
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <div className="space-y-3">
                {sprintSummary.workItemsByState && Object.entries(sprintSummary.workItemsByState).slice(0, 3).map(([state, items]) => (
                  <div key={state} className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStateColor(state)}`}>{state}</span>
                    <span className="text-sm font-medium text-gray-900">{items.length}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Team Load</h3>
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-3">
                {sprintSummary.workItemsByAssignee && Object.entries(sprintSummary.workItemsByAssignee).slice(0, 3).map(([assignee, items]) => (
                  <div key={assignee} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate max-w-24">{assignee}</span>
                    <span className="text-sm font-medium text-gray-900">{items.length} items</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sprint Summary with Professional Markdown Rendering */}
      {sprintSummary?.summary && (
        <div className="card">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h2: ({children}) => (
                  <h2 className="text-lg font-medium text-gray-900 mb-4 mt-6 first:mt-0 border-b border-gray-200 pb-2">
                    {children}
                  </h2>
                ),
                h3: ({children}) => (
                  <h3 className="text-base font-medium text-blue-900 mb-2 mt-4">
                    {children}
                  </h3>
                ),
                p: ({children}) => (
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed text-justify">
                    {children}
                  </p>
                ),
                ul: ({children}) => (
                  <ul className="list-disc list-inside text-sm text-gray-700 mb-4 ml-4 space-y-1 text-justify">
                    {children}
                  </ul>
                ),
                li: ({children}) => (
                  <li className="mb-1 text-sm text-gray-700 text-justify">
                    {children}
                  </li>
                ),
                strong: ({children}) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),
                em: ({children}) => (
                  <em className="italic text-gray-800">
                    {children}
                  </em>
                )
              }}
            >
              {sprintSummary.summary}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Enhanced Overdue Items */}
      {overdueItems.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-medium text-red-900">Critical: Overdue Items</h3>
              <button
                onClick={toggleOverdueExpanded}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title={isOverdueExpanded ? "Collapse section" : "Expand section"}
              >
                {isOverdueExpanded ? (
                  <ChevronUp className="h-4 w-4 text-red-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-red-600" />
                )}
              </button>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              {overdueItems.length} items need attention
            </span>
          </div>
          
          {isOverdueExpanded && (
            <>
              {/* Overdue Items List */}
              <div className="space-y-4">
                {visibleOverdueItems.map((item) => {
                  const title = item.fields?.['System.Title'] || 'No title'
                  const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned'
                  const state = item.fields?.['System.State'] || 'Unknown'
                  const workItemType = item.fields?.['System.WorkItemType'] || 'Item'
                  const priority = item.fields?.['Microsoft.VSTS.Common.Priority']
                  const dueDate = item.fields?.['Microsoft.VSTS.Scheduling.DueDate']
                  const createdDate = item.fields?.['System.CreatedDate']
                  const description = item.fields?.['System.Description']

                  return (
                    <div key={item.id} className="bg-white border border-red-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getWorkItemTypeIcon(workItemType)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">#{item.id}</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStateColor(state)}`}>
                                {state}
                              </span>
                              {priority && (
                                <div className="flex items-center gap-1">
                                  {getPriorityIcon(priority)}
                                  <span className="text-xs text-gray-600">{getPriorityText(priority)}</span>
                                </div>
                              )}
                            </div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
                          </div>
                        </div>
                        {(() => {
                          const workItemUrl = getWorkItemUrl(item)
                          const isValidUrl = workItemUrl.startsWith('http')
                          
                          return isValidUrl ? (
                            <a 
                              href={workItemUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Open in Azure DevOps"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400" title="Work Item URL not available">
                              <ExternalLink className="h-4 w-4" />
                            </span>
                          )
                        })()}
                      </div>

                      {description && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-700 max-h-16 overflow-hidden">
                          {description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className={assignee === 'Unassigned' ? 'text-red-600 font-medium' : ''}>{assignee}</span>
                          </div>
                          {createdDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created {formatDistanceToNow(new Date(createdDate), { addSuffix: true })}</span>
                            </div>
                          )}
                        </div>
                        {dueDate && (
                          <div className="flex items-center gap-1 text-red-600 font-medium">
                            <Clock className="h-3 w-3" />
                            <span>Due: {format(new Date(dueDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Progressive Disclosure Controls */}
              {hasMoreOverdueItems && (
                <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-red-200">
                  <div className="text-sm text-red-700">
                    Showing {visibleOverdueCount} of {overdueItems.length} items
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={showMoreOverdueItems}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 hover:text-red-800 transition-colors"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Show Next 5
                    </button>
                    <button
                      onClick={showAllOverdueItems}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Show All
                    </button>
                  </div>
                </div>
              )}

              {/* Show "Show Less" option when viewing more than 5 items */}
              {visibleOverdueCount > 5 && !hasMoreOverdueItems && (
                <div className="flex items-center justify-center mt-6 pt-4 border-t border-red-200">
                  <button
                    onClick={resetOverdueView}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 hover:text-red-800 transition-colors"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Show Less (Back to top 5)
                  </button>
                </div>
              )}

              {/* Action Required Notice */}
              <div className="mt-4 p-3 bg-red-100 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Action Required:</strong> These items are past their due date and may impact sprint goals. 
                  Consider reassigning, updating priorities, or extending deadlines.
                </p>
              </div>
            </>
          )}
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
