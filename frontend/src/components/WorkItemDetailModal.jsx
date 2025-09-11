import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  ExternalLink, 
  Copy, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Circle,
  ArrowUp,
  ArrowDown,
  Minus,
  Bot,
  Loader2,
  CheckSquare,
  Bug,
  Lightbulb,
  Target
} from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { apiService } from '../api/apiService'

const WorkItemDetailModal = ({ workItem, isOpen, onClose }) => {
  const [aiExplanation, setAiExplanation] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [copied, setCopied] = useState(false)

  // Get work item details
  const title = workItem?.fields?.['System.Title'] || 'No title'
  const description = workItem?.fields?.['System.Description'] || ''
  const state = workItem?.fields?.['System.State'] || 'Unknown'
  const assignee = workItem?.fields?.['System.AssignedTo']?.displayName || 'Unassigned'
  const workItemType = workItem?.fields?.['System.WorkItemType'] || 'Item'
  const priority = workItem?.fields?.['Microsoft.VSTS.Common.Priority']
  const dueDate = workItem?.fields?.['Microsoft.VSTS.Scheduling.DueDate']
  const createdDate = workItem?.fields?.['System.CreatedDate']
  const tags = workItem?.fields?.['System.Tags'] || ''

  // Get work item type icon
  const getWorkItemTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'bug':
        return <Bug className="h-5 w-5 text-red-500 dark:text-red-400" />
      case 'user story':
      case 'story':
        return <Lightbulb className="h-5 w-5 text-blue-500 dark:text-blue-400" />
      case 'task':
        return <CheckSquare className="h-5 w-5 text-green-500 dark:text-green-400" />
      case 'feature':
        return <Target className="h-5 w-5 text-purple-500 dark:text-purple-400" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  // Get priority icon
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 1:
        return <ArrowUp className="h-4 w-4 text-red-500 dark:text-red-400" />
      case 2:
        return <ArrowUp className="h-4 w-4 text-orange-500 dark:text-orange-400" />
      case 3:
        return <Minus className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
      case 4:
        return <ArrowDown className="h-4 w-4 text-blue-500 dark:text-blue-400" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Get priority text
  const getPriorityText = (priority) => {
    switch (priority?.toString()) {
      case '1': return 'Critical'
      case '2': return 'High'
      case '3': return 'Medium'
      case '4': return 'Low'
      default: return 'None'
    }
  }

  // Get state color
  const getStateColor = (state) => {
    switch (state?.toLowerCase()) {
      case 'new':
      case 'to do':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200'
      case 'active':
      case 'in progress':
        return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200'
      case 'resolved':
      case 'done':
      case 'closed':
        return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200'
      case 'removed':
        return 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200'
      case 'blocked':
        return 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  // Get work item URL
  const getWorkItemUrl = (item) => {
    if (!item?.url) return '#'
    
    try {
      // Convert API URL to web URL
      const apiUrl = item.url
      const match = apiUrl.match(/https:\/\/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_apis\/wit\/workItems\/(\d+)/)
      
      if (match) {
        const [, org, project, id] = match
        return `https://dev.azure.com/${org}/${project}/_workitems/edit/${id}`
      }
      
      return apiUrl
    } catch (error) {
      console.error('Error constructing work item URL:', error)
      return '#'
    }
  }

  // Load AI explanation
  const loadAIExplanation = async () => {
    if (!workItem || loadingAI) return
    
    setLoadingAI(true)
    try {
      // Call AI service to explain the work item
      const response = await apiService.explainWorkItem(workItem.id)
      setAiExplanation(response.explanation)
    } catch (error) {
      console.error('Failed to load AI explanation:', error)
      setAiExplanation('AI explanation temporarily unavailable. Please try again later.')
    } finally {
      setLoadingAI(false)
    }
  }

  // Copy work item link
  const copyLink = async () => {
    try {
      const url = getWorkItemUrl(workItem)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && workItem) {
      setAiExplanation(null)
      setLoadingAI(false)
      setCopied(false)
    }
  }, [isOpen, workItem])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen || !workItem) return null

  const modalContent = (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card dark:bg-[#111111] rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border dark:border-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            {getWorkItemTypeIcon(workItemType)}
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Work Item #{workItem.id}
              </h2>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStateColor(state)}`}>
                {state}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Copy link"
            >
              {copied ? (
                <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
              ) : (
                <Copy className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <a
              href={getWorkItemUrl(workItem)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Open in Azure DevOps"
            >
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span className={assignee === 'Unassigned' ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{assignee}</span>
                </div>
                
                {priority && (
                  <div className="flex items-center gap-1">
                    {getPriorityIcon(priority)}
                    <span>{getPriorityText(priority)}</span>
                  </div>
                )}
                
                {createdDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Created {format(new Date(createdDate), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                
                {dueDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className={new Date(dueDate) < new Date() ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                      Due {format(new Date(dueDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {tags && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.split(';').filter(tag => tag.trim()).map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* AI Explanation Section */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">AI Explanation</h4>
                </div>
                {!aiExplanation && !loadingAI && (
                  <button
                    onClick={loadAIExplanation}
                    className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    🤖 Explain This Item
                  </button>
                )}
              </div>
              
              {loadingAI && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is analyzing this work item...</span>
                </div>
              )}
              
              {aiExplanation && (
                <div className="prose prose-sm max-w-none text-blue-800 dark:text-blue-200 prose-strong:text-blue-900 dark:prose-strong:text-blue-100">
                  <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                </div>
              )}
              
              {!aiExplanation && !loadingAI && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Click "Explain This Item" to get AI-powered insights about this work item.
                </p>
              )}
            </div>

            {/* Description */}
            {description && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Description</h4>
                <div 
                  className="prose prose-sm max-w-none text-muted-foreground bg-muted rounded-lg p-4"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default WorkItemDetailModal
