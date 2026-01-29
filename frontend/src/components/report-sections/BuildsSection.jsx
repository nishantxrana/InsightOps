import React from "react";
import { GitBranch, Clock } from "lucide-react";

export default function BuildsSection({ data }) {
  // Skeleton loading state
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Builds
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-8 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="h-6 w-full bg-muted-foreground/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Builds
        </h3>
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  // Empty state
  if (data.totalBuilds === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Builds
        </h3>
        <p className="text-sm text-muted-foreground">No builds found in the selected date range.</p>
      </div>
    );
  }

  const successRate = 100 - data.failureRate;

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Builds
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{data.totalBuilds}</p>
          <p className="text-xs text-muted-foreground">Total Builds</p>
        </div>

        <div>
          <p className="text-xl font-semibold text-foreground">{data.succeeded}</p>
          <p className="text-xs text-muted-foreground">Succeeded</p>
        </div>

        <div>
          <p className="text-xl font-semibold text-foreground">{data.failed}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>

        <div>
          <p className="text-xl font-semibold text-foreground">{data.failureRate}%</p>
          <p className="text-xs text-muted-foreground">Failure Rate</p>
        </div>
      </div>

      {/* Success Rate Progress Bar */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Success Rate</span>
          <span className="text-xs font-medium text-foreground">{successRate.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/80 transition-all duration-500"
            style={{ width: `${successRate}%` }}
          />
        </div>
      </div>

      {data.avgDuration > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            Avg Duration:{" "}
            <span className="font-medium text-foreground">{data.avgDuration} min</span>
          </p>
        </div>
      )}
    </div>
  );
}
