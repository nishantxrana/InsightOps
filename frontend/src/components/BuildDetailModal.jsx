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
  Building
} from 'lucide-react'
import { format } from 'date-fns'
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
        color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200',
        icon: <Clock className="h-4 w-4" />
      }
    }
    
    switch (result?.toLowerCase()) {
      case 'succeeded':
        return {
          color: 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200',
          icon: <CheckCircle className="h-4 w-4" />
        }
      case 'failed':
        return {
          color: 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200',
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
      console.error('Failed to load AI analysis:', error)
      setAiAnalysis('AI analysis temporarily unavailable. Please try again later.')
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
    } catch (error) {
      console.error('Failed to copy link:', error)
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
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Building className="h-6 w-6 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {definition} #{buildNumber}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.icon}
                  <span className="ml-1">{result || status}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              title="Copy build link"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            
            <a
              href={getBuildUrl(build)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              title="Open in Azure DevOps"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Build Metadata */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Build Details</h3>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{requestedBy}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {sourceBranch}
                  </span>
                </div>
                
                {startTime && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Started {format(new Date(startTime), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}

                {finishTime && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Finished {format(new Date(finishTime), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Reason: {reason}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis Section */}
            {result === 'failed' && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">AI Build Analysis</h4>
                  </div>
                  {!aiAnalysis && !loadingAI && (
                    <button
                      onClick={loadAIAnalysis}
                      className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      🤖 Analyze Build
                    </button>
                  )}
                </div>
                
                {loadingAI && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is analyzing build logs and timeline...</span>
                  </div>
                )}
                
                {aiAnalysis && (
                  <div className="prose prose-sm max-w-none text-blue-800 dark:text-blue-200 prose-strong:text-blue-900 dark:prose-strong:text-blue-100 prose-code:text-blue-900 dark:prose-code:text-blue-100 prose-code:bg-blue-100 dark:prose-code:bg-blue-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                )}
                
                {!aiAnalysis && !loadingAI && (
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Click "Analyze Build" to get AI-powered insights about build failures, timeline analysis, and suggested fixes.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default BuildDetailModal
