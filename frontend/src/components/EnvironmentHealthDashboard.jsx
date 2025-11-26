import React, { useState } from 'react';
import {
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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

export default function EnvironmentHealthDashboard({ environmentStats, releases }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
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

  const environments = Object.entries(environmentStats).sort(([,a], [,b]) => b.total - a.total);
  const totalEnvironments = environments.length;

  const cardsPerPage = 3; // Show max 3 cards per row
  const totalPages = Math.ceil(totalEnvironments / cardsPerPage);

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + cardsPerPage;
      return nextIndex >= totalEnvironments ? 0 : nextIndex;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      const prevIndex = prev - cardsPerPage;
      return prevIndex < 0 ? Math.max(0, totalEnvironments - cardsPerPage) : prevIndex;
    });
  };

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
    <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xl font-semibold text-foreground">Environment Health</h3>
        </div>
        {/* Desktop pagination controls */}
        {totalEnvironments > cardsPerPage && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={prevSlide}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              {Math.floor(currentIndex / cardsPerPage) + 1} / {totalPages}
            </span>
            <button
              onClick={nextSlide}
              className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              disabled={currentIndex + cardsPerPage >= totalEnvironments}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Environment Cards - Mobile: Horizontal Scroll, Desktop: Grid */}
      <div className="mb-6">
        {/* Mobile: Shadcn Carousel */}
        <div className="sm:hidden">
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full max-w-full"
          >
            <CarouselContent className="">
              {environments.map(([envName, stats]) => {
                const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
                const lastDeployment = getLastDeployment(envName);
                
                return (
                  <CarouselItem key={envName} className="basis-full">
                    <div className="mx-4 group relative overflow-hidden bg-gradient-to-br from-card to-card/50 dark:from-[#111111] dark:to-[#0a0a0a] p-6 rounded-xl border border-border dark:border-[#1a1a1a] shadow-sm">
                      {/* Success Rate Badge */}
                      <div className="absolute top-4 right-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          successRate >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300' :
                          successRate >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300' :
                          'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                        }`}>
                          {getEnvironmentHealthIcon(successRate)}
                          {successRate}%
                        </div>
                      </div>

                      {/* Environment Name */}
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-foreground truncate pr-16">{envName}</h4>
                        <p className="text-sm text-muted-foreground">Environment</p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-foreground">{stats.total}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.success}</div>
                          <div className="text-xs text-muted-foreground">Success</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
                          <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                      </div>

                      {/* Last Deployment */}
                      {lastDeployment && (
                        <div className="pt-4 border-t border-border dark:border-[#1a1a1a]">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium">Last Deployment</span>
                          </div>
                          <div className="text-sm font-medium text-foreground truncate">{lastDeployment.releaseName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(lastDeployment.deployedOn).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="-left-6" />
            <CarouselNext className="-right-6" />
          </Carousel>
        </div>

        {/* Desktop: Responsive grid with multiple breakpoints */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
            {environments
              .slice(currentIndex, currentIndex + cardsPerPage)
              .map(([envName, stats]) => {
                const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
                const lastDeployment = getLastDeployment(envName);
                
                return (
                  <div key={envName} className="min-w-[280px] max-w-[400px] mx-auto w-full group relative overflow-hidden bg-gradient-to-br from-card to-card/50 dark:from-[#111111] dark:to-[#0a0a0a] p-6 rounded-xl border border-border dark:border-[#1a1a1a] shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                    {/* Success Rate Badge */}
                    <div className="absolute top-4 right-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        successRate >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300' :
                        successRate >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                      }`}>
                        {getEnvironmentHealthIcon(successRate)}
                        {successRate}%
                      </div>
                    </div>

                    {/* Environment Name */}
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-foreground truncate pr-16">{envName}</h4>
                      <p className="text-sm text-muted-foreground">Environment</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-foreground">{stats.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.success}</div>
                        <div className="text-xs text-muted-foreground">Success</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                    </div>

                    {/* Last Deployment */}
                    {lastDeployment && (
                      <div className="pt-4 border-t border-border dark:border-[#1a1a1a]">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">Last Deployment</span>
                        </div>
                        <div className="text-sm font-medium text-foreground truncate">{lastDeployment.releaseName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(lastDeployment.deployedOn).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Overall Health Summary */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Environment Health</span>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="font-medium">
              {(Object.values(environmentStats).reduce((acc, stats) => {
                const rate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
                return acc + rate;
              }, 0) / Object.keys(environmentStats).length || 0).toFixed(1)}% Average Success Rate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
