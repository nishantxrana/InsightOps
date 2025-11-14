import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildReleaseUrl } from '../utils/azureDevOpsUrls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  GitBranch,
  Server,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'failed':
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'inprogress':
    case 'deploying':
      return <Clock className="w-4 h-4 text-blue-600" />;
    case 'pending':
    case 'notstarted':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'failed':
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'inprogress':
    case 'deploying':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'pending':
    case 'notstarted':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200';
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
  
  if (!release) return null;

  // Get organization and project from user settings or release data
  const organization = user?.organization || release.organization;
  const project = user?.project || release.project;

  const handleViewInAzure = () => {
    const url = buildReleaseUrl(organization, project, release.id);
    if (url !== '#') {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
              #{release.id}
            </span>
            <span>{release.name}</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(release.status)}
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(release.status)}`}>
                {release.status}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Release Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Definition:</span>
                <span className="text-sm text-muted-foreground">{release.definitionName}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Created by:</span>
                <span className="text-sm text-muted-foreground">
                  {release.createdBy?.displayName || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Created:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(release.createdOn).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Environment Progression */}
          {release.environments && release.environments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" />
                Environment Progression
              </h3>
              <div className="space-y-4">
                {release.environments.map((env, index) => (
                  <div key={env.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getEnvironmentStatusColor(env.status)}`} />
                      <span className="font-medium">{env.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(env.status)}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(env.status)}`}>
                        {env.status}
                      </span>
                    </div>
                    {env.deployedOn && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                        <Calendar className="w-4 h-4" />
                        {new Date(env.deployedOn).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artifacts */}
          {release.artifacts && release.artifacts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Artifacts</h3>
              <div className="space-y-2">
                {release.artifacts.map((artifact, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{artifact.alias}</span>
                      <span className="text-sm text-muted-foreground ml-2">({artifact.type})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={handleViewInAzure}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View in Azure DevOps
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReleaseDetailModal;
