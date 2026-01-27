import React from "react";
import { CheckSquare, Plus, CheckCircle, AlertTriangle } from "lucide-react";

export default function WorkItemsSection({ data }) {
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Work Items
        </h3>
        <p className="text-sm text-destructive">Error: {data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <CheckSquare className="h-4 w-4" />
        Work Items
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">{data.created}</p>
          <p className="text-xs text-muted-foreground">Created</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-green-500 dark:text-green-400">{data.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>

        <div>
          <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{data.overdue}</p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {data.stateDistribution && Object.keys(data.stateDistribution).length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">State Distribution</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(data.stateDistribution).map(([state, count]) => (
              <div key={state} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{state}:</span>
                <span className="font-semibold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
