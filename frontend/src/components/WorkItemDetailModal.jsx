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
        return 'bg-muted text-blue-600 dark:text-blue-400'
      case 'active':
      case 'in progress':
        return 'bg-muted text-amber-600 dark:text-amber-400'
      case 'resolved':
      case 'done':
      case 'closed':
        return 'bg-muted text-emerald-600 dark:text-emerald-400'
      case 'removed':
        return 'bg-muted text-red-600 dark:text-red-400'
      case 'blocked':
        return 'bg-muted text-red-600 dark:text-red-400'
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
    } catch {
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
      const message = error.userMessage || 'AI explanation temporarily unavailable.'
      setAiExplanation(message)
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
    } catch {
      // Clipboard API may not be available in some contexts
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

  // Check for urgency
  const isOverdue = dueDate && new Date(dueDate) < new Date()
  const isCritical = priority === 1
  const isHighPriority = priority === 1 || priority === 2
  const needsAttention = isOverdue || isCritical || assignee === 'Unassigned'

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card dark:bg-[#111111] rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-border dark:border-[#1a1a1a] flex flex-col">
        {/* Urgency Banner (if applicable) */}
        {needsAttention && (
          <div className={`px-6 py-2 flex items-center gap-2 text-sm font-medium border-b ${
            isOverdue 
              ? 'bg-muted text-red-600 dark:text-red-400 border-red-200 dark:border-red-900' 
              : isCritical 
                ? 'bg-muted text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900'
                : 'bg-muted text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900'
          }`}>
            <AlertTriangle className={`h-4 w-4 ${isOverdue ? 'text-red-500' : isCritical ? 'text-orange-500' : 'text-amber-500'}`} />
            {isOverdue && 'Overdue'}
            {!isOverdue && isCritical && 'Critical Priority'}
            {!isOverdue && !isCritical && assignee === 'Unassigned' && 'Needs Assignment'}
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getWorkItemTypeIcon(workItemType)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground font-mono">#{workItem.id}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{workItemType}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStateColor(state)}`}>
                  {state}
                </span>
                {isHighPriority && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted ${
                    priority === 1 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {getPriorityIcon(priority)}
                    {getPriorityText(priority)}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground truncate" title={title}>
                {title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
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
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Key Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Assignee */}
              <div className={`p-3 rounded-lg bg-muted ${assignee === 'Unassigned' ? 'border border-amber-400 dark:border-amber-700' : ''}`}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  Assignee
                </div>
                <p className={`font-medium text-sm truncate ${assignee === 'Unassigned' ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                  {assignee}
                </p>
              </div>
              
              {/* Priority */}
              <div className={`p-3 rounded-lg bg-muted ${isHighPriority ? 'border border-red-400 dark:border-red-700' : ''}`}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  {getPriorityIcon(priority)}
                  Priority
                </div>
                <p className={`font-medium text-sm ${isHighPriority ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}>
                  {getPriorityText(priority)}
                </p>
              </div>
              
              {/* Created */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Created
                </div>
                <p className="font-medium text-sm text-foreground">
                  {createdDate ? format(new Date(createdDate), 'MMM dd, yyyy') : 'Unknown'}
                </p>
              </div>
              
              {/* Due Date */}
              <div className={`p-3 rounded-lg bg-muted ${isOverdue ? 'border border-red-400 dark:border-red-700' : ''}`}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Due Date
                </div>
                <p className={`font-medium text-sm ${isOverdue ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}>
                  {dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : 'Not set'}
                  {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                </p>
              </div>
            </div>

            {/* Tags */}
            {tags && (
              <div className="flex flex-wrap gap-2">
                {tags.split(';').filter(tag => tag.trim()).map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground border border-border">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* AI Explanation Section - Collapsible */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer bg-muted rounded-lg p-4 border border-border hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-foreground">AI Insights</span>
                  <span className="text-xs text-muted-foreground">
                    {aiExplanation ? '(loaded)' : '(click to expand)'}
                  </span>
                </div>
                <svg className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              
              <div className="mt-2 bg-muted rounded-lg p-4 border border-border">
                {loadingAI && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is analyzing this work item...</span>
                  </div>
                )}
                
                {aiExplanation && (
                  <div className="prose prose-sm max-w-none text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                  </div>
                )}
                
                {!aiExplanation && !loadingAI && (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Get AI-powered insights: summary, complexity, and suggested next steps.
                    </p>
                    <button
                      onClick={loadAIExplanation}
                      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                    >
                      <Bot className="h-4 w-4" />
                      Generate AI Insights
                    </button>
                  </div>
                )}
              </div>
            </details>

            {/* Description */}
            <div>
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                Description
                {!description && <span className="text-xs text-muted-foreground font-normal">(none provided)</span>}
              </h4>
              {description ? (
                <div 
                  className="prose prose-sm max-w-none bg-muted/50 rounded-lg p-4 border border-border [&_*]:!text-foreground/80 [&_h1]:!text-foreground [&_h2]:!text-foreground [&_h3]:!text-foreground [&_h4]:!text-foreground [&_h5]:!text-foreground [&_h6]:!text-foreground [&_strong]:!text-foreground"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              ) : (
                <div className="bg-muted/50 rounded-lg p-4 border border-border text-center">
                  <p className="text-sm text-muted-foreground">No description provided for this work item.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with primary CTA */}
        <div className="flex items-center justify-between p-4 border-t border-border dark:border-[#1a1a1a] bg-muted/30">
          <div className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px]">Esc</kbd> to close
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={getWorkItemUrl(workItem)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in Azure DevOps
            </a>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default WorkItemDetailModal
