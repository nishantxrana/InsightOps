import React from "react";
import { MessageSquare, CheckCircle2, AlertCircle, TrendingUp, Loader2 } from "lucide-react";

export default function PRDiscussionSection({ data }) {
  // Loading state
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
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
        {/* Key Metrics - Thread-focused */}
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
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">
              {data.prsWithUnresolvedThreads}
            </p>
            <p className="text-xs text-muted-foreground">PRs Need Review</p>
          </div>
        </div>

        {/* Secondary Info */}
        <div className="pt-3 border-t border-border text-xs text-muted-foreground">
          {data.totalComments} total comments • {data.avgCommentsPerPR} avg per PR •{" "}
          {data.prsWithComments} PRs with discussions
        </div>
      </div>
    </div>
  );
}
