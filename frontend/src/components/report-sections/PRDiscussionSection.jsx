import React from "react";
import { MessageSquare, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

export default function PRDiscussionSection({ data }) {
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
        </h3>
        <p className="text-sm text-destructive">Error: {data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        PR Discussion Health
      </h3>

      <div className="space-y-4">
        {/* Thread Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground">{data.totalThreads}</p>
            <p className="text-xs text-muted-foreground">Total Threads</p>
          </div>

          <div>
            <p className="text-2xl font-bold text-green-500 dark:text-green-400">
              {data.resolvedThreads}
            </p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>

          <div>
            <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">
              {data.unresolvedThreads}
            </p>
            <p className="text-xs text-muted-foreground">Unresolved</p>
          </div>

          <div>
            <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">
              {data.resolutionRate}%
            </p>
            <p className="text-xs text-muted-foreground">Resolution Rate</p>
          </div>
        </div>

        {/* Comment Metrics */}
        <div className="pt-3 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-semibold text-foreground">{data.totalComments}</p>
              <p className="text-xs text-muted-foreground">Total Comments</p>
            </div>

            <div>
              <p className="text-xl font-semibold text-foreground">{data.avgCommentsPerPR}</p>
              <p className="text-xs text-muted-foreground">Avg per PR</p>
            </div>

            <div>
              <p className="text-xl font-semibold text-foreground">{data.avgCommentsPerThread}</p>
              <p className="text-xs text-muted-foreground">Avg per Thread</p>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="pt-3 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">
                PRs with Comments:{" "}
                <span className="font-semibold text-foreground">{data.prsWithComments}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">
                With Unresolved:{" "}
                <span className="font-semibold text-foreground">
                  {data.prsWithUnresolvedThreads}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">
                All Resolved:{" "}
                <span className="font-semibold text-foreground">
                  {data.prsWithAllThreadsResolved}
                </span>
              </span>
            </div>
          </div>
        </div>

        {data.prsSampled && (
          <div className="text-xs text-muted-foreground italic pt-2">
            * Analysis based on {data.prsSampled} PRs (limited for performance)
          </div>
        )}
      </div>
    </div>
  );
}
