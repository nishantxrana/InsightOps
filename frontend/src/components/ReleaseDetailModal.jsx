import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { releaseService } from '../api/releaseService';
import { buildReleaseUrl } from '../utils/azureDevOpsUrls';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Server,
  ExternalLink,
  X,
  Copy,
  Rocket,
  FileText,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return <CheckCircle className="h-4 w-4" />;
    case 'failed':
    case 'rejected':
      return <XCircle className="h-4 w-4" />;
    case 'canceled':
    case 'cancelled':
      return <X className="h-4 w-4" />;
    case 'abandoned':
      return <X className="h-4 w-4" />;
    case 'waitingforapproval':
      return <UserCheck className="h-4 w-4" />;
    case 'inprogress':
    case 'deploying':
      return <Clock className="h-4 w-4" />;
    case 'pending':
    case 'notstarted':
    case 'notDeployed':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200';
    case 'failed':
    case 'rejected':
      return 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200';
    case 'canceled':
    case 'cancelled':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    case 'abandoned':
      return 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200';
    case 'waitingforapproval':
      return 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200';
    case 'inprogress':
    case 'deploying':
      return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200';
    case 'pending':
    case 'notstarted':
    case 'notDeployed':
      return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getEnvironmentStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return 'bg-green-500';
    case 'failed':
    case 'rejected':
      return 'bg-red-500';
    case 'canceled':
    case 'cancelled':
      return 'bg-gray-500';
    case 'waitingforapproval':
      return 'bg-orange-500';
    case 'inprogress':
    case 'deploying':
      return 'bg-blue-500';
    case 'pending':
    case 'notstarted':
    case 'notDeployed':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
};

const ReleaseDetailModal = ({ release, isOpen, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [approvals, setApprovals] = useState(null);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [failedLogs, setFailedLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);

  // Check if release has failed status and should show logs
  const isFailedRelease = (release?.status === 'failed');
  
  // Check if release is waiting for approval
  const isWaitingForApproval = release?.status === 'waitingforapproval';
  
  // Check if release failed due to approval rejection
  const isApprovalRejected = release?.status === 'failed' && release?.failureReason === 'approval_rejected';
  
  // Check if we should show approval details (waiting for approval OR any failed release)
  const shouldShowApprovals = isWaitingForApproval || isFailedRelease;

  // Set default active tab based on available content
  const getDefaultTab = () => {
    if (isFailedRelease) return 'logs';
    if (shouldShowApprovals) return 'approvals';
    return 'details';
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  // Load failed task logs when modal opens for failed releases
  useEffect(() => {
    if (isOpen && release?.id) {
      setActiveTab(getDefaultTab());
      if (isFailedRelease) {
        loadFailedTaskLogs();
      }
      if (shouldShowApprovals) {
        loadApprovals();
      }
    } else if (!isOpen) {
      // Reset state when modal closes
      setFailedLogs(null);
      setLogsError(null);
      setLoadingLogs(false);
      setApprovals(null);
      setLoadingApprovals(false);
    }
  }, [isOpen, isFailedRelease, shouldShowApprovals, release?.id]);

  const loadFailedTaskLogs = async () => {
    try {
      setLoadingLogs(true);
      setLogsError(null);
      
      const response = await releaseService.getReleaseTaskLogs(release.id);
      if (response.success) {
        setFailedLogs(response.data);
      } else {
        setLogsError('Failed to load task logs');
      }
    } catch (error) {
      console.error('Error loading failed task logs:', error);
      setLogsError('Failed to load task logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadApprovals = async () => {
    try {
      setLoadingApprovals(true);
      const response = await releaseService.getReleaseApprovals(release.id);
      if (response.success) {
        // Only set approvals if there's actual approval data
        const hasActualApprovals = response.data.totalApprovals > 0 || 
          Object.values(response.data.environmentApprovals).some(env => env.approvals.length > 0);
        
        if (hasActualApprovals) {
          setApprovals(response.data);
        } else {
          setApprovals(null);
        }
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
      setApprovals(null);
    } finally {
      setLoadingApprovals(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const copyLink = () => {
    const organization = user?.organization || release.organization;
    const project = user?.project || release.project;
    const url = buildReleaseUrl(organization, project, release.id);
    
    if (url !== '#') {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getReleaseUrl = () => {
    const organization = user?.organization || release.organization;
    const project = user?.project || release.project;
    return buildReleaseUrl(organization, project, release.id);
  };

  if (!isOpen || !release) return null;

  const modalContent = (
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {release.name} #{release.id}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(release.status)}`}>
                  {getStatusIcon(release.status)}
                  <span className="ml-1">{release.status}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              title="Copy release link"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            
            <a
              href={getReleaseUrl()}
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
            {/* Release Metadata */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Release Details</h3>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{release.createdBy?.displayName || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(release.createdOn).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Server className="h-4 w-4" />
                  <span>{release.definitionName}</span>
                </div>
              </div>
            </div>

            {/* Environment Progression */}
            {release.environments && release.environments.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-foreground mb-4">Environment Progression</h3>
                <div className="space-y-3">
                  {release.environments.map((env, index) => (
                    <div key={env.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getEnvironmentStatusColor(env.status)}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{env.name}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(env.status)}`}>
                            {getStatusIcon(env.status)}
                            <span className="ml-1">{env.status}</span>
                          </span>
                        </div>
                        {env.deployedOn && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Deployed: {new Date(env.deployedOn).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {release.description && (
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Description</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {release.description}
                  </p>
                </div>
              </div>
            )}

            {/* Tab Navigation - Show only if we have logs or approvals to display */}
            {(isFailedRelease || shouldShowApprovals) && (
              <div className="border-t border-border pt-6">
                <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-6">
                  {isFailedRelease && (
                    <button
                      onClick={() => setActiveTab('logs')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'logs'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Task Logs
                    </button>
                  )}
                  {shouldShowApprovals && (
                    <button
                      onClick={() => setActiveTab('approvals')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'approvals'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Approvals
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab Content - Task Logs */}
            {activeTab === 'logs' && isFailedRelease && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-medium text-foreground">Failed Task Logs</h3>
                  </div>
                  {!loadingLogs && (
                    <button
                      onClick={loadFailedTaskLogs}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </button>
                  )}
                </div>

                {loadingLogs && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading failed task logs...</span>
                  </div>
                )}

                {logsError && (
                  <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Error loading logs</span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{logsError}</p>
                  </div>
                )}

                {failedLogs && !loadingLogs && (
                  <div className="space-y-4">
                    {failedLogs.totalFailedTasks === 0 ? (
                      <div className="bg-muted/50 p-4 rounded-lg text-center">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No failed tasks found with logs</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground mb-3">
                          Found {failedLogs.totalFailedTasks} failed task(s)
                        </div>
                        
                        {failedLogs.failedTasks.map((task, index) => (
                          <div key={`${task.environmentId}-${task.taskId}`} className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                            <div className="bg-red-50 dark:bg-red-950/50 px-4 py-3 border-b border-red-200 dark:border-red-800">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-red-900 dark:text-red-100">
                                    {task.taskName}
                                  </h4>
                                  <div className="flex items-center gap-4 text-xs text-red-700 dark:text-red-300 mt-1">
                                    <span>Environment: {task.environmentName}</span>
                                    <span>Status: {task.status}</span>
                                    {task.startTime && (
                                      <span>Started: {new Date(task.startTime).toLocaleString()}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </span>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">Console Output</span>
                              </div>
                              
                              {task.logContent ? (
                                <div className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                                  <pre className="whitespace-pre-wrap">{task.logContent}</pre>
                                </div>
                              ) : (
                                <div className="bg-muted/50 p-4 rounded-md text-center">
                                  <p className="text-sm text-muted-foreground">No log content available</p>
                                </div>
                              )}
                              
                              {task.issues && task.issues.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-sm font-medium text-foreground">Issues:</span>
                                  <ul className="mt-1 space-y-1">
                                    {task.issues.map((issue, issueIndex) => (
                                      <li key={issueIndex} className="text-sm text-red-600 dark:text-red-400">
                                        • {issue.message || issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab Content - Approvals */}
            {activeTab === 'approvals' && shouldShowApprovals && (
              <div>
                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-2">
                    <UserCheck className={`h-5 w-5 ${isApprovalRejected ? 'text-red-500' : 'text-orange-500'}`} />
                    <h3 className="text-lg font-medium text-foreground">
                      {isWaitingForApproval ? 'Pending Approvals' : 'Approval History'}
                    </h3>
                  </div>
                  {!loadingApprovals && (
                    <button
                      onClick={loadApprovals}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Refresh Approvals
                    </button>
                  )}
                </div>

                {loadingApprovals && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading approval details...</span>
                  </div>
                )}

                {approvals && (
                  <div className="mt-4">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {approvals.pendingApprovals}
                        </div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {approvals.approvedCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Approved</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {approvals.rejectedCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Rejected</div>
                      </div>
                    </div>

                    {Object.entries(approvals.environmentApprovals).map(([envId, envApproval]) => (
                      <div key={envId} className="mb-6 border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-3 border-b border-border">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-foreground">{envApproval.environmentName}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(envApproval.environmentStatus)}`}>
                              {envApproval.environmentStatus}
                            </span>
                          </div>
                        </div>
                        
                        {envApproval.approvals.length > 0 ? (
                          <div className="p-4 space-y-3">
                            {envApproval.approvals.map((approval) => (
                              <div key={approval.id} className="flex items-start gap-3 p-3 bg-background rounded border border-border">
                                <div className="flex-shrink-0">
                                  {approval.approver.imageUrl ? (
                                    <img 
                                      src={approval.approver.imageUrl} 
                                      alt={approval.approver.displayName}
                                      className="w-8 h-8 rounded-full"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div 
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                                      approval.approver.imageUrl ? 'hidden' : 'flex'
                                    }`}
                                    style={{
                                      backgroundColor: `hsl(${approval.approver.displayName.charCodeAt(0) * 137.508 % 360}, 70%, 50%)`
                                    }}
                                  >
                                    {approval.approver.displayName
                                      .split(' ')
                                      .map(name => name.charAt(0))
                                      .join('')
                                      .substring(0, 2)
                                      .toUpperCase()
                                    }
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-foreground">
                                      {approval.approver.displayName}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        approval.status === 'approved' ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200' :
                                        approval.status === 'rejected' ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200' :
                                        'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200'
                                      }`}>
                                        {approval.status}
                                      </span>
                                      {approval.status !== 'pending' && (
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(approval.modifiedOn).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {approval.approver.uniqueName?.startsWith('vstfs:') ? 
                                      (approval.approvedBy?.uniqueName || `Team: ${approval.approver.displayName}`) : 
                                      approval.approver.uniqueName
                                    }
                                  </p>
                                  {approval.instructions && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      <strong>Instructions:</strong> {approval.instructions}
                                    </p>
                                  )}
                                  {approval.comments && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      <strong>Comments:</strong> {approval.comments}
                                    </p>
                                  )}
                                  {approval.approvedBy && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      <strong>{approval.status === 'approved' ? 'Approved' : 'Rejected'} by:</strong> {approval.approvedBy.displayName}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Created: {new Date(approval.createdOn).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            No approvals required for this environment
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {approvals && Object.keys(approvals.environmentApprovals).length === 0 && !loadingApprovals && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-yellow-700 dark:text-yellow-300">No approval information found for this release.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ReleaseDetailModal;
