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
import { ScrollArea } from "@/components/ui/scroll-area"
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
  
  // Dropdown states for custom dropdowns
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false)
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false)
  const [isOverdueStateDropdownOpen, setIsOverdueStateDropdownOpen] = useState(false)
  const [isOverdueAssigneeDropdownOpen, setIsOverdueAssigneeDropdownOpen] = useState(false)
  const [isOverduePriorityDropdownOpen, setIsOverduePriorityDropdownOpen] = useState(false)
  
  const { checkConnection } = useHealth()

  useEffect(() => {
    loadWorkItemsData()
  }, [])

  // Close dropdowns when clicking outside or opening another dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setIsStateDropdownOpen(false)
        setIsAssigneeDropdownOpen(false)
        setIsOverdueStateDropdownOpen(false)
        setIsOverdueAssigneeDropdownOpen(false)
        setIsOverduePriorityDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
      'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300',
      'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300', 
      'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300',
      'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300',
      'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300',
      'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300',
      'bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300',
      'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
    ]
    const hash = assignee.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const getStateColor = (state) => {
    switch (state?.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200'
      case 'active':
      case 'in progress':
        return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200'
      case 'resolved':
      case 'done':
        return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200'
      case 'closed':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-muted text-muted-foreground'
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
        return <Bug className="h-4 w-4 text-red-500 dark:text-red-400" />
      case 'user story':
        return <BookOpen className="h-4 w-4 text-blue-500 dark:text-blue-400" />
      case 'task':
        return <CheckSquare className="h-4 w-4 text-green-500 dark:text-green-400" />
      case 'feature':
        return <Star className="h-4 w-4 text-purple-500 dark:text-purple-400" />
      case 'epic':
        return <Target className="h-4 w-4 text-orange-500 dark:text-orange-400" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority?.toString()) {
      case '1':
        return <ArrowUp className="h-4 w-4 text-red-600 dark:text-red-400" />
      case '2':
        return <ArrowUp className="h-4 w-4 text-orange-500 dark:text-orange-400" />
      case '3':
        return <ArrowUp className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
      case '4':
        return <ArrowUp className="h-4 w-4 text-blue-500 dark:text-blue-400" />
      default:
        return <ArrowUp className="h-4 w-4 text-muted-foreground" />
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
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .shimmer {
          background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%);
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
          background: hsl(var(--muted-foreground) / 0.4);
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.7);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground) / 0.4) transparent;
        }
      `}</style>
      
      {/* Header with Refresh Button - Always visible */}
      <div className="animate-slide-up">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Work Items</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Current sprint status and team workload</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={initialLoading || Object.values(loadingStates).some(loading => loading)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 disabled:opacity-60 transition-all duration-200"
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
            <div key={index} className="bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-pulse" style={{animationDelay: `${index * 0.1}s`}}>
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-5 h-5 shimmer rounded"></div>
                  <div className="w-12 h-4 shimmer rounded-full"></div>
                </div>
                <div className="w-8 h-8 shimmer rounded mb-0.5"></div>
                <div className="w-20 h-3 shimmer rounded"></div>
                <div className="w-full h-1.5 shimmer rounded-full mt-2"></div>
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
            <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Sprint
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{sprintSummary.total || 0}</div>
                <div className="text-sm text-muted-foreground">Work Items</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">{sprintSummary.total > 0 ? Math.round(((sprintSummary.completed || 0) / sprintSummary.total) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className="progress-bar bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${sprintSummary.total > 0 ? ((sprintSummary.completed || 0) / sprintSummary.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Items */}
            <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/50 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{sprintSummary.active || 0}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {sprintSummary.total > 0 ? Math.round(((sprintSummary.active || 0) / sprintSummary.total) * 100) : 0}% of total items
              </div>
            </div>

            {/* Completed Items */}
            <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  Done
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{sprintSummary.completed || 0}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-xs text-emerald-600 font-medium">
                 {sprintSummary.total > 0 ? Math.round(((sprintSummary.completed || 0) / sprintSummary.total) * 100) : 0}% completion rate
              </div>
            </div>

            {/* Overdue Items */}
            <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full">
                  Overdue
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-foreground mb-0.5">{sprintSummary.overdue || 0}</div>
                <div className="text-sm text-muted-foreground">Past Due</div>
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                {(sprintSummary.overdue || 0) > 0 ? 'Needs attention' : 'All on track'}
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* Enhanced Work Items with State and Assignee Filtering - Show skeleton while loading */}
      {loadingStates.sprintSummary ? (
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 shimmer rounded animate-pulse"></div>
              <div className="h-6 shimmer rounded w-24 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 shimmer rounded w-20 animate-pulse"></div>
              <div className="h-8 shimmer rounded w-24 animate-pulse"></div>
            </div>
          </div>
          
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-muted p-4 rounded-xl animate-pulse"
                style={{animationDelay: `${0.4 + index * 0.1}s`}}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 shimmer rounded"></div>
                    <div className="h-5 shimmer rounded w-48"></div>
                  </div>
                  <div className="h-5 shimmer rounded-full w-16"></div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="h-4 shimmer rounded w-20"></div>
                  <div className="h-4 shimmer rounded w-16"></div>
                  <div className="h-4 shimmer rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        sprintSummary && (
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-semibold text-foreground">Work Items</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* State Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsStateDropdownOpen(!isStateDropdownOpen)
                    setIsAssigneeDropdownOpen(false)
                    setIsOverdueStateDropdownOpen(false)
                    setIsOverdueAssigneeDropdownOpen(false)
                    setIsOverduePriorityDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-1 focus:ring-muted focus:border-border bg-card dark:bg-[#111111] hover:border-muted-foreground transition-all cursor-pointer shadow-sm hover:shadow-sm min-w-[100px]"
                >
                  <Activity className="h-3 w-3 absolute left-2.5 text-muted-foreground" />
                  <span className="flex-1 text-left text-foreground">
                    {selectedState === 'all' ? 'All States' : selectedState}
                  </span>
                  <svg className={`h-3 w-3 text-muted-foreground transition-transform ${isStateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isStateDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                    <button
                      onClick={() => {
                        setSelectedState('all');
                        setIsStateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                        selectedState === 'all' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                      }`}
                    >
                      All States
                    </button>
                    {sprintSummary.workItemsByState && Object.entries(sprintSummary.workItemsByState).map(([state, items]) => (
                      <button
                        key={state}
                        onClick={() => {
                          setSelectedState(state);
                          setIsStateDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                          selectedState === state ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                        }`}
                      >
                        {state} ({items.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Assignee Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)
                    setIsStateDropdownOpen(false)
                    setIsOverdueStateDropdownOpen(false)
                    setIsOverdueAssigneeDropdownOpen(false)
                    setIsOverduePriorityDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-1 focus:ring-muted focus:border-border bg-card dark:bg-[#111111] hover:border-muted-foreground transition-all cursor-pointer shadow-sm hover:shadow-sm min-w-[120px]"
                >
                  <User className="h-3 w-3 absolute left-2.5 text-muted-foreground" />
                  <span className="flex-1 text-left text-foreground">
                    {selectedAssignee === 'all' ? 'All Assignees' : selectedAssignee}
                  </span>
                  <svg className={`h-3 w-3 text-muted-foreground transition-transform ${isAssigneeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isAssigneeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                    <button
                      onClick={() => {
                        setSelectedAssignee('all');
                        setIsAssigneeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                        selectedAssignee === 'all' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                      }`}
                    >
                      All Assignees ({Object.keys(sprintSummary.workItemsByAssignee || {}).length})
                    </button>
                    {sprintSummary.workItemsByAssignee && Object.entries(sprintSummary.workItemsByAssignee).map(([assignee, items]) => (
                      <button
                        key={assignee}
                        onClick={() => {
                          setSelectedAssignee(assignee);
                          setIsAssigneeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                          selectedAssignee === assignee ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                        }`}
                      >
                        {assignee} ({items.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 dark:focus:border-blue-600 w-36 hover:border-muted-foreground transition-colors bg-card dark:bg-[#111111] text-foreground placeholder:text-muted-foreground"
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
                  className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-full transition-colors"
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
            <ScrollArea className="h-[40vh] border border-border dark:border-[#1a1a1a] rounded-xl bg-card dark:bg-[#111111]">
              <div className="divide-y divide-border dark:divide-[#1a1a1a]">
                {filteredWorkItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    onClick={() => openWorkItemModal(item)}
                    className="px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    title="Click to view details"
                  >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        #{item.id}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStateColor(item.state)}`}>
                        {item.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground font-medium truncate">
                        {item.assignee}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">
                      {item.fields?.['System.WorkItemType'] || 'Work Item'}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                      Click to view →
                    </span>
                  </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
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
        )
      )}

      {/* AI Sprint Insights - Progressive Loading */}
      <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in" style={{animationDelay: '0.4s'}}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-semibold text-foreground">AI Sprint Insights</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-gradient-to-r from-purple-100 dark:from-purple-950/50 to-blue-100 dark:to-blue-950/50 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full font-medium border border-purple-200 dark:border-purple-800">
              ✨ Powered by AI
            </span>
            {loadingStates.aiSummary && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Analyzing...</span>
              </div>
            )}
          </div>
        </div>
        
        {loadingStates.aiSummary ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="h-4 bg-gradient-to-r from-muted via-muted-foreground/20 to-muted rounded animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-muted via-muted-foreground/20 to-muted rounded animate-pulse w-4/5"></div>
              <div className="h-4 bg-gradient-to-r from-muted via-muted-foreground/20 to-muted rounded animate-pulse w-3/5"></div>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 p-3 rounded-xl border border-purple-100 dark:border-purple-800">
              <div className="animate-pulse">🤖</div>
              <span>AI is analyzing your sprint data to provide actionable insights...</span>
            </div>
          </div>
        ) : aiSummary?.summary ? (
          <div className="bg-gradient-to-br from-purple-50 dark:from-purple-950/30 to-blue-50 dark:to-blue-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({children}) => (
                    <h2 className="text-base font-semibold text-foreground mb-3 mt-4 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({children}) => (
                    <h3 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2 mt-3">
                      {children}
                    </h3>
                  ),
                  p: ({children}) => (
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({children}) => (
                    <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 ml-2 space-y-1">
                      {children}
                    </ul>
                  ),
                  li: ({children}) => (
                    <li className="mb-1 text-sm text-muted-foreground">
                      {children}
                    </li>
                  ),
                  strong: ({children}) => (
                    <strong className="font-semibold text-foreground">
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
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Performance Mode</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  AI analysis is disabled for large datasets to maintain optimal performance.
                </p>
              </div>
            )}
          </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>AI insights unavailable</p>
            <button
              onClick={loadWorkItemsData}
              className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Overdue Items */}
      {loadingStates.overdueItems ? (
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in" style={{animationDelay: '0.5s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div className="h-6 bg-amber-200 dark:bg-amber-800/50 rounded w-48 animate-pulse"></div>
            </div>
            <div className="h-6 bg-amber-200 dark:bg-amber-800/50 rounded-full w-32 animate-pulse"></div>
          </div>
          <SkeletonTable rows={3} />
        </div>
      ) : overdueItems.length > 0 && (
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in" style={{animationDelay: '0.5s'}}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xl font-semibold text-foreground">Critical: Overdue Items</h3>
              <button
                onClick={toggleOverdueExpanded}
                className="card-hover p-2 hover:bg-muted rounded-lg transition-all duration-200"
                title={isOverdueExpanded ? "Collapse section" : "Expand section"}
              >
                {isOverdueExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-foreground border border-border">
              {filteredOverdueItems.length} of {overdueItems.length} items
            </span>
          </div>
          
          {isOverdueExpanded && (
            <>
              {/* Overdue Items Filters */}
              <div className="flex items-center gap-2 mb-6">
                {/* State Filter */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsOverdueStateDropdownOpen(!isOverdueStateDropdownOpen)
                      setIsOverdueAssigneeDropdownOpen(false)
                      setIsOverduePriorityDropdownOpen(false)
                      setIsStateDropdownOpen(false)
                      setIsAssigneeDropdownOpen(false)
                    }}
                    className="flex items-center gap-2 pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-1 focus:ring-muted focus:border-border bg-card dark:bg-[#111111] hover:border-muted-foreground transition-all cursor-pointer shadow-sm hover:shadow-sm min-w-[100px]"
                  >
                    <Activity className="h-3 w-3 absolute left-2.5 text-muted-foreground" />
                    <span className="flex-1 text-left text-foreground">
                      {overdueStateFilter === 'all' ? 'All States' : overdueStateFilter}
                    </span>
                    <svg className={`h-3 w-3 text-muted-foreground transition-transform ${isOverdueStateDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isOverdueStateDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                      <button
                        onClick={() => {
                          setOverdueStateFilter('all');
                          setIsOverdueStateDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                          overdueStateFilter === 'all' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                        }`}
                      >
                        All States
                      </button>
                      {getOverdueStates().map(state => (
                        <button
                          key={state}
                          onClick={() => {
                            setOverdueStateFilter(state);
                            setIsOverdueStateDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                            overdueStateFilter === state ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                          }`}
                        >
                          {state} ({getOverdueStateCount(state)})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignee Filter */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsOverdueAssigneeDropdownOpen(!isOverdueAssigneeDropdownOpen)
                      setIsOverdueStateDropdownOpen(false)
                      setIsOverduePriorityDropdownOpen(false)
                      setIsStateDropdownOpen(false)
                      setIsAssigneeDropdownOpen(false)
                    }}
                    className="flex items-center gap-2 pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-1 focus:ring-muted focus:border-border bg-card dark:bg-[#111111] hover:border-muted-foreground transition-all cursor-pointer shadow-sm hover:shadow-sm min-w-[120px]"
                  >
                    <User className="h-3 w-3 absolute left-2.5 text-muted-foreground" />
                    <span className="flex-1 text-left text-foreground">
                      {overdueAssigneeFilter === 'all' ? 'All Assignees' : overdueAssigneeFilter}
                    </span>
                    <svg className={`h-3 w-3 text-muted-foreground transition-transform ${isOverdueAssigneeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isOverdueAssigneeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                      <button
                        onClick={() => {
                          setOverdueAssigneeFilter('all');
                          setIsOverdueAssigneeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                          overdueAssigneeFilter === 'all' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                        }`}
                      >
                        All Assignees ({getOverdueAssignees().length})
                      </button>
                      {getOverdueAssignees().map(assignee => (
                        <button
                          key={assignee}
                          onClick={() => {
                            setOverdueAssigneeFilter(assignee);
                            setIsOverdueAssigneeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                            overdueAssigneeFilter === assignee ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                          }`}
                        >
                          {assignee} ({getOverdueAssigneeCount(assignee)})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority Filter */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsOverduePriorityDropdownOpen(!isOverduePriorityDropdownOpen)
                      setIsOverdueStateDropdownOpen(false)
                      setIsOverdueAssigneeDropdownOpen(false)
                      setIsStateDropdownOpen(false)
                      setIsAssigneeDropdownOpen(false)
                    }}
                    className="flex items-center gap-2 pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-1 focus:ring-muted focus:border-border bg-card dark:bg-[#111111] hover:border-muted-foreground transition-all cursor-pointer shadow-sm hover:shadow-sm min-w-[110px]"
                  >
                    <ArrowUp className="h-3 w-3 absolute left-2.5 text-muted-foreground" />
                    <span className="flex-1 text-left text-foreground">
                      {overduePriorityFilter === 'all' ? 'All Priorities' : 
                       overduePriorityFilter === 'None' ? 'None' : getPriorityText(overduePriorityFilter)}
                    </span>
                    <svg className={`h-3 w-3 text-muted-foreground transition-transform ${isOverduePriorityDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isOverduePriorityDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-lg shadow-lg z-50 py-1 min-w-[150px]">
                      <button
                        onClick={() => {
                          setOverduePriorityFilter('all');
                          setIsOverduePriorityDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                          overduePriorityFilter === 'all' ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                        }`}
                      >
                        All Priorities ({getOverduePriorities().length})
                      </button>
                      {getOverduePriorities().map(priority => {
                        const priorityText = priority === 'None' ? 'None' : getPriorityText(priority)
                        return (
                          <button
                            key={priority}
                            onClick={() => {
                              setOverduePriorityFilter(priority);
                              setIsOverduePriorityDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                              overduePriorityFilter === priority ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
                            }`}
                          >
                            {priorityText} ({getOverduePriorityCount(priority)})
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                {(overdueStateFilter !== 'all' || overdueAssigneeFilter !== 'all' || overduePriorityFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setOverdueStateFilter('all')
                      setOverdueAssigneeFilter('all')
                      setOverduePriorityFilter('all')
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-full transition-colors font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Active Filters Display */}
              {(overdueStateFilter !== 'all' || overdueAssigneeFilter !== 'all' || overduePriorityFilter !== 'all') && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-muted-foreground">Active filters:</span>
                  {overdueStateFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-full text-xs">
                      State: {overdueStateFilter}
                      <button
                        onClick={() => setOverdueStateFilter('all')}
                        className="hover:bg-muted/80 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {overdueAssigneeFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-full text-xs">
                      Assignee: {overdueAssigneeFilter}
                      <button
                        onClick={() => setOverdueAssigneeFilter('all')}
                        className="hover:bg-muted/80 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {overduePriorityFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded-full text-xs">
                      Priority: {getPriorityText(overduePriorityFilter)}
                      <button
                        onClick={() => setOverduePriorityFilter('all')}
                        className="hover:bg-muted/80 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
              {/* Scrollable Overdue Items List */}
              <ScrollArea className="h-[600px] border border-border dark:border-[#1a1a1a] rounded-lg bg-card dark:bg-[#111111]">
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
                        className={`p-4 hover:bg-muted/50 transition-colors border-border dark:border-[#1a1a1a] cursor-pointer group ${
                          index !== filteredOverdueItems.length - 1 ? 'border-b' : ''
                        }`}
                        title="Click to view details"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getWorkItemTypeIcon(workItemType)}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-foreground">#{item.id}</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStateColor(state)}`}>
                                  {state}
                                </span>
                                {priority && (
                                  <div className="flex items-center gap-1">
                                    {getPriorityIcon(priority)}
                                    <span className="text-xs text-muted-foreground">{getPriorityText(priority)}</span>
                                  </div>
                                )}
                              </div>
                              <h4 className="text-sm font-medium text-foreground mb-2">{title}</h4>
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
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                                title="Open in Azure DevOps"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground" title="Work Item URL not available">
                                <ExternalLink className="h-4 w-4" />
                              </span>
                            )
                          })()}
                        </div>

                        {description && (
                          <div className="mb-3 p-2 bg-muted rounded text-xs text-muted-foreground max-h-16 overflow-hidden">
                            {description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className={assignee === 'Unassigned' ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>{assignee}</span>
                            </div>
                            {createdDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Created {formatDistanceToNow(new Date(createdDate), { addSuffix: true })}</span>
                              </div>
                            )}
                          </div>
                          {dueDate && (
                            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
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
                  <div className="sticky bottom-0 bg-gradient-to-t from-card dark:from-[#111111] via-card dark:via-[#111111] to-transparent p-2 text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <ChevronDown className="h-3 w-3" />
                      Scroll to see more overdue items
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Action Required Notice */}
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
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
