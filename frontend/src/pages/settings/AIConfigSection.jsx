import { useState, useCallback } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";
import { cn } from "@/lib/utils";
import { SettingsSectionHeader } from "@/components/kit/SettingsSectionHeader";
import { SettingsPanel } from "@/components/kit/SettingsPanel";
import { SettingRow } from "@/components/kit/SettingRow";
import { StatusCallout } from "@/components/kit/StatusCallout";

const PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    blurb: "Best for: Code analysis, detailed explanations.",
    keyField: "openaiApiKey",
    keyId: "openaiKey",
    placeholder: "sk-...",
    docsHref: "https://platform.openai.com/api-keys",
  },
  {
    id: "groq",
    label: "Groq",
    blurb: "Best for: Fast responses, high throughput. Free tier available.",
    keyField: "groqApiKey",
    keyId: "groqKey",
    placeholder: "gsk_...",
    docsHref: "https://console.groq.com/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    blurb: "Best for: Cost-effective, good general purpose. Generous free tier.",
    keyField: "geminiApiKey",
    keyId: "geminiKey",
    placeholder: "AIza...",
    docsHref: "https://aistudio.google.com/apikey",
  },
];

function hasConfiguredKey(data) {
  const key =
    data.provider === "openai"
      ? data.openaiApiKey
      : data.provider === "groq"
        ? data.groqApiKey
        : data.geminiApiKey;
  return Boolean(key && key.trim());
}

export default function AIConfigSection({ data, onChange, errors }) {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState({});
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const handleChange = useCallback(
    (field, value) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const handleProviderChange = useCallback(
    (newProvider) => {
      if (data.provider !== newProvider) {
        onChange({ ...data, provider: newProvider, model: "" });
        setModels([]);
      }
    },
    [data, onChange]
  );

  const toggleSecretVisibility = useCallback((field) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const fetchModels = useCallback(async () => {
    if (loadingModels || !data.provider) return;
    setLoadingModels(true);
    try {
      const token = localStorage.getItem("token");
      const currentOrgId = localStorage.getItem("currentOrganizationId");
      const headers = { Authorization: `Bearer ${token}` };
      if (currentOrgId) headers["X-Organization-ID"] = currentOrgId;

      const response = await axios.get(`/api/ai/models/${data.provider}`, { headers });
      setModels(response.data.models || []);
    } catch (error) {
      setModels([]);
      const message = error.userMessage || error.response?.data?.error || "Failed to load models";
      toast({ title: "Failed to Load Models", description: message, variant: "destructive" });
    } finally {
      setLoadingModels(false);
    }
  }, [loadingModels, data.provider, toast]);

  const activeProvider = PROVIDERS.find((p) => p.id === data.provider) || PROVIDERS[2];
  const configured = hasConfiguredKey(data);

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="AI Configuration"
        description="Configure your AI provider and model settings"
      />

      {!configured ? (
        <StatusCallout tone="warning" title="No API key configured">
          Select a provider and enter an API key to enable AI insights across the app.
        </StatusCallout>
      ) : null}

      <div>
        <p id="ai-provider-label" className="mb-2 text-sm font-medium text-foreground">
          AI Provider
        </p>
        <div
          role="radiogroup"
          aria-labelledby="ai-provider-label"
          className="grid gap-2 sm:grid-cols-3"
        >
          {PROVIDERS.map((provider) => {
            const selected = data.provider === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleProviderChange(provider.id)}
                className={cn(
                  "rounded-panel border px-3 py-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  selected
                    ? "border-foreground bg-muted"
                    : "border-border bg-surface hover:bg-muted/50"
                )}
              >
                <div className="text-sm font-medium text-foreground">{provider.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{provider.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      <SettingsPanel>
        <SettingRow
          id="ai-api-key"
          htmlFor={activeProvider.keyId}
          label={`${activeProvider.label} API Key`}
          description={
            <>
              {activeProvider.blurb}{" "}
              <a
                href={activeProvider.docsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get API key →
              </a>
            </>
          }
          align="start"
        >
          <div className="relative">
            <Input
              id={activeProvider.keyId}
              type={showSecrets[activeProvider.id] ? "text" : "password"}
              placeholder={activeProvider.placeholder}
              value={data[activeProvider.keyField] || ""}
              onChange={(e) => handleChange(activeProvider.keyField, e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-9"
              onClick={() => toggleSecretVisibility(activeProvider.id)}
              aria-label={showSecrets[activeProvider.id] ? "Hide API key" : "Show API key"}
            >
              {showSecrets[activeProvider.id] ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
        </SettingRow>

        <SettingRow
          id="ai-model"
          htmlFor="ai-model-select"
          label="Model"
          error={errors?.aiModel}
          description="Load models after entering an API key, then choose one."
          align="start"
        >
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Select
                value={data.model}
                onValueChange={(value) => handleChange("model", value)}
                disabled={!data.provider}
              >
                <SelectTrigger id="ai-model-select">
                  <SelectValue
                    placeholder={
                      !data.provider
                        ? "Select a provider first"
                        : loadingModels
                          ? "Loading models..."
                          : models.length === 0
                            ? "Click refresh to load models"
                            : "Select a model"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {loadingModels && (
                      <SelectItem value="loading" disabled>
                        Loading models...
                      </SelectItem>
                    )}
                    {!loadingModels && models.length === 0 && data.provider && (
                      <SelectItem value="no-models" disabled>
                        Enter API key and click refresh
                      </SelectItem>
                    )}
                    {models.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={fetchModels}
              disabled={!data.provider || loadingModels}
              aria-label="Refresh models"
            >
              <RefreshCw className={`h-4 w-4 ${loadingModels ? "animate-spin" : ""}`} aria-hidden />
            </Button>
          </div>
        </SettingRow>
      </SettingsPanel>
    </div>
  );
}
