import React from "react";
import { GitPullRequest, CheckCircle, XCircle, Clock } from "lucide-react";

export default function PullRequestsSection({ data }) {
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <GitPullRequest className="h-4 w-4" />
          Pull Requests
        </h3>
        <p className="text-sm text-destructive">Error: {data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <GitPullRequest className="h-4 w-4" />
        Pull Requests
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{data.totalPRs}</p>
          <p className="text-xs text-muted-foreground">Total PRs</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">
            {data.byStatus?.active || 0}
          </p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-green-500 dark:text-green-400">
            {data.byStatus?.completed || 0}
          </p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
            {data.byStatus?.abandoned || 0}
          </p>
          <p className="text-xs text-muted-foreground">Abandoned</p>
        </div>
      </div>

      {data.avgTimeToComplete > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            Avg Time to Complete:{" "}
            <span className="font-semibold text-foreground">{data.avgTimeToComplete}h</span>
          </p>
        </div>
      )}
    </div>
  );
}
