import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  ExternalLink, 
  Copy, 
  User, 
  Calendar, 
  GitBranch,
  GitPullRequest,
  GitMerge,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Loader2,
  Eye,
  FileText,
  AlertTriangle,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { apiService } from '../api/apiService'

const PullRequestDetailModal = ({ pullRequest, isOpen, onClose }) => {
  const [aiExplanation, setAiExplanation] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [copied, setCopied] = useState(false)

  // Get PR details
  const title = pullRequest?.title || 'No title'
  const description = pullRequest?.description || ''
  const status = pullRequest?.status || 'Unknown'
  const createdBy = pullRequest?.createdBy?.displayName || 'Unknown'
  const sourceBranch = pullRequest?.sourceRefName?.replace('refs/heads/', '') || 'Unknown'
  const targetBranch = pullRequest?.targetRefName?.replace('refs/heads/', '') || 'Unknown'
  const creationDate = pullRequest?.creationDate
  const reviewers = pullRequest?.reviewers || []
  const mergeStatus = pullRequest?.mergeStatus || 'unknown'
  
  // Compute merge readiness
  const isActive = status?.toLowerCase() === 'active'
  const isCompleted = status?.toLowerCase() === 'completed'
  const isAbandoned = status?.toLowerCase() === 'abandoned'
  const hasConflicts = mergeStatus?.toLowerCase() === 'conflicts'
  
  // Analyze reviewers
  const approvedReviewers = reviewers.filter(r => r.vote > 0)
  const rejectedReviewers = reviewers.filter(r => r.vote < 0)
  const waitingReviewers = reviewers.filter(r => r.vote === 0 || r.vote === undefined)
  const hasNoReviewers = reviewers.length === 0
  
  // Merge readiness logic
  const isReadyToMerge = isActive && approvedReviewers.length > 0 && rejectedReviewers.length === 0 && !hasConflicts
  const isBlocked = hasConflicts || rejectedReviewers.length > 0
  const needsReview = isActive && hasNoReviewers

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-muted text-blue-600 dark:text-blue-400'
      case 'completed':
        return 'bg-muted text-emerald-600 dark:text-emerald-400'
      case 'abandoned':
        return 'bg-muted text-red-600 dark:text-red-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }
  
  // Get reviewer vote status
  const getVoteInfo = (vote) => {
    if (vote > 0) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
        label: 'Approved',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
      }
    } else if (vote < 0) {
      return {
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        label: vote === -10 ? 'Rejected' : 'Needs work',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-muted border-red-300 dark:border-red-700'
      }
    }
    return {
      icon: <Clock className="h-4 w-4 text-amber-500" />,
      label: 'Waiting',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-muted border-amber-300 dark:border-amber-700'
    }
  }

  // Get change type icon and color
  // Get PR URL
  const getPRUrl = (pr) => {
    return pr?.webUrl || pr?.url || '#'
  }

  // Load AI explanation
  const loadAIExplanation = async () => {
    if (!pullRequest || loadingAI) return
    
    setLoadingAI(true)
    try {
      const response = await apiService.explainPullRequest(pullRequest.pullRequestId)
      setAiExplanation(response.explanation)
    } catch (error) {
      const message = error.userMessage || 'AI explanation temporarily unavailable.'
      setAiExplanation(message)
    } finally {
      setLoadingAI(false)
    }
  }

  // Copy PR link
  const copyLink = async () => {
    try {
      const url = getPRUrl(pullRequest)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may not be available in some contexts
    }
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && pullRequest) {
      setAiExplanation(null)
      setLoadingAI(false)
      setCopied(false)
    }
  }, [isOpen, pullRequest])

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

  if (!isOpen || !pullRequest) return null

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card dark:bg-[#111111] rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-border dark:border-[#1a1a1a]">
        {/* Merge Readiness Banner */}
        {isActive && isReadyToMerge && (
          <div className="px-6 py-2 bg-emerald-100 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <GitMerge className="h-4 w-4" />
            <span className="font-medium text-sm">Ready to Merge</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-300">— {approvedReviewers.length} approval{approvedReviewers.length > 1 ? 's' : ''}, no blockers</span>
          </div>
        )}
        
        {isActive && hasConflicts && (
          <div className="px-6 py-3 bg-muted border-b border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
            <span className="font-medium text-red-600 dark:text-red-400">Merge Conflicts</span>
            <span className="text-sm text-muted-foreground">— Resolve conflicts before merging</span>
          </div>
        )}
        
        {isActive && rejectedReviewers.length > 0 && !hasConflicts && (
          <div className="px-6 py-3 bg-muted border-b border-red-200 dark:border-red-800 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="font-medium text-red-600 dark:text-red-400">Changes Requested</span>
            <span className="text-sm text-muted-foreground">— {rejectedReviewers.length} reviewer{rejectedReviewers.length > 1 ? 's' : ''} requested changes</span>
          </div>
        )}
        
        {isActive && needsReview && (
          <div className="px-6 py-3 bg-muted border-b border-orange-200 dark:border-orange-800 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-orange-500 animate-pulse" />
            <span className="font-medium text-orange-600 dark:text-orange-400">Needs Reviewers</span>
            <span className="text-sm text-muted-foreground">— Assign reviewers to proceed</span>
          </div>
        )}
        
        {isActive && waitingReviewers.length > 0 && !needsReview && !isReadyToMerge && !isBlocked && (
          <div className="px-6 py-2 bg-muted border-b border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-sm text-amber-600 dark:text-amber-400">Waiting for Review</span>
            <span className="text-xs text-muted-foreground">— {waitingReviewers.length} reviewer{waitingReviewers.length > 1 ? 's' : ''} pending</span>
          </div>
        )}
        
        {isCompleted && (
          <div className="px-6 py-2 bg-emerald-100 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium text-sm">Merged</span>
          </div>
        )}
        
        {isAbandoned && (
          <div className="px-6 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <X className="h-4 w-4" />
            <span className="font-medium text-sm">Abandoned</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-muted">
              {isBlocked ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : isReadyToMerge || isCompleted ? (
                <GitMerge className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <GitPullRequest className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground font-mono">#{pullRequest.pullRequestId}</span>
                <span className="text-muted-foreground">•</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                  {status}
                </span>
                {reviewers.length > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {approvedReviewers.length > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">✓{approvedReviewers.length}</span>
                      )}
                      {waitingReviewers.length > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">⏳{waitingReviewers.length}</span>
                      )}
                      {rejectedReviewers.length > 0 && (
                        <span className="text-red-600 dark:text-red-400">✗{rejectedReviewers.length}</span>
                      )}
                    </span>
                  </>
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
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {/* Author */}
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <User className="h-3.5 w-3.5" />
                    Author
                  </div>
                  <p className="font-medium text-sm text-foreground truncate" title={createdBy}>
                    {createdBy}
                  </p>
                </div>
                
                {/* Created */}
                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Created
                  </div>
                  <p className="font-medium text-sm text-foreground">
                    {creationDate ? formatDistanceToNow(new Date(creationDate), { addSuffix: true }) : 'Unknown'}
                  </p>
                </div>
                
                {/* Reviewers */}
                <div className={`p-3 rounded-lg bg-muted ${hasNoReviewers ? 'border border-orange-400 dark:border-orange-700' : ''}`}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Eye className="h-3.5 w-3.5" />
                    Reviewers
                  </div>
                  <p className={`font-medium text-sm ${hasNoReviewers ? 'text-orange-700 dark:text-orange-300' : 'text-foreground'}`}>
                    {hasNoReviewers ? 'None assigned' : `${reviewers.length} assigned`}
                  </p>
                  {approvedReviewers.length > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">{approvedReviewers.length} approved</p>
                  )}
                </div>
                
                {/* Merge Status */}
                <div className={`p-3 rounded-lg bg-muted ${hasConflicts ? 'border border-red-400 dark:border-red-700' : ''}`}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <GitMerge className="h-3.5 w-3.5" />
                    Merge Status
                  </div>
                  <p className={`font-medium text-sm ${hasConflicts ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}>
                    {hasConflicts ? 'Has conflicts' : mergeStatus === 'succeeded' ? 'Clean' : mergeStatus || 'Unknown'}
                  </p>
                </div>
              </div>
              
              {/* Branch Flow */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm bg-muted text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-border">
                  {sourceBranch}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono text-sm bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
                  {targetBranch}
                </span>
              </div>
              
              {/* Reviewers Section with Status */}
              {reviewers.length > 0 && (
                <div>
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Reviewers
                    <span className="text-xs text-muted-foreground font-normal">
                      ({approvedReviewers.length}/{reviewers.length} approved)
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reviewers.map((reviewer, index) => {
                      const voteInfo = getVoteInfo(reviewer.vote)
                      return (
                        <div key={index} className={`flex items-center justify-between p-2 rounded-lg border ${voteInfo.bg}`}>
                          <span className="text-sm text-foreground truncate">{reviewer.displayName}</span>
                          <div className="flex items-center gap-1.5">
                            {voteInfo.icon}
                            <span className={`text-xs font-medium ${voteInfo.color}`}>{voteInfo.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* AI Code Review Section */}
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer bg-muted rounded-lg p-4 border border-border hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-foreground">AI Code Summary</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {aiExplanation ? '(loaded)' : '— understand changes faster'}
                    </span>
                  </div>
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                
                <div className="mt-2 bg-muted rounded-lg p-4 border border-border">
                  {loadingAI && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is analyzing code changes and commits...</span>
                    </div>
                  )}
                  
                  {aiExplanation && (
                    <div className="prose prose-sm max-w-none text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-background prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                      <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                    </div>
                  )}
                  
                  {!aiExplanation && !loadingAI && (
                    <div className="text-center py-2">
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        Get AI-powered summary: what changed, why it matters, and review focus areas.
                      </p>
                      <button
                        onClick={loadAIExplanation}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                      >
                        <Bot className="h-4 w-4" />
                        Summarize Changes
                      </button>
                    </div>
                  )}
                </div>
              </details>

              {/* Description */}
              <div>
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                  {!description && <span className="text-xs text-muted-foreground font-normal">(none provided)</span>}
                </h4>
                {description ? (
                  <div className="prose prose-sm max-w-none bg-muted rounded-lg p-4 [&_*]:!text-muted-foreground [&_h1]:!text-foreground [&_h2]:!text-foreground [&_h3]:!text-foreground [&_h4]:!text-foreground [&_h5]:!text-foreground [&_h6]:!text-foreground [&_strong]:!text-foreground">
                    <ReactMarkdown>{description}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 border border-border text-center">
                    <p className="text-sm text-muted-foreground">No description provided for this pull request.</p>
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
              href={getPRUrl(pullRequest)}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 text-sm rounded-lg transition-colors inline-flex items-center gap-2 ${
                isReadyToMerge 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <ExternalLink className="h-4 w-4" />
              {isReadyToMerge 
                ? 'Merge in Azure DevOps' 
                : hasConflicts
                  ? 'Resolve Conflicts'
                  : needsReview
                    ? 'Add Reviewers'
                    : isActive
                      ? 'Review in Azure DevOps'
                      : 'View in Azure DevOps'
              }
            </a>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default PullRequestDetailModal
