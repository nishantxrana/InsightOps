import React from 'react';
import {
  Server,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from 'lucide-react';

const getEnvironmentHealthColor = (successRate) => {
  if (successRate >= 90) return 'text-green-600 bg-card dark:bg-[#111111] border-green-200 dark:border-green-800';
  if (successRate >= 70) return 'text-yellow-600 bg-card dark:bg-[#111111] border-yellow-200 dark:border-yellow-800';
  return 'text-red-600 bg-card dark:bg-[#111111] border-red-200 dark:border-red-800';
};

const getEnvironmentHealthIcon = (successRate) => {
  if (successRate >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (successRate >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  return <XCircle className="w-5 h-5 text-red-600" />;
};

const EnvironmentHealthDashboard = ({ environmentStats, releases }) => {
  if (!environmentStats || Object.keys(environmentStats).length === 0) {
    return (
      <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-semibold text-foreground">Environment Health</h3>
        </div>
        <div className="text-center py-8">
          <Server className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No environment data available</p>
        </div>
      </div>
    );
  }

  // Get last deployment for each environment
  const getLastDeployment = (envName) => {
    const envReleases = releases
      .filter(release => release.environments?.some(env => env.name === envName))
      .sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    
    if (envReleases.length === 0) return null;
    
    const lastRelease = envReleases[0];
    const envData = lastRelease.environments.find(env => env.name === envName);
    
    return {
      releaseName: lastRelease.name,
      status: envData?.status || 'unknown',
      deployedOn: envData?.deployedOn || lastRelease.createdOn
    };
  };

  return (
    <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-xl font-semibold text-foreground">Environment Health</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(environmentStats).map(([envName, stats]) => {
          const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
          const lastDeployment = getLastDeployment(envName);
          
          return (
            <div
              key={envName}
              className={`p-4 rounded-lg border ${getEnvironmentHealthColor(successRate)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getEnvironmentHealthIcon(successRate)}
                  <h4 className="font-medium">{envName}</h4>
                </div>
                <span className="text-sm font-medium">{successRate}%</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deployments:</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Successful:</span>
                  <span className="font-medium text-green-600">{stats.success}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-red-600">{stats.failed}</span>
                </div>
              </div>

              {lastDeployment && (
                <div className="mt-3 pt-3 border-t border-current/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Last: {lastDeployment.releaseName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(lastDeployment.deployedOn).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Health Summary */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Environment Health</span>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="font-medium">
              {Object.values(environmentStats).reduce((acc, stats) => {
                const rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
                return acc + rate;
              }, 0) / Object.keys(environmentStats).length || 0}% Average Success Rate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentHealthDashboard;
