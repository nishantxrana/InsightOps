import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  ExternalLink, 
  Copy, 
  User, 
  Calendar, 
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Loader2,
  FileText,
  Building,
  AlertTriangle,
  Timer
} from 'lucide-react'
import { format, formatDistanceToNow, differenceInMinutes, differenceInSeconds } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { apiService } from '../api/apiService'

const BuildDetailModal = ({ build, isOpen, onClose }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [copied, setCopied] = useState(false)

  // Get build details
  const buildNumber = build?.buildNumber || 'Unknown'
  const definition = build?.definition?.name || 'Unknown Pipeline'
  const status = build?.status || 'Unknown'
  const result = build?.result || 'Unknown'
  const requestedBy = build?.requestedBy?.displayName || 'Unknown'
  const sourceBranch = build?.sourceBranch?.replace('refs/heads/', '') || 'Unknown'
  const startTime = build?.startTime
  const finishTime = build?.finishTime
  const reason = build?.reason || 'Unknown'

  // Get status color and icon
  const getStatusInfo = (status, result) => {
    if (status === 'inProgress') {
      return {
        color: 'bg-muted text-blue-600 dark:text-blue-400',
        icon: <Clock className="h-4 w-4" />
      }
    }
    
    switch (result?.toLowerCase()) {
      case 'succeeded':
        return {
          color: 'bg-muted text-emerald-600 dark:text-emerald-400',
          icon: <CheckCircle className="h-4 w-4" />
        }
      case 'failed':
        return {
          color: 'bg-muted text-red-600 dark:text-red-400',
          icon: <XCircle className="h-4 w-4" />
        }
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-950/50 text-gray-800 dark:text-gray-200',
          icon: <Building className="h-4 w-4" />
        }
    }
  }

  const statusInfo = getStatusInfo(status, result)
  const isFailed = result?.toLowerCase() === 'failed'
  const isInProgress = status === 'inProgress'
  const isSucceeded = result?.toLowerCase() === 'succeeded'

  // Calculate duration
  const getDuration = () => {
    if (!startTime) return null
    const end = finishTime ? new Date(finishTime) : new Date()
    const start = new Date(startTime)
    const mins = differenceInMinutes(end, start)
    const secs = differenceInSeconds(end, start) % 60
    
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }
  
  const duration = getDuration()

  // Get build URL
  const getBuildUrl = (build) => {
    return build?._links?.web?.href || '#'
  }

  // Load AI analysis
  const loadAIAnalysis = async () => {
    if (!build || loadingAI) return
    
    setLoadingAI(true)
    try {
      const response = await apiService.analyzeBuild(build.id)
      setAiAnalysis(response.analysis)
    } catch (error) {
      const message = error.userMessage || 'AI analysis temporarily unavailable.'
      setAiAnalysis(message)
    } finally {
      setLoadingAI(false)
    }
  }

  // Copy build link
  const copyLink = async () => {
    try {
      const url = getBuildUrl(build)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may not be available in some contexts
    }
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && build) {
      setAiAnalysis(null)
      setLoadingAI(false)
      setCopied(false)
    }
  }, [isOpen, build])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.body.style.overflow = 'unset'
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  if (!isOpen || !build) return null

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Failure Banner */}
        {isFailed && (
          <div className="px-6 py-3 bg-muted border-b border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
            <span className="font-medium text-red-600 dark:text-red-400">Build Failed</span>
            <span className="text-sm text-muted-foreground">— Review logs and AI analysis below</span>
          </div>
        )}
        
        {/* Success Banner */}
        {isSucceeded && (
          <div className="px-6 py-2 bg-emerald-100 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium text-sm">Build Succeeded</span>
          </div>
        )}
        
        {/* In Progress Banner */}
        {isInProgress && (
          <div className="px-6 py-2 bg-muted border-b border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="font-medium text-sm text-blue-600 dark:text-blue-400">Build In Progress</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted">
              {isFailed ? (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : isSucceeded ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Building className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground font-mono">#{buildNumber}</span>
                <span className="text-muted-foreground">•</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {result || status}
                </span>
                {duration && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {duration}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground truncate" title={definition}>
                {definition}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={copyLink}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              title="Copy build link"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Build Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Triggered By */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  Triggered By
                </div>
                <p className="font-medium text-sm text-foreground truncate" title={requestedBy}>
                  {requestedBy}
                </p>
              </div>
              
              {/* Branch */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <GitBranch className="h-3.5 w-3.5" />
                  Branch
                </div>
                <p className="font-mono text-sm text-foreground truncate" title={sourceBranch}>
                  {sourceBranch}
                </p>
              </div>
              
              {/* Started */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Started
                </div>
                <p className="font-medium text-sm text-foreground">
                  {startTime ? formatDistanceToNow(new Date(startTime), { addSuffix: true }) : 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {startTime ? format(new Date(startTime), 'HH:mm') : ''}
                </p>
              </div>
              
              {/* Duration / Reason */}
              <div className={`p-3 rounded-lg bg-muted ${isFailed ? 'border border-red-400 dark:border-red-700' : ''}`}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  {duration ? <Timer className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  {duration ? 'Duration' : 'Trigger'}
                </div>
                <p className={`font-medium text-sm ${isFailed ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}>
                  {duration || reason}
                </p>
              </div>
            </div>

            {/* AI Analysis Section - For Failed Builds */}
            {isFailed && (
              <details className="group" open>
                <summary className="flex items-center justify-between cursor-pointer bg-muted rounded-lg p-4 border border-border hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium text-foreground">AI Failure Analysis</span>
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {aiAnalysis ? '(loaded)' : '— find root cause faster'}
                    </span>
                  </div>
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                
                <div className="mt-2 bg-muted rounded-lg p-4 border border-border">
                  {loadingAI && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is analyzing build logs and timeline...</span>
                    </div>
                  )}
                  
                  {aiAnalysis && (
                    <div className="prose prose-sm max-w-none text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                      <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                  )}
                  
                  {!aiAnalysis && !loadingAI && (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        Get AI-powered root cause analysis, error explanations, and suggested fixes.
                      </p>
                      <button
                        onClick={loadAIAnalysis}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                      >
                        <Bot className="h-4 w-4" />
                        Analyze Failure
                      </button>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            {/* Build Trigger Info */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Trigger:</span> {reason}
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
              href={getBuildUrl(build)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm rounded-lg transition-colors inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              {isFailed ? 'View Logs in Azure DevOps' : 'Open in Azure DevOps'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default BuildDetailModal
