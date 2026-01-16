import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import { releaseService } from '../api/releaseService';
import { buildReleaseUrl } from '../utils/azureDevOpsUrls';
import { format, formatDistanceToNow } from 'date-fns';
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
  Bot,
  Loader2,
  ArrowRight,
  Shield,
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
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Check if release has failed status and should show logs
  const isFailedRelease = (release?.status === 'failed');
  
  // Check if release is waiting for approval
  const isWaitingForApproval = release?.status === 'waitingforapproval';
  
  // Check if release succeeded
  const isSucceeded = release?.status === 'succeeded';
  
  // Check if release is in progress
  const isInProgress = release?.status === 'inprogress' || release?.status === 'deploying';
  
  // Check if release failed due to approval rejection
  const isApprovalRejected = release?.status === 'failed' && release?.failureReason === 'approval_rejected';
  
  // Count failed environments
  const failedEnvCount = release?.environments?.filter(env => 
    env.status?.toLowerCase() === 'failed' || env.status?.toLowerCase() === 'rejected'
  ).length || 0;
  
  // Count succeeded environments
  const succeededEnvCount = release?.environments?.filter(env => 
    env.status?.toLowerCase() === 'succeeded'
  ).length || 0;
  
  // Total environments
  const totalEnvCount = release?.environments?.length || 0;
  
  // Show approval details for all releases (everyone can have approvals)
  const shouldShowApprovals = true;

  // Set default active tab based on available content
  const getDefaultTab = () => {
    if (isFailedRelease) return 'logs';
    return 'approvals'; // Default to approvals for all other releases
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
      setAiAnalysis(null);
      setLoadingAI(false);
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
      setLogsError(error.userMessage || 'Failed to load task logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadApprovals = async () => {
    try {
      setLoadingApprovals(true);
      const response = await releaseService.getReleaseApprovals(release.id);
      if (response.success) {
        // Always set approvals data, even if empty
        setApprovals(response.data);
      } else {
        setApprovals(null);
      }
    } catch {
      // Approvals may not be available, fail silently
      setApprovals(null);
    } finally {
      setLoadingApprovals(false);
    }
  };

  const loadAIAnalysis = async () => {
    try {
      setLoadingAI(true);
      const response = await releaseService.analyzeRelease(release.id);
      if (response.success) {
        setAiAnalysis(response.analysis);
      }
    } catch (error) {
      const message = error.userMessage || 'AI analysis temporarily unavailable.';
      setAiAnalysis(message);
    } finally {
      setLoadingAI(false);
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
      <div className="bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Status Banners */}
        {isFailedRelease && (
          <div className="px-6 py-3 bg-red-100 dark:bg-red-950/50 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
            <span className="font-medium">Deployment Failed</span>
            {failedEnvCount > 0 && (
              <span className="text-sm text-red-600 dark:text-red-300">— {failedEnvCount} environment{failedEnvCount > 1 ? 's' : ''} failed</span>
            )}
          </div>
        )}
        
        {isWaitingForApproval && (
          <div className="px-6 py-3 bg-orange-100 dark:bg-orange-950/50 border-b border-orange-200 dark:border-orange-800 flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <Shield className="h-5 w-5 animate-pulse" />
            <span className="font-medium">Waiting for Approval</span>
            <span className="text-sm text-orange-600 dark:text-orange-300">— Action required to continue deployment</span>
          </div>
        )}
        
        {isSucceeded && (
          <div className="px-6 py-2 bg-emerald-100 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium text-sm">Deployment Succeeded</span>
            {totalEnvCount > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-300">— All {totalEnvCount} environment{totalEnvCount > 1 ? 's' : ''} deployed</span>
            )}
          </div>
        )}
        
        {isInProgress && (
          <div className="px-6 py-2 bg-blue-100 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="font-medium text-sm">Deployment In Progress</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-[#1a1a1a]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${isFailedRelease ? 'bg-red-100 dark:bg-red-950/50' : isSucceeded ? 'bg-emerald-100 dark:bg-emerald-950/50' : isWaitingForApproval ? 'bg-orange-100 dark:bg-orange-950/50' : 'bg-muted'}`}>
              {isFailedRelease ? (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : isSucceeded ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : isWaitingForApproval ? (
                <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : (
                <Rocket className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground font-mono">#{release.id}</span>
                <span className="text-muted-foreground">•</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(release.status)}`}>
                  {release.status}
                </span>
                {totalEnvCount > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {succeededEnvCount}/{totalEnvCount} envs
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground truncate" title={release.name}>
                {release.name}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={copyLink}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              title="Copy release link"
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
          <div className="p-6 space-y-6">
            {/* Release Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Created By */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  Created By
                </div>
                <p className="font-medium text-sm text-foreground truncate" title={release.createdBy?.displayName || 'Unknown'}>
                  {release.createdBy?.displayName || 'Unknown'}
                </p>
              </div>
              
              {/* Created */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Created
                </div>
                <p className="font-medium text-sm text-foreground">
                  {release.createdOn ? formatDistanceToNow(new Date(release.createdOn), { addSuffix: true }) : 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {release.createdOn ? format(new Date(release.createdOn), 'HH:mm') : ''}
                </p>
              </div>
              
              {/* Pipeline */}
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Server className="h-3.5 w-3.5" />
                  Pipeline
                </div>
                <p className="font-medium text-sm text-foreground truncate" title={release.definitionName}>
                  {release.definitionName || 'Unknown'}
                </p>
              </div>
              
              {/* Environments */}
              <div className={`p-3 rounded-lg ${failedEnvCount > 0 ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' : 'bg-muted'}`}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Rocket className="h-3.5 w-3.5" />
                  Environments
                </div>
                <p className={`font-medium text-sm ${failedEnvCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-foreground'}`}>
                  {succeededEnvCount} / {totalEnvCount} deployed
                </p>
                {failedEnvCount > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400">{failedEnvCount} failed</p>
                )}
              </div>
            </div>

            {/* Environment Progression */}
            {release.environments && release.environments.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Deployment Pipeline</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {succeededEnvCount === totalEnvCount 
                    ? 'All environments deployed successfully'
                    : failedEnvCount > 0 
                      ? `${failedEnvCount} of ${totalEnvCount} environment${failedEnvCount > 1 ? 's' : ''} failed`
                      : `${succeededEnvCount} of ${totalEnvCount} environments deployed`
                  }
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {release.environments.map((env, index) => {
                    const isFailed = env.status?.toLowerCase() === 'failed' || env.status?.toLowerCase() === 'rejected';
                    const isEnvSucceeded = env.status?.toLowerCase() === 'succeeded';
                    const isPending = env.status?.toLowerCase() === 'pending' || env.status?.toLowerCase() === 'notstarted' || env.status?.toLowerCase() === 'notdeployed';
                    const isBlocked = env.status?.toLowerCase() === 'waitingforapproval';
                    
                    return (
                      <React.Fragment key={env.id}>
                        <div className={`flex-shrink-0 p-3 rounded-lg border-2 min-w-[140px] ${
                          isFailed 
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700' 
                            : isEnvSucceeded 
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700' 
                              : isBlocked
                                ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700'
                                : 'bg-muted border-border'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${getEnvironmentStatusColor(env.status)} ${isFailed || isBlocked ? 'animate-pulse' : ''}`} />
                            <span className={`font-medium text-sm truncate ${
                              isFailed ? 'text-red-700 dark:text-red-300' : 
                              isEnvSucceeded ? 'text-emerald-700 dark:text-emerald-300' : 
                              isBlocked ? 'text-orange-700 dark:text-orange-300' :
                              'text-foreground'
                            }`}>{env.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(env.status)}`}>
                              {getStatusIcon(env.status)}
                              <span className="ml-1">{env.status}</span>
                            </span>
                          </div>
                          {env.deployedOn && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(env.deployedOn), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                        {index < release.environments.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
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
                <div className="border-b border-border">
                  <nav className="flex space-x-6 px-1" aria-label="Tabs">
                    {isFailedRelease && (
                      <button
                        onClick={() => setActiveTab('logs')}
                        className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                          activeTab === 'logs'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                        }`}
                        aria-current={activeTab === 'logs' ? 'page' : undefined}
                      >
                        <FileText className={`h-4 w-4 transition-colors ${activeTab === 'logs' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        Task Logs
                      </button>
                    )}
                    {shouldShowApprovals && (
                      <button
                        onClick={() => setActiveTab('approvals')}
                        className={`group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                          activeTab === 'approvals'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                        }`}
                        aria-current={activeTab === 'approvals' ? 'page' : undefined}
                      >
                        <UserCheck className={`h-4 w-4 transition-colors ${activeTab === 'approvals' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        Approvals
                      </button>
                    )}
                  </nav>
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

                        {/* AI Explanation Section - Reframed for debugging */}
                        <details className="group" open>
                          <summary className="flex items-center justify-between cursor-pointer bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <Bot className="h-5 w-5 text-red-600 dark:text-red-400" />
                              <span className="font-medium text-red-900 dark:text-red-100">AI Failure Diagnosis</span>
                              <span className="text-xs text-red-600 dark:text-red-400">
                                {aiAnalysis ? '(loaded)' : '— identify root cause faster'}
                              </span>
                            </div>
                            <svg className="h-5 w-5 text-red-600 dark:text-red-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          
                          <div className="mt-2 bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800/30">
                            {loadingAI && (
                              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">AI is analyzing task logs and errors...</span>
                              </div>
                            )}
                            
                            {aiAnalysis && (
                              <div className="prose prose-sm max-w-none text-red-800 dark:text-red-200 prose-strong:text-red-900 dark:prose-strong:text-red-100 prose-code:text-red-900 dark:prose-code:text-red-100 prose-code:bg-red-100 dark:prose-code:bg-red-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                              </div>
                            )}
                            
                            {!aiAnalysis && !loadingAI && (
                              <div className="text-center py-2">
                                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                                  Get AI-powered root cause analysis, error explanations, and suggested fixes.
                                </p>
                                <button
                                  onClick={loadAIAnalysis}
                                  className="px-4 py-2 text-sm bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors inline-flex items-center gap-2"
                                >
                                  <Bot className="h-4 w-4" />
                                  Diagnose Failure
                                </button>
                              </div>
                            )}
                          </div>
                        </details>
                        
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

                    {Object.entries(approvals.environmentApprovals).map(([envId, envApproval]) => {
                      // Determine overall approval status for this environment
                      const hasRejected = envApproval.approvals.some(a => a.status?.toLowerCase() === 'rejected');
                      const hasPending = envApproval.approvals.some(a => a.status?.toLowerCase() === 'pending');
                      const allApproved = envApproval.approvals.length > 0 && envApproval.approvals.every(a => a.status?.toLowerCase() === 'approved');
                      
                      const approvalStatus = hasRejected ? 'rejected' : hasPending ? 'pending' : allApproved ? 'approved' : 'pending';
                      
                      return (
                      <div key={envId} className="mb-6 border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-3 border-b border-border">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-foreground">{envApproval.environmentName}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              approvalStatus === 'approved' ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200' :
                              approvalStatus === 'rejected' ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200' :
                              'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200'
                            }`}>
                              {approvalStatus}
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
                      );
                    })}
                  </div>
                )}

                {approvals && Object.keys(approvals.environmentApprovals).length === 0 && !loadingApprovals && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-blue-700 dark:text-blue-300">
                      {release.status === 'succeeded' 
                        ? 'Approval history is not available for completed releases. All required approvals were granted.'
                        : 'No approval gates configured for this release pipeline.'}
                    </p>
                  </div>
                )}
              </div>
            )}
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
              href={getReleaseUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 text-sm rounded-lg transition-colors inline-flex items-center gap-2 ${
                isFailedRelease 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : isWaitingForApproval
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <ExternalLink className="h-4 w-4" />
              {isFailedRelease 
                ? 'View Logs in Azure DevOps' 
                : isWaitingForApproval
                  ? 'Approve in Azure DevOps'
                  : 'Open in Azure DevOps'
              }
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ReleaseDetailModal;
