import React from "react";
import { Rocket, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function ReleasesSection({ data }) {
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Releases
        </h3>
        <p className="text-sm text-destructive">Error: {data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Rocket className="h-4 w-4" />
        Releases
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{data.totalReleases}</p>
          <p className="text-xs text-muted-foreground">Total Releases</p>
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
          <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{data.successRate}%</p>
          <p className="text-xs text-muted-foreground">Success Rate</p>
        </div>
      </div>

      {data.failedEnvironments > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Failed Environments:{" "}
            <span className="font-semibold text-foreground">{data.failedEnvironments}</span>
          </p>
        </div>
      )}
    </div>
  );
}
