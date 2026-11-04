import { useMemo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   onSync: () => void,
 *   isSyncing?: boolean,
 *   lastSyncedAt?: Date | string | number | null,
 *   className?: string,
 * }} props
 */
export function SyncButton({ onSync, isSyncing = false, lastSyncedAt, className }) {
  const relative = useMemo(() => {
    if (!lastSyncedAt) return null;
    try {
      const date = lastSyncedAt instanceof Date ? lastSyncedAt : new Date(lastSyncedAt);
      if (Number.isNaN(date.getTime())) return null;
      return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch {
      return null;
    }
  }, [lastSyncedAt]);

  const announcement = isSyncing ? "Syncing…" : relative ? `Updated ${relative}` : "Ready to sync";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSync}
        disabled={isSyncing}
        aria-busy={isSyncing}
      >
        {isSyncing ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="size-3.5" aria-hidden="true" />
        )}
        Sync
      </Button>
      {relative && !isSyncing ? (
        <span className="text-xs text-muted-foreground tabular-nums">Updated {relative}</span>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
