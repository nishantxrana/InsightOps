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
  Eye,
  RefreshCw,
  Users,
  Activity
} from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import SkeletonCard, { SkeletonTable } from '../components/SkeletonCard'
import { format, formatDistanceToNow } from 'date-fns'

export default function WorkItems() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState({
    sprintSummary: true,
    overdueItems: true
  })
  const [error, setError] = useState(null)
  const [sprintSummary, setSprintSummary] = useState(null)
  const [overdueItems, setOverdueItems] = useState([])
  
  // Filtering and interaction state
  const [selectedState, setSelectedState] = useState('all')
  const [selectedAssignee, setSelectedAssignee] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredWorkItems, setFilteredWorkItems] = useState([])
  
  // Progressive disclosure for overdue items
  const [visibleOverdueCount, setVisibleOverdueCount] = useState(5)
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true)

  useEffect(() => {
    loadWorkItemsData()
  }, [])

  // Filter work items when selection changes
  useEffect(() => {
    if (sprintSummary?.workItemsByState) {
      let allWorkItems = []
      
      // Flatten work items from all states
      Object.entries(sprintSummary.workItemsByState).forEach(([state, items]) => {
        items.forEach(item => {
          allWorkItems.push({
            ...item,
            state: state,
            assignee: getAssigneeForWorkItem(item.id)
          })
        })
      })
      
      // Apply filters
      let filtered = allWorkItems
      
      if (selectedState !== 'all') {
        filtered = filtered.filter(item => item.state === selectedState)
      }
      
      if (selectedAssignee !== 'all') {
        filtered = filtered.filter(item => item.assignee === selectedAssignee)
      }
      
      if (searchTerm) {
        filtered = filtered.filter(item => 
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id.toString().includes(searchTerm)
        )
      }
      
      setFilteredWorkItems(filtered)
    }
  }, [sprintSummary, selectedState, selectedAssignee, searchTerm])

  const loadWorkItemsData = async () => {
    try {
      setInitialLoading(true)
      setError(null)
      setLoadingStates({
        sprintSummary: true,
        overdueItems: true
      })

      // Phase 1: Load sprint summary first (most important data)
      try {
        const sprintData = await apiService.getCurrentSprintSummary()
        setSprintSummary(sprintData)
        setLoadingStates(prev => ({ ...prev, sprintSummary: false }))
        setInitialLoading(false) // Show UI immediately after sprint data loads
      } catch (err) {
        console.error('Failed to load sprint summary:', err)
        setLoadingStates(prev => ({ ...prev, sprintSummary: false }))
      }

      // Phase 2: Load overdue items in background
      try {
        const overdueData = await apiService.getOverdueItems()
        setOverdueItems(overdueData.value || [])
        setLoadingStates(prev => ({ ...prev, overdueItems: false }))
      } catch (err) {
        console.error('Failed to load overdue items:', err)
        setLoadingStates(prev => ({ ...prev, overdueItems: false }))
      }

    } catch (err) {
      setError('Failed to load work items data')
      console.error('Work items error:', err)
      setInitialLoading(false)
      setLoadingStates({
        sprintSummary: false,
        overdueItems: false
      })
    }
  }

  // Helper function to get assignee for a work item
  const getAssigneeForWorkItem = (workItemId) => {
    if (!sprintSummary?.workItemsByAssignee) return 'Unassigned'
    
    for (const [assignee, items] of Object.entries(sprintSummary.workItemsByAssignee)) {
      if (items.some(item => item.id === workItemId)) {
        return assignee
      }
    }
    return 'Unassigned'
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

  // Only show full loading spinner on initial load with error
  if (initialLoading && error) {
    return <LoadingSpinner />
  }

  if (error && initialLoading) {
    return <ErrorMessage message={error} onRetry={loadWorkItemsData} />
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Work Items</h2>
          <p className="text-gray-600">Current sprint status and team workload</p>
        </div>
        <button
          onClick={loadWorkItemsData}
          disabled={initialLoading || Object.values(loadingStates).some(loading => loading)}
          className="group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 border-0 rounded-xl hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300"
        >
          <RefreshCw className={`h-4 w-4 transition-all duration-300 ${(initialLoading || Object.values(loadingStates).some(loading => loading)) ? 'animate-spin text-blue-500' : 'group-hover:text-blue-500 group-hover:rotate-180'}`} />
          <span className="font-medium">{(initialLoading || Object.values(loadingStates).some(loading => loading)) ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Sprint Overview Cards */}
      {loadingStates.sprintSummary ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : sprintSummary && (
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
      )}

      {/* Interactive State Distribution */}
      {sprintSummary?.workItemsByState && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Work Distribution by State</h3>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Click to filter</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {Object.entries(sprintSummary.workItemsByState).map(([state, items]) => (
              <button
                key={state}
                onClick={() => setSelectedState(selectedState === state ? 'all' : state)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedState === state 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStateColor(state)}`}>
                    {state}
                  </span>
                  <span className="text-lg font-semibold text-gray-900">{items.length}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round((items.length / sprintSummary.total) * 100)}% of total
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                    style={{ width: `${(items.length / sprintSummary.total) * 100}%` }}
                  ></div>
                </div>
              </button>
            ))}
          </div>
          
          {selectedState !== 'all' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Filtered by: {selectedState}
                </span>
                <button
                  onClick={() => setSelectedState('all')}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear filter
                </button>
              </div>
              <div className="text-xs text-blue-700">
                Showing {sprintSummary.workItemsByState[selectedState]?.length || 0} items
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Work Items with State and Assignee Filtering */}
      {sprintSummary && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Work Items</h3>
            <div className="flex items-center gap-3">
              {/* State Filter Dropdown */}
              <div className="relative">
                <Activity className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="pl-7 pr-6 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white min-w-0"
                >
                  <option value="all">All States ({Object.keys(sprintSummary.workItemsByState || {}).length})</option>
                  {sprintSummary.workItemsByState && Object.entries(sprintSummary.workItemsByState).map(([state, items]) => (
                    <option key={state} value={state}>
                      {state} ({items.length})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Assignee Filter Dropdown */}
              <div className="relative">
                <User className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="pl-7 pr-6 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white min-w-0"
                >
                  <option value="all">All Assignees ({Object.keys(sprintSummary.workItemsByAssignee || {}).length})</option>
                  {sprintSummary.workItemsByAssignee && Object.entries(sprintSummary.workItemsByAssignee).map(([assignee, items]) => (
                    <option key={assignee} value={assignee}>
                      {assignee} ({items.length})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent w-32"
                />
              </div>
              
              {/* Clear Filters */}
              {(selectedState !== 'all' || selectedAssignee !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedState('all')
                    setSelectedAssignee('all')
                    setSearchTerm('')
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(selectedState !== 'all' || selectedAssignee !== 'all') && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {selectedState !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  State: {selectedState}
                  <button
                    onClick={() => setSelectedState('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedAssignee !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Assignee: {selectedAssignee}
                  <button
                    onClick={() => setSelectedAssignee('all')}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
          
          {/* Work Items List */}
          {filteredWorkItems.length > 0 ? (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <div className="space-y-0">
                {filteredWorkItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 hover:bg-gray-100 transition-colors border-gray-200 ${
                      index !== filteredWorkItems.length - 1 ? 'border-b' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="font-mono text-sm text-gray-600 font-medium">#{item.id}</span>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getStateColor(item.state)}`}>
                        {item.state}
                      </span>
                      <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {item.assignee.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">{item.assignee}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Scroll indicator */}
              {filteredWorkItems.length > 6 && (
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent p-2 text-center">
                  <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <ChevronDown className="h-3 w-3" />
                    Scroll to see more items
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No work items match the current filters</p>
              <button
                onClick={() => {
                  setSelectedState('all')
                  setSelectedAssignee('all')
                  setSearchTerm('')
                }}
                className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Clear filters to see all items
              </button>
            </div>
          )}
          
          {/* Results Summary */}
          {filteredWorkItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredWorkItems.length} of {sprintSummary.total} work items
                </span>
                {(selectedState !== 'all' || selectedAssignee !== 'all' || searchTerm) && (
                  <span className="text-blue-600">
                    Filtered results
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Sprint Insights */}
      {sprintSummary?.summary && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">AI Sprint Insights</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Powered by AI
            </span>
          </div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h2: ({children}) => (
                  <h2 className="text-base font-semibold text-gray-900 mb-3 mt-4 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({children}) => (
                  <h3 className="text-sm font-medium text-blue-900 mb-2 mt-3">
                    {children}
                  </h3>
                ),
                p: ({children}) => (
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({children}) => (
                  <ul className="list-disc list-inside text-sm text-gray-700 mb-4 ml-2 space-y-1">
                    {children}
                  </ul>
                ),
                li: ({children}) => (
                  <li className="mb-1 text-sm text-gray-700">
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
                ),
                code: ({children}) => (
                  <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                )
              }}
            >
              {sprintSummary.summary}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Enhanced Overdue Items */}
      {loadingStates.overdueItems ? (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div className="h-6 bg-red-300 rounded w-48 animate-pulse"></div>
            </div>
            <div className="h-6 bg-red-300 rounded w-32 animate-pulse"></div>
          </div>
          <SkeletonTable rows={3} />
        </div>
      ) : overdueItems.length > 0 && (
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
    </div>
  )
}
