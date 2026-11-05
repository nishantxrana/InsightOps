import { useCallback } from "react";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { SettingsSectionHeader } from "@/components/kit/SettingsSectionHeader";
import { SettingsPanel } from "@/components/kit/SettingsPanel";
import { SettingRow } from "@/components/kit/SettingRow";

export default function NotificationsSection({ data, onChange }) {
  const handleChange = useCallback(
    (field, value) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="Notifications"
        description="Configure notification settings for Azure DevOps events"
      />

      <SettingsPanel>
        <SettingRow
          id="notifications-enabled"
          htmlFor="notifications-enabled"
          label="Enable notifications"
          description="Get notified about build failures, idle PRs, and overdue work items"
        >
          <div className="flex justify-end">
            <Switch
              id="notifications-enabled"
              checked={data.enabled}
              onCheckedChange={(checked) => handleChange("enabled", checked)}
            />
          </div>
        </SettingRow>
      </SettingsPanel>

      <SettingsPanel
        title="Google Chat"
        description="Send notifications to a Google Chat space"
        className={!data.enabled ? "opacity-50 pointer-events-none" : undefined}
      >
        <SettingRow
          id="gchat-enabled"
          htmlFor="gchat-enabled"
          label="Enable Google Chat"
          description="Deliver alerts to the webhook below"
        >
          <div className="flex justify-end">
            <Switch
              id="gchat-enabled"
              checked={data.googleChatEnabled}
              onCheckedChange={(checked) => handleChange("googleChatEnabled", checked)}
              disabled={!data.enabled}
            />
          </div>
        </SettingRow>

        {data.googleChatEnabled ? (
          <SettingRow
            id="gchat-url"
            htmlFor="gchat-webhook-url"
            label="Webhook URL"
            description={
              <a
                href="https://developers.google.com/chat/how-tos/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                How to create a webhook →
              </a>
            }
            align="start"
          >
            <Input
              id="gchat-webhook-url"
              placeholder="https://chat.googleapis.com/v1/spaces/..."
              value={data.googleChatWebhookUrl}
              onChange={(e) => handleChange("googleChatWebhookUrl", e.target.value)}
              disabled={!data.enabled}
              className="font-mono text-sm"
            />
          </SettingRow>
        ) : null}
      </SettingsPanel>

      <SettingsPanel title="More integrations">
        <SettingRow id="teams-coming-soon" label="Microsoft Teams" description="Not available yet">
          <div className="flex items-center justify-end gap-2">
            <StatusBadge tone="neutral" label="Coming soon" />
            <Switch disabled aria-label="Microsoft Teams (coming soon)" />
          </div>
        </SettingRow>
        <SettingRow id="slack-coming-soon" label="Slack" description="Not available yet">
          <div className="flex items-center justify-end gap-2">
            <StatusBadge tone="neutral" label="Coming soon" />
            <Switch disabled aria-label="Slack (coming soon)" />
          </div>
        </SettingRow>
      </SettingsPanel>
    </div>
  );
}
