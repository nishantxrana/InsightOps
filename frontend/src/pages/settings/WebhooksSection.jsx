import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { CopyButton } from "../../components/ui/shadcn-io/copy-button";
import { Input } from "../../components/ui/input";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { SettingsSectionHeader } from "@/components/kit/SettingsSectionHeader";
import { SettingsPanel } from "@/components/kit/SettingsPanel";
import { SettingRow } from "@/components/kit/SettingRow";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { InlineError } from "@/components/kit/InlineError";
import { SkeletonPanel } from "@/components/kit/Skeletons";

const WEBHOOK_ROWS = [
  {
    key: "buildCompleted",
    label: "Build Completed",
    description: "Triggers when a build pipeline finishes (success or failure)",
  },
  {
    key: "pullRequestCreated",
    label: "Pull Request Created",
    description: "Triggers when a new pull request is opened",
  },
  {
    key: "workItemCreated",
    label: "Work Item Created",
    description: "Triggers when a bug, task, or user story is created",
  },
  {
    key: "workItemUpdated",
    label: "Work Item Updated",
    description: "Triggers when a work item's state or fields change",
  },
  {
    key: "releaseDeployment",
    label: "Release Deployment",
    description: "Triggers when a release deployment completes",
  },
];

export default function WebhooksSection() {
  const [webhookUrls, setWebhookUrls] = useState({});
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWebhookUrls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const currentOrgId = localStorage.getItem("currentOrganizationId");
      const headers = { Authorization: `Bearer ${token}` };
      if (currentOrgId) headers["X-Organization-ID"] = currentOrgId;

      const response = await axios.get("/api/webhooks/urls", { headers });
      if (response.data.success) {
        setWebhookUrls(response.data.webhookUrls || {});
        setOrganizationName(response.data.organizationName || "");
      } else {
        setError(response.data.error || "Failed to load webhook URLs");
        setWebhookUrls({});
      }
    } catch (err) {
      setError(
        err.userMessage || err.response?.data?.error || err.message || "Failed to load webhook URLs"
      );
      setWebhookUrls({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhookUrls();
  }, [loadWebhookUrls]);

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="Azure DevOps Webhook URLs"
        description="Copy these URLs to configure webhooks in your Azure DevOps project settings."
        actions={organizationName ? <StatusBadge tone="neutral" label={organizationName} /> : null}
      />

      <StatusCallout tone="info" title="Quick Setup">
        <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs">
          <li>Copy a webhook URL below</li>
          <li>Go to Azure DevOps → Project Settings → Service Hooks</li>
          <li>Create a new &quot;Web Hooks&quot; subscription</li>
          <li>Select the event type and paste the URL</li>
        </ol>
        <a
          href="https://dev.azure.com/_settings/serviceHooks"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          Open Azure DevOps Service Hooks →
        </a>
      </StatusCallout>

      {loading ? <SkeletonPanel /> : null}

      {!loading && error ? <InlineError message={error} onRetry={loadWebhookUrls} /> : null}

      {!loading && !error ? (
        <SettingsPanel>
          {WEBHOOK_ROWS.map((row) => {
            const url = webhookUrls[row.key] || "";
            return (
              <SettingRow
                key={row.key}
                id={`webhook-${row.key}`}
                htmlFor={`webhook-input-${row.key}`}
                label={row.label}
                description={row.description}
                align="start"
              >
                <div className="flex items-center gap-2">
                  <Input
                    id={`webhook-input-${row.key}`}
                    readOnly
                    value={url}
                    className="font-mono text-xs bg-muted"
                  />
                  <CopyButton
                    content={url}
                    variant="outline"
                    aria-label={`Copy ${row.label} URL`}
                  />
                </div>
              </SettingRow>
            );
          })}
        </SettingsPanel>
      ) : null}
    </div>
  );
}
