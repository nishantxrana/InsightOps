import React, { useCallback } from "react";
import { Shield } from "lucide-react";
import { Switch } from "../../components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function SecuritySection({ data, onChange }) {
  const handleChange = useCallback(
    (field, value) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          Security Settings
        </CardTitle>
        <CardDescription>Advanced security options (optional for most users)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info callout */}
        <div className="p-3 bg-muted/50 border rounded-lg">
          <p className="text-xs text-muted-foreground">
            These settings are optional. The default configuration is secure for most use cases.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhookSecret">Webhook Verification Secret</Label>
          <Input
            id="webhookSecret"
            type="password"
            placeholder="Optional: Enter a secret to verify webhook authenticity"
            value={data.webhookSecret}
            onChange={(e) => handleChange("webhookSecret", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            If set, Azure DevOps webhooks must include this secret to be accepted. Leave empty to
            accept all webhooks from your configured URLs.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiToken">External API Token</Label>
          <Input
            id="apiToken"
            type="password"
            placeholder="Optional: Token for external integrations"
            value={data.apiToken}
            onChange={(e) => handleChange("apiToken", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Generate a token to allow external services to send data to InsightOps.
          </p>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rateLimit">API Rate Limiting</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Limit requests to prevent abuse
              </p>
            </div>
            <Switch
              id="rateLimit"
              checked={data.enableRateLimit}
              onCheckedChange={(checked) => handleChange("enableRateLimit", checked)}
            />
          </div>
          {data.enableRateLimit && (
            <div className="mt-3 space-y-2">
              <Label htmlFor="maxRequests">Max Requests Per Minute (per user)</Label>
              <Input
                id="maxRequests"
                type="number"
                placeholder="100"
                value={data.maxRequestsPerMinute}
                onChange={(e) =>
                  handleChange("maxRequestsPerMinute", parseInt(e.target.value) || 100)
                }
                className="w-32"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
