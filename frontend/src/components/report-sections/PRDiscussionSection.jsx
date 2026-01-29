import React from "react";
import { MessageSquare } from "lucide-react";

export default function PRDiscussionSection({ data }) {
  // Skeleton loading state
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
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
          <div className="h-3 w-64 bg-muted-foreground/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
        </h3>
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  // Empty state
  if (data.totalThreads === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
        </h3>
        <p className="text-sm text-muted-foreground">
          No discussions found in the selected date range.
        </p>
      </div>
    );
  }

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        PR Discussion Health
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground">{data.totalComments}</p>
            <p className="text-xs text-muted-foreground">Total Comments</p>
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{data.avgCommentsPerPR}</p>
            <p className="text-xs text-muted-foreground">Avg per PR</p>
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{data.resolvedThreads}</p>
            <p className="text-xs text-muted-foreground">Resolved Threads</p>
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{data.prsWithUnresolvedThreads}</p>
            <p className="text-xs text-muted-foreground">PRs Need Review</p>
          </div>
        </div>

        <div className="pt-3 border-t border-border text-xs text-muted-foreground">
          {data.totalThreads} discussion threads • {data.prsWithComments} PRs with comments •{" "}
          {data.totalPRsAnalyzed} PRs analyzed
        </div>
      </div>
    </div>
  );
}
