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
  Activity,
  X
} from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import SkeletonCard, { SkeletonTable } from '../components/SkeletonCard'
import WorkItemDetailModal from '../components/WorkItemDetailModal'
import { useHealth } from '../contexts/HealthContext'
import { format, formatDistanceToNow } from 'date-fns'

export default function WorkItems() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState({
    sprintSummary: true,
    aiSummary: true,
    overdueItems: true
  })
  const [error, setError] = useState(null)
  const [sprintSummary, setSprintSummary] = useState(null)
  const [aiSummary, setAiSummary] = useState(null)
  const [overdueItems, setOverdueItems] = useState([])
  
  // Filtering and interaction state
  const [selectedState, setSelectedState] = useState('all')
  const [selectedAssignee, setSelectedAssignee] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredWorkItems, setFilteredWorkItems] = useState([])
  
  // Progressive disclosure for overdue items
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true)
  
  // Overdue items filtering
  const [overdueStateFilter, setOverdueStateFilter] = useState('all')
  const [overdueAssigneeFilter, setOverdueAssigneeFilter] = useState('all')
  const [overduePriorityFilter, setOverduePriorityFilter] = useState('all')
  const [filteredOverdueItems, setFilteredOverdueItems] = useState([])
  
  // Work item detail modal state
  const [selectedWorkItem, setSelectedWorkItem] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { checkConnection } = useHealth()

  useEffect(() => {
    loadWorkItemsData()
  }, [])

  const handleSync = async () => {
    await Promise.all([
      checkConnection(),
      loadWorkItemsData()
    ])
  }

  // Filter work items when selection changes
  useEffect(() => {
    if (sprintSummary?.workItemsByState) {
      let allWorkItems = []
      
      // Flatten work items from all states
      Object.entries(sprintSummary.workItemsByState).forEach(([state, items]) => {
        items.forEach(item => {
          allWorkItems.push({
            ...item,
            // Extract fields for easier access
            id: item.id,
            title: item.fields?.['System.Title'] || 'No title',
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
        aiSummary: true,
        overdueItems: true
      })

      // Phase 1: Load sprint summary first (fast, without AI)
      try {
        const sprintData = await apiService.getCurrentSprintSummary()
        setSprintSummary(sprintData)
        setLoadingStates(prev => ({ ...prev, sprintSummary: false }))
        setInitialLoading(false) // Show UI immediately after basic data loads
      } catch (err) {
        console.error('Failed to load sprint summary:', err)
        setLoadingStates(prev => ({ ...prev, sprintSummary: false }))
        setError('Failed to load sprint data')
      }

      // Phase 2: Load overdue items in parallel
      try {
        const overdueData = await apiService.getOverdueItems()
        setOverdueItems(overdueData.value || [])
        setLoadingStates(prev => ({ ...prev, overdueItems: false }))
      } catch (err) {
        console.error('Failed to load overdue items:', err)
        setLoadingStates(prev => ({ ...prev, overdueItems: false }))
      }

      // Phase 3: Load AI summary last (slowest)
      try {
        const aiData = await apiService.getAISummary()
        setAiSummary(aiData)
        setLoadingStates(prev => ({ ...prev, aiSummary: false }))
      } catch (err) {
        console.error('Failed to load AI summary:', err)
        setLoadingStates(prev => ({ ...prev, aiSummary: false }))
        setAiSummary({ 
          summary: 'AI summary temporarily unavailable. Please try refreshing the page.',
          status: 'error'
        })
      }

    } catch (err) {
      setError('Failed to load work items data')
      console.error('Work items error:', err)
      setInitialLoading(false)
      setLoadingStates({
        sprintSummary: false,
        aiSummary: false,
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

  const getAssigneeColor = (assignee) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700', 
      'bg-purple-100 text-purple-700',
      'bg-orange-100 text-orange-700',
      'bg-pink-100 text-pink-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700',
      'bg-rose-100 text-rose-700'
    ]
    const hash = assignee.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return colors[hash % colors.length]
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

  const toggleOverdueExpanded = () => {
    setIsOverdueExpanded(!isOverdueExpanded)
  }

  // Filter overdue items when filters change
  useEffect(() => {
    let filtered = overdueItems

    if (overdueStateFilter !== 'all') {
      filtered = filtered.filter(item => item.fields?.['System.State'] === overdueStateFilter)
    }

    if (overdueAssigneeFilter !== 'all') {
      filtered = filtered.filter(item => {
        const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned'
        return assignee === overdueAssigneeFilter
      })
    }

    if (overduePriorityFilter !== 'all') {
      filtered = filtered.filter(item => {
        const priority = item.fields?.['Microsoft.VSTS.Common.Priority']?.toString() || 'None'
        return priority === overduePriorityFilter
      })
    }

    setFilteredOverdueItems(filtered)
  }, [overdueItems, overdueStateFilter, overdueAssigneeFilter, overduePriorityFilter])

  // Modal handlers
  const openWorkItemModal = (workItem) => {
    setSelectedWorkItem(workItem)
    setIsModalOpen(true)
  }

  const closeWorkItemModal = () => {
    setSelectedWorkItem(null)
    setIsModalOpen(false)
  }

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    // When state filter changes, check if current assignee is still valid
    const availableAssignees = getOverdueAssignees()
    if (overdueAssigneeFilter !== 'all' && !availableAssignees.includes(overdueAssigneeFilter)) {
      setOverdueAssigneeFilter('all')
    }
  }, [overdueStateFilter])

  useEffect(() => {
    // When state or assignee filter changes, check if current priority is still valid
    const availablePriorities = getOverduePriorities()
    if (overduePriorityFilter !== 'all' && !availablePriorities.includes(overduePriorityFilter)) {
      setOverduePriorityFilter('all')
    }
  }, [overdueStateFilter, overdueAssigneeFilter])

  // Get unique values for overdue filters (dynamic based on previous selections)
  const getOverdueStates = () => {
    const states = [...new Set(overdueItems.map(item => item.fields?.['System.State']).filter(Boolean))]
    return states.sort()
  }

  const getOverdueAssignees = () => {
    // Filter items based on selected state first
    let filteredItems = overdueItems
    if (overdueStateFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.fields?.['System.State'] === overdueStateFilter)
    }
    
    const assignees = [...new Set(filteredItems.map(item => item.fields?.['System.AssignedTo']?.displayName || 'Unassigned'))]
    return assignees.sort()
  }

  const getOverduePriorities = () => {
    // Filter items based on selected state and assignee
    let filteredItems = overdueItems
    if (overdueStateFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.fields?.['System.State'] === overdueStateFilter)
    }
    if (overdueAssigneeFilter !== 'all') {
      filteredItems = filteredItems.filter(item => {
        const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned'
        return assignee === overdueAssigneeFilter
      })
    }
    
    const priorities = [...new Set(filteredItems.map(item => item.fields?.['Microsoft.VSTS.Common.Priority']?.toString() || 'None'))]
    return priorities.sort((a, b) => {
      const order = { '1': 0, '2': 1, '3': 2, '4': 3, 'None': 4 }
      return (order[a] || 5) - (order[b] || 5)
    })
  }

  // Get counts for filter options (dynamic based on previous selections)
  const getOverdueStateCount = (state) => {
    return overdueItems.filter(item => item.fields?.['System.State'] === state).length
  }

  const getOverdueAssigneeCount = (assignee) => {
    let filteredItems = overdueItems
    if (overdueStateFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.fields?.['System.State'] === overdueStateFilter)
    }
    return filteredItems.filter(item => 
      (item.fields?.['System.AssignedTo']?.displayName || 'Unassigned') === assignee
    ).length
  }

  const getOverduePriorityCount = (priority) => {
    let filteredItems = overdueItems
    if (overdueStateFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.fields?.['System.State'] === overdueStateFilter)
    }
    if (overdueAssigneeFilter !== 'all') {
      filteredItems = filteredItems.filter(item => {
        const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned'
        return assignee === overdueAssigneeFilter
      })
    }
    return filteredItems.filter(item => 
      (item.fields?.['Microsoft.VSTS.Common.Priority']?.toString() || 'None') === priority
    ).length
  }

  // Show error message if initial load failed
  if (error && initialLoading) {
    return <ErrorMessage message={error} onRetry={loadWorkItemsData} />
  }

  return (
    <div className="space-y-6">
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>
      
      {/* Header with Refresh Button - Always visible */}
      <div className="animate-slide-up">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Work Items</h1>
            <p className="text-gray-600 text-sm mt-0.5">Current sprint status and team workload</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={initialLoading || Object.values(loadingStates).some(loading => loading)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(initialLoading || Object.values(loadingStates).some(loading => loading)) ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Sprint Overview Cards - Dynamic Loading */}
      {loadingStates.sprintSummary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse" style={{animationDelay: `${index * 0.1}s`}}>
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  <div className="w-12 h-4 bg-gray-200 rounded-full"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded mb-0.5"></div>
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
        {loadingStates.sprintSummary ? (
          <>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    <div className="w-12 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded mb-0.5"></div>
                  <div className="w-20 h-3 bg-gray-200 rounded"></div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2"></div>
                </div>
              </div>
            ))}
          </>
        ) : sprintSummary && (
          <>
            {/* Total Items */}
            <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                  Sprint
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{sprintSummary.total || 0}</div>
                <div className="text-sm text-gray-600">Work Items</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{sprintSummary.total > 0 ? Math.round(((sprintSummary.completed || 0) / sprintSummary.total) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div 
                    className="progress-bar bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${sprintSummary.total > 0 ? ((sprintSummary.completed || 0) / sprintSummary.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Items */}
            <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-5 h-5 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{sprintSummary.active || 0}</div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="text-xs text-gray-500">
                {sprintSummary.total > 0 ? Math.round(((sprintSummary.active || 0) / sprintSummary.total) * 100) : 0}% of total items
              </div>
            </div>

            {/* Completed Items */}
            <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Done
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{sprintSummary.completed || 0}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-xs text-emerald-600 font-medium">
                ✓ {sprintSummary.total > 0 ? Math.round(((sprintSummary.completed || 0) / sprintSummary.total) * 100) : 0}% completion rate
              </div>
            </div>

            {/* Overdue Items */}
            <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                  Overdue
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{sprintSummary.overdue || 0}</div>
                <div className="text-sm text-gray-600">Past Due</div>
              </div>
              <div className="text-xs text-red-600">
                {(sprintSummary.overdue || 0) > 0 ? 'Needs attention' : 'All on track'}
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* Interactive State Distribution */}
      {sprintSummary?.workItemsByState && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-purple-600" />
              <h3 className="text-xl font-semibold text-gray-900">Work Distribution by State</h3>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">Click to filter</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(sprintSummary.workItemsByState).map(([state, items]) => (
              <button
                key={state}
                onClick={() => setSelectedState(selectedState === state ? 'all' : state)}
                className={`card-hover px-2.5 py-1.5 rounded-full border transition-all duration-200 flex items-center justify-between text-left hover:scale-105 ${
                  selectedState === state 
                    ? 'border-purple-200 bg-purple-50 ring-1 ring-purple-200 shadow-md' 
                    : 'border-gray-200 bg-gradient-to-r from-white to-gray-50 hover:border-purple-200 hover:shadow-lg'
                }`}
              >
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${getStateColor(state)}`}>
                  {state}
                </span>
                <div className="flex items-center gap-1.5 ml-1.5">
                  <span className="text-base font-bold text-gray-900">{items.length}</span>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-1 rounded-full flex items-center">
                    {Math.round((items.length / sprintSummary.total) * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          {selectedState !== 'all' && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">
                  Filtered by: {selectedState}
                </span>
                <button
                  onClick={() => setSelectedState('all')}
                  className="text-xs text-purple-600 hover:text-purple-800 underline"
                >
                  Clear filter
                </button>
              </div>
              <div className="text-xs text-purple-700">
                Showing {sprintSummary.workItemsByState[selectedState]?.length || 0} items
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Work Items with State and Assignee Filtering */}
      {sprintSummary && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">Work Items</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* State Filter Dropdown */}
              <div className="relative">
                <Activity className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="pl-8 pr-4 py-2 border border-gray-200 rounded-full text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white hover:border-gray-300 transition-colors"
                >
                  <option value="all">All States</option>
                  {sprintSummary.workItemsByState && Object.entries(sprintSummary.workItemsByState).map(([state, items]) => (
                    <option key={state} value={state}>
                      {state} ({items.length})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Assignee Filter Dropdown */}
              <div className="relative">
                <User className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="pl-8 pr-4 py-2 border border-gray-200 rounded-full text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white hover:border-gray-300 transition-colors"
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
                <Search className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-full text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 w-36 hover:border-gray-300 transition-colors"
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
                  className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-full transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(selectedState !== 'all' || selectedAssignee !== 'all') && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-sm text-gray-600">Filtered by:</span>
              {selectedState !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                  <Activity className="h-3 w-3" />
                  {selectedState}
                  <button
                    onClick={() => setSelectedState('all')}
                    className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedAssignee !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                  <User className="h-3 w-3" />
                  {selectedAssignee}
                  <button
                    onClick={() => setSelectedAssignee('all')}
                    className="hover:bg-emerald-100 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
          
          {/* Work Items List */}
          {filteredWorkItems.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredWorkItems.map((item, index) => (
                <div 
                  key={item.id} 
                  onClick={() => openWorkItemModal(item)}
                  className="card-hover bg-white border border-gray-200 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-200 group"
                  title="Click to view details"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        #{item.id}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStateColor(item.state)}`}>
                        {item.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 font-medium truncate">
                        {item.assignee}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">
                      {item.fields?.['System.WorkItemType'] || 'Work Item'}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                      Click to view →
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Scroll indicator */}
              {filteredWorkItems.length > 4 && (
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

      {/* AI Sprint Insights - Progressive Loading */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in" style={{animationDelay: '0.4s'}}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-900">AI Sprint Insights</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1.5 rounded-full font-medium border border-purple-200">
              ✨ Powered by AI
            </span>
            {loadingStates.aiSummary && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-200 border-t-purple-600"></div>
                <span className="text-xs text-purple-600 font-medium">Analyzing...</span>
              </div>
            )}
          </div>
        </div>
        
        {loadingStates.aiSummary ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-4/5"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-pulse w-3/5"></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 p-3 rounded-xl border border-purple-100">
              <div className="animate-pulse">🤖</div>
              <span>AI is analyzing your sprint data to provide actionable insights...</span>
            </div>
          </div>
        ) : aiSummary?.summary ? (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-100">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({children}) => (
                    <h2 className="text-base font-semibold text-gray-900 mb-3 mt-4 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({children}) => (
                    <h3 className="text-sm font-medium text-purple-900 mb-2 mt-3">
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
                    <em className="italic text-purple-800">
                      {children}
                    </em>
                  ),
                  code: ({children}) => (
                    <code className="bg-white text-purple-800 px-2 py-1 rounded text-xs font-mono border border-purple-200">
                      {children}
                  </code>
                )
              }}
            >
              {aiSummary.summary}
            </ReactMarkdown>
            
            {aiSummary.status === 'disabled_large_dataset' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Performance Mode</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  AI analysis is disabled for large datasets to maintain optimal performance.
                </p>
              </div>
            )}
          </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>AI insights unavailable</p>
            <button
              onClick={loadWorkItemsData}
              className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Overdue Items */}
      {loadingStates.overdueItems ? (
        <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm animate-fade-in" style={{animationDelay: '0.5s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div className="h-6 bg-amber-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="h-6 bg-amber-200 rounded-full w-32 animate-pulse"></div>
          </div>
          <SkeletonTable rows={3} />
        </div>
      ) : overdueItems.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm animate-fade-in" style={{animationDelay: '0.5s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-xl font-semibold text-amber-900">Critical: Overdue Items</h3>
              <button
                onClick={toggleOverdueExpanded}
                className="card-hover p-2 hover:bg-amber-50 rounded-lg transition-all duration-200"
                title={isOverdueExpanded ? "Collapse section" : "Expand section"}
              >
                {isOverdueExpanded ? (
                  <ChevronUp className="h-4 w-4 text-amber-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-600" />
                )}
              </button>
            </div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
              {filteredOverdueItems.length} of {overdueItems.length} items
            </span>
          </div>
          
          {isOverdueExpanded && (
            <>
              {/* Overdue Items Filters */}
              <div className="flex items-center gap-2 mb-6">
                {/* State Filter */}
                <div className="relative">
                  <Activity className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-amber-500" />
                  <select
                    value={overdueStateFilter}
                    onChange={(e) => setOverdueStateFilter(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-amber-200 rounded-full text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 bg-white hover:border-amber-300 transition-colors"
                  >
                    <option value="all">All States</option>
                    {getOverdueStates().map(state => (
                      <option key={state} value={state}>
                        {state} ({getOverdueStateCount(state)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee Filter */}
                <div className="relative">
                  <User className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-amber-500" />
                  <select
                    value={overdueAssigneeFilter}
                    onChange={(e) => setOverdueAssigneeFilter(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-amber-200 rounded-full text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 bg-white hover:border-amber-300 transition-colors"
                  >
                    <option value="all">All Assignees ({getOverdueAssignees().length})</option>
                    {getOverdueAssignees().map(assignee => (
                      <option key={assignee} value={assignee}>
                        {assignee} ({getOverdueAssigneeCount(assignee)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="relative">
                  <ArrowUp className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-amber-500" />
                  <select
                    value={overduePriorityFilter}
                    onChange={(e) => setOverduePriorityFilter(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-amber-200 rounded-full text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 bg-white hover:border-amber-300 transition-colors"
                  >
                    <option value="all">All Priorities ({getOverduePriorities().length})</option>
                    {getOverduePriorities().map(priority => {
                      const priorityText = priority === 'None' ? 'None' : getPriorityText(priority)
                      return (
                        <option key={priority} value={priority}>
                          {priorityText} ({getOverduePriorityCount(priority)})
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Clear Filters */}
                {(overdueStateFilter !== 'all' || overdueAssigneeFilter !== 'all' || overduePriorityFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setOverdueStateFilter('all')
                      setOverdueAssigneeFilter('all')
                      setOverduePriorityFilter('all')
                    }}
                    className="text-xs text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-full transition-colors font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Active Filters Display */}
              {(overdueStateFilter !== 'all' || overdueAssigneeFilter !== 'all' || overduePriorityFilter !== 'all') && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-red-700">Active filters:</span>
                  {overdueStateFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs">
                      State: {overdueStateFilter}
                      <button
                        onClick={() => setOverdueStateFilter('all')}
                        className="hover:bg-red-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {overdueAssigneeFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs">
                      Assignee: {overdueAssigneeFilter}
                      <button
                        onClick={() => setOverdueAssigneeFilter('all')}
                        className="hover:bg-red-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {overduePriorityFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs">
                      Priority: {getPriorityText(overduePriorityFilter)}
                      <button
                        onClick={() => setOverduePriorityFilter('all')}
                        className="hover:bg-red-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
              {/* Scrollable Overdue Items List */}
              <div className="overflow-y-auto border border-red-200 rounded-lg bg-white" style={{ maxHeight: '600px' }}>
                <div className="space-y-0">
                  {filteredOverdueItems.map((item, index) => {
                    const title = item.fields?.['System.Title'] || 'No title'
                    const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned'
                    const state = item.fields?.['System.State'] || 'Unknown'
                    const workItemType = item.fields?.['System.WorkItemType'] || 'Item'
                    const priority = item.fields?.['Microsoft.VSTS.Common.Priority']
                    const dueDate = item.fields?.['Microsoft.VSTS.Scheduling.DueDate']
                    const createdDate = item.fields?.['System.CreatedDate']
                    const description = item.fields?.['System.Description']

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => openWorkItemModal(item)}
                        className={`p-4 hover:bg-red-25 transition-colors border-red-200 cursor-pointer group ${
                          index !== filteredOverdueItems.length - 1 ? 'border-b' : ''
                        }`}
                        title="Click to view details"
                      >
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
                
                {/* Scroll indicator */}
                {filteredOverdueItems.length > 4 && (
                  <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent p-2 text-center">
                    <div className="text-xs text-red-600 flex items-center justify-center gap-1">
                      <ChevronDown className="h-3 w-3" />
                      Scroll to see more overdue items
                    </div>
                  </div>
                )}
              </div>

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

      {/* Work Item Detail Modal */}
      <WorkItemDetailModal
        workItem={selectedWorkItem}
        isOpen={isModalOpen}
        onClose={closeWorkItemModal}
      />
    </div>
  )
}
