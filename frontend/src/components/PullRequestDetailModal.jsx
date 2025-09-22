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
  CheckCircle,
  Bot,
  Loader2,
  Eye,
  FileText,
  Plus,
  Minus,
  Edit3,
  Code2
} from 'lucide-react'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { apiService } from '../api/apiService'

const PullRequestDetailModal = ({ pullRequest, isOpen, onClose }) => {
  const [aiExplanation, setAiExplanation] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [changes, setChanges] = useState(null)
  const [loadingChanges, setLoadingChanges] = useState(false)

  // Get PR details
  const title = pullRequest?.title || 'No title'
  const description = pullRequest?.description || ''
  const status = pullRequest?.status || 'Unknown'
  const createdBy = pullRequest?.createdBy?.displayName || 'Unknown'
  const sourceBranch = pullRequest?.sourceRefName?.replace('refs/heads/', '') || 'Unknown'
  const targetBranch = pullRequest?.targetRefName?.replace('refs/heads/', '') || 'Unknown'
  const creationDate = pullRequest?.creationDate
  const reviewers = pullRequest?.reviewers || []

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200'
      case 'completed':
        return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200'
      case 'abandoned':
        return 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  // Get change type icon and color
  const getChangeTypeIcon = (changeType) => {
    switch (changeType?.toLowerCase()) {
      case 'add':
        return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'delete':
        return <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'edit':
        return <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Simple diff renderer
  const renderDiff = (originalContent, newContent, path) => {
    if (!originalContent && !newContent) return null
    
    const original = (originalContent || '').split('\n')
    const modified = (newContent || '').split('\n')
    
    // Simple line-by-line diff
    const maxLines = Math.max(original.length, modified.length)
    const diffLines = []
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = original[i]
      const newLine = modified[i]
      
      if (oldLine === undefined) {
        // Added line
        diffLines.push({ type: 'add', content: newLine, lineNum: i + 1 })
      } else if (newLine === undefined) {
        // Deleted line
        diffLines.push({ type: 'delete', content: oldLine, lineNum: i + 1 })
      } else if (oldLine !== newLine) {
        // Modified line
        diffLines.push({ type: 'delete', content: oldLine, lineNum: i + 1 })
        diffLines.push({ type: 'add', content: newLine, lineNum: i + 1 })
      } else {
        // Unchanged line
        diffLines.push({ type: 'context', content: oldLine, lineNum: i + 1 })
      }
    }
    
    return (
      <div className="font-mono text-sm bg-muted/30 rounded border">
        {diffLines.slice(0, 50).map((line, index) => (
          <div
            key={index}
            className={`flex ${
              line.type === 'add' ? 'bg-green-50 dark:bg-green-950/20' :
              line.type === 'delete' ? 'bg-red-50 dark:bg-red-950/20' :
              'bg-transparent'
            }`}
          >
            <span className="w-12 px-2 py-1 text-xs text-muted-foreground border-r">
              {line.lineNum}
            </span>
            <span className={`w-4 text-center ${
              line.type === 'add' ? 'text-green-600 dark:text-green-400' :
              line.type === 'delete' ? 'text-red-600 dark:text-red-400' :
              'text-muted-foreground'
            }`}>
              {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
            </span>
            <span className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
              {line.content}
            </span>
          </div>
        ))}
        {diffLines.length > 50 && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t">
            ... {diffLines.length - 50} more lines
          </div>
        )}
      </div>
    )
  }

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
      
      // Also set changes if returned
      if (response.changes) {
        setChanges(response.changes)
      }
    } catch (error) {
      console.error('Failed to load AI explanation:', error)
      setAiExplanation('AI explanation temporarily unavailable. Please try again later.')
    } finally {
      setLoadingAI(false)
    }
  }

  // Load changes
  const loadChanges = async () => {
    if (!pullRequest || loadingChanges || changes) return
    
    setLoadingChanges(true)
    try {
      const changesData = await apiService.getPullRequestChanges(pullRequest.pullRequestId)
      setChanges(changesData)
    } catch (error) {
      console.error('Failed to load changes:', error)
    } finally {
      setLoadingChanges(false)
    }
  }

  // Toggle file expansion
  const toggleFileExpansion = (path) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFiles(newExpanded)
  }

  // Copy PR link
  const copyLink = async () => {
    try {
      const url = getPRUrl(pullRequest)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && pullRequest) {
      setAiExplanation(null)
      setLoadingAI(false)
      setCopied(false)
      setActiveTab('overview')
      setChanges(null)
      setLoadingChanges(false)
      setExpandedFiles(new Set())
    }
  }, [isOpen, pullRequest])

  // Load changes when Files tab is selected
  useEffect(() => {
    if (activeTab === 'files' && !changes && !loadingChanges) {
      loadChanges()
    }
  }, [activeTab])

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
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card dark:bg-[#111111] rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border dark:border-[#1a1a1a]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <GitPullRequest className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Pull Request #{pullRequest.pullRequestId}
              </h2>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {status}
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
              href={getPRUrl(pullRequest)}
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

        {/* Tabs */}
        <div className="flex border-b border-border dark:border-[#1a1a1a]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-foreground border-b-2 border-blue-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-foreground border-b-2 border-blue-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Files Changed
              {changes?.changeEntries && (
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                  {changes.changeEntries.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Title and Metadata */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{createdBy}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {sourceBranch} → {targetBranch}
                    </span>
                  </div>
                  
                  {creationDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created {format(new Date(creationDate), 'MMM dd, yyyy')}</span>
                    </div>
                  )}

                  {reviewers.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{reviewers.length} reviewer{reviewers.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {reviewers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reviewers.map((reviewer, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                        {reviewer.displayName}
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
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">AI Code Analysis</h4>
                  </div>
                  {!aiExplanation && !loadingAI && (
                    <button
                      onClick={loadAIExplanation}
                      className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      🤖 Explain This PR
                    </button>
                  )}
                </div>
                
                {loadingAI && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is analyzing code changes and commits...</span>
                  </div>
                )}
                
                {aiExplanation && (
                  <div className="prose prose-sm max-w-none text-blue-800 dark:text-blue-200 prose-strong:text-blue-900 dark:prose-strong:text-blue-50">
                    <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                  </div>
                )}
                
                {!aiExplanation && !loadingAI && (
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Click "Explain This PR" to get AI-powered insights about the code changes, commits, and purpose of this pull request.
                  </p>
                )}
              </div>

              {/* Description */}
              {description && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Description</h4>
                  <div className="prose prose-sm max-w-none text-muted-foreground bg-muted rounded-lg p-4">
                    <ReactMarkdown>{description}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="p-6">
              {loadingChanges && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading file changes...</span>
                </div>
              )}

              {changes?.changeEntries && changes.changeEntries.length > 0 && (
                <div className="space-y-4">
                  {/* File Summary */}
                  {changes.summary && (
                    <div className="bg-muted/30 rounded-lg p-4 mb-4">
                      <h4 className="font-medium mb-2">Changes Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-foreground">{changes.summary.totalFiles}</div>
                          <div className="text-muted-foreground">Total Files</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{changes.summary.addedFiles}</div>
                          <div className="text-muted-foreground">Added</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{changes.summary.modifiedFiles}</div>
                          <div className="text-muted-foreground">Modified</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">{changes.summary.deletedFiles}</div>
                          <div className="text-muted-foreground">Deleted</div>
                        </div>
                      </div>
                      
                      {/* File Types */}
                      {changes.summary.fileTypes && Object.keys(changes.summary.fileTypes).length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm font-medium mb-2">File Types:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(changes.summary.fileTypes).map(([type, count]) => (
                              <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200">
                                {type}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* File List */}
                  <div className="space-y-2">
                    {changes.changeEntries
                      .filter(change => !change.isFolder && change.changeType !== 'info')
                      .map((change, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                        <div className="flex-shrink-0">
                          {getChangeTypeIcon(change.changeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm truncate">{change.path}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {change.changeType}
                            </span>
                            {change.fileType && (
                              <span className="text-xs text-muted-foreground">
                                {change.fileType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Info message about diffs */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800/30">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">
                        File diffs are not available through Azure DevOps API. Use the "Open in Azure DevOps" link above to view detailed changes.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!loadingChanges && (!changes?.changeEntries || changes.changeEntries.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No File Changes</h3>
                  <p>No file changes found for this pull request.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default PullRequestDetailModal
