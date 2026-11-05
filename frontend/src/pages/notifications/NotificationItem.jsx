import { AlertTriangle, Bell, CheckCircle, ExternalLink, XCircle } from "lucide-react";

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/shadcn-io/copy-button";
import { TimeAgo } from "@/components/kit/DataTable";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { notificationSeverity } from "@/components/kit/statusMaps";
import { cn } from "@/lib/utils";

import { TYPE_BADGE_LABELS } from "./constants";
import { DigestList } from "./DigestList";
import { NotificationMeta } from "./NotificationMeta";
import { humanSubType, messagePreview, TONE_ACCENT, TONE_ICON } from "./helpers";

function SeverityIcon({ tone }) {
  const className = cn("size-4 shrink-0", TONE_ICON[tone] || TONE_ICON.neutral);
  if (tone === "danger") return <XCircle className={className} aria-hidden="true" />;
  if (tone === "warning") return <AlertTriangle className={className} aria-hidden="true" />;
  if (tone === "success") return <CheckCircle className={className} aria-hidden="true" />;
  return <Bell className={className} aria-hidden="true" />;
}

/**
 * Single accordion feed row.
 * @param {{
 *   notification: object,
 *   onExport: (notification: object) => void,
 * }} props
 */
export function NotificationItem({ notification, onExport }) {
  const severity = notificationSeverity(notification);
  const tone = severity.tone || "neutral";
  const isUnread = !notification.read;
  const typeLabel = TYPE_BADGE_LABELS[notification.type] || notification.type || "Notification";
  const subLabel = humanSubType(notification.subType);
  const preview = messagePreview(notification.message);

  return (
    <AccordionItem
      value={notification._id}
      className={cn(
        "overflow-hidden rounded-panel border border-border border-l-4 bg-background",
        TONE_ACCENT[tone] || TONE_ACCENT.neutral
      )}
    >
      <AccordionTrigger className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-3 hover:no-underline sm:px-4 sm:py-3.5 [&[data-state=open]]:border-b [&[data-state=open]]:border-border">
        <div className="flex min-w-0 flex-col gap-2 text-left sm:flex-row sm:items-start sm:gap-3">
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:min-w-[12rem]">
            <SeverityIcon tone={tone} />
            <StatusBadge tone="neutral" label={typeLabel} dot={false} />
            {subLabel ? <StatusBadge tone={tone} label={subLabel} /> : null}
            {isUnread ? (
              <span
                className="size-2 shrink-0 rounded-full bg-info"
                title="Unread"
                aria-label="Unread"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3
              className={cn(
                "truncate text-sm font-medium sm:text-[15px]",
                isUnread ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {notification.title}
            </h3>
            {preview ? <p className="truncate text-xs text-muted-foreground">{preview}</p> : null}
            <TimeAgo date={notification.createdAt} className="text-xs" />
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-3 pb-4 pt-3 sm:px-4">
        <div className="w-full space-y-4 overflow-hidden">
          <NotificationMeta notification={notification} />

          {notification.type === "overdue" && notification.metadata?.items ? (
            <DigestList kind="overdue" notification={notification} onExport={onExport} />
          ) : null}

          {notification.type === "idle-pr" && notification.metadata?.pullRequests ? (
            <DigestList kind="idle-pr" notification={notification} onExport={onExport} />
          ) : null}

          {notification.metadata?.url ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
                <a href={notification.metadata.url} target="_blank" rel="noopener noreferrer">
                  View in Azure DevOps
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </Button>
              <CopyButton content={notification.metadata.url} variant="outline" size="sm" />
            </div>
          ) : null}

          {notification.channels?.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Delivery:</span>
              {notification.channels.map((channel, idx) => (
                <StatusBadge
                  key={`${channel.platform}-${idx}`}
                  tone={channel.status === "sent" ? "success" : "danger"}
                  label={`${channel.platform}: ${channel.status}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
