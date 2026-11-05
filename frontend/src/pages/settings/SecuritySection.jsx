import { useCallback } from "react";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { SettingsSectionHeader } from "@/components/kit/SettingsSectionHeader";
import { SettingsPanel } from "@/components/kit/SettingsPanel";
import { SettingRow } from "@/components/kit/SettingRow";

export default function SecuritySection({ data, onChange }) {
  const handleChange = useCallback(
    (field, value) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="Security"
        description="Advanced security options (optional for most users)"
      />

      <StatusCallout tone="neutral" title="Optional">
        These settings are optional. The default configuration is secure for most use cases.
      </StatusCallout>

      <SettingsPanel>
        <SettingRow
          id="webhook-secret"
          htmlFor="webhookSecret"
          label="Webhook Verification Secret"
          description="If set, Azure DevOps webhooks must include this secret to be accepted. Leave empty to accept all webhooks from your configured URLs."
          align="start"
        >
          <Input
            id="webhookSecret"
            type="password"
            placeholder="Optional: Enter a secret to verify webhook authenticity"
            value={data.webhookSecret}
            onChange={(e) => handleChange("webhookSecret", e.target.value)}
          />
        </SettingRow>

        <SettingRow
          id="api-token"
          htmlFor="apiToken"
          label="External API Token"
          description="Generate a token to allow external services to send data to InsightOps."
          align="start"
        >
          <Input
            id="apiToken"
            type="password"
            placeholder="Optional: Token for external integrations"
            value={data.apiToken}
            onChange={(e) => handleChange("apiToken", e.target.value)}
          />
        </SettingRow>

        <SettingRow
          id="rate-limit"
          htmlFor="rateLimit"
          label="API Rate Limiting"
          description="Limit requests to prevent abuse"
        >
          <div className="flex justify-end">
            <Switch
              id="rateLimit"
              checked={data.enableRateLimit}
              onCheckedChange={(checked) => handleChange("enableRateLimit", checked)}
            />
          </div>
        </SettingRow>

        {data.enableRateLimit ? (
          <SettingRow
            id="max-requests"
            htmlFor="maxRequests"
            label="Max Requests Per Minute"
            description="Per user"
          >
            <div className="flex justify-end">
              <Input
                id="maxRequests"
                type="number"
                placeholder="100"
                value={data.maxRequestsPerMinute}
                onChange={(e) =>
                  handleChange("maxRequestsPerMinute", parseInt(e.target.value, 10) || 100)
                }
                className="w-32"
              />
            </div>
          </SettingRow>
        ) : null}
      </SettingsPanel>
    </div>
  );
}
