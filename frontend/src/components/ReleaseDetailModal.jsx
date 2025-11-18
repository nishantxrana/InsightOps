import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
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
} from 'lucide-react';

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return <CheckCircle className="h-4 w-4" />;
    case 'failed':
    case 'rejected':
      return <XCircle className="h-4 w-4" />;
    case 'inprogress':
    case 'deploying':
      return <Clock className="h-4 w-4" />;
    case 'pending':
    case 'notstarted':
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
    case 'inprogress':
    case 'deploying':
      return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200';
    case 'pending':
    case 'notstarted':
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
    case 'inprogress':
    case 'deploying':
      return 'bg-blue-500';
    case 'pending':
    case 'notstarted':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
};

const ReleaseDetailModal = ({ release, isOpen, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

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
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ReleaseDetailModal;
