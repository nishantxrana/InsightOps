import React from "react";
import { GitBranch, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

export default function BuildsSection({ data }) {
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Builds
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Builds
        </h3>
        <p className="text-sm text-destructive">Error: {data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Builds
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{data.totalBuilds}</p>
          <p className="text-xs text-muted-foreground">Total Builds</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-green-500 dark:text-green-400">{data.succeeded}</p>
          <p className="text-xs text-muted-foreground">Succeeded</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{data.failed}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
            {data.failureRate}%
          </p>
          <p className="text-xs text-muted-foreground">Failure Rate</p>
        </div>
      </div>

      {data.avgDuration > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            Avg Duration:{" "}
            <span className="font-semibold text-foreground">{data.avgDuration} min</span>
          </p>
        </div>
      )}
    </div>
  );
}
