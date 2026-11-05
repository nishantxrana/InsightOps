import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Eye, EyeOff, RefreshCw, ChevronDown } from "lucide-react";
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
import { Switch } from "../../components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { useToast } from "../../hooks/use-toast";
import { cn } from "@/lib/utils";
import { SettingsSectionHeader } from "@/components/kit/SettingsSectionHeader";
import { SettingsPanel } from "@/components/kit/SettingsPanel";
import { SettingRow } from "@/components/kit/SettingRow";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { previewAzureEndpoint } from "./azureEndpointPreview";

const MASK = "********";

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
  {
    id: "azure",
    label: "Azure AI Foundry",
    subtitle: "Microsoft Foundry / Azure OpenAI",
    blurb: "Best for: Enterprise Azure deployments and Foundry models.",
    keyField: "azureApiKey",
    keyId: "azureKey",
    placeholder: "Azure API key",
    docsHref: "https://learn.microsoft.com/azure/foundry/foundry-models/concepts/endpoints",
  },
];

const AI_FEATURES = [
  "Sprint summary",
  "Build failure analysis",
  "PR summaries",
  "Work item explanations",
  "Release diagnosis",
  "Notifications",
];

function authHeaders() {
  const token = localStorage.getItem("token");
  const currentOrgId = localStorage.getItem("currentOrganizationId");
  const headers = { Authorization: `Bearer ${token}` };
  if (currentOrgId) headers["X-Organization-ID"] = currentOrgId;
  return headers;
}

function formatRelativeTime(isoOrDate) {
  if (!isoOrDate) return null;
  const at = new Date(isoOrDate).getTime();
  if (Number.isNaN(at)) return null;
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function providerLabel(id) {
  return PROVIDERS.find((p) => p.id === id)?.label || id;
}

function statusFromData(data, status) {
  const enabled = data.enabled !== false;
  if (!enabled) {
    return { tone: "neutral", label: "Disabled" };
  }
  if (status?.lastTest && status.lastTest.ok === false) {
    return { tone: "danger", label: "Last test failed" };
  }
  const configured =
    status?.configured ??
    (() => {
      if (data.provider === "azure") {
        const key = data.azureApiKey;
        const hasKey =
          (key && key !== MASK) || status?.keyStatus?.azure?.saved || data.keyStatus?.azure?.saved;
        return Boolean(hasKey && data.model && data.azure?.endpoint);
      }
      const keyField = PROVIDERS.find((p) => p.id === data.provider)?.keyField;
      const key = keyField ? data[keyField] : "";
      const saved =
        status?.keyStatus?.[data.provider]?.saved || data.keyStatus?.[data.provider]?.saved;
      return Boolean((key && key !== MASK) || saved) && Boolean(data.model);
    })();

  if (!configured) {
    return { tone: "neutral", label: "Not configured" };
  }
  return {
    tone: "success",
    label: `Ready: ${providerLabel(data.provider)} / ${data.model}`,
  };
}

function keyState(data, providerId, keyStatus) {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  const value = data[provider.keyField] || "";
  const savedMeta = keyStatus?.[providerId] || data.keyStatus?.[providerId];
  const isMask = value === MASK;
  const isEmpty = !value.trim();
  const isTyped = Boolean(value.trim()) && !isMask;

  if (isTyped) return { kind: "unsaved", value };
  if (savedMeta?.saved || isMask) {
    return { kind: "saved", last4: savedMeta?.last4, value: MASK };
  }
  if (isEmpty) return { kind: "none", value: "" };
  return { kind: "none", value: "" };
}

export default function AIConfigSection({
  data,
  onChange,
  errors,
  onValidateField,
  aiStatus,
  onStatusRefresh,
}) {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState({});
  const [replacingKey, setReplacingKey] = useState({});
  const [models, setModels] = useState([]);
  const [modelsSource, setModelsSource] = useState(null);
  const [modelsWarning, setModelsWarning] = useState(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [verified, setVerified] = useState(false);
  const [clearProvider, setClearProvider] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const debounceRef = useRef(null);
  const providerRefs = useRef({});

  const activeProvider = PROVIDERS.find((p) => p.id === data.provider) || PROVIDERS[2];
  const keyStatus = aiStatus?.keyStatus || data.keyStatus;
  const statusBadge = statusFromData(data, aiStatus);
  const lastTestAt = aiStatus?.lastTest?.at || data.lastTest?.at;
  const relativeTested = formatRelativeTime(lastTestAt);
  const enabled = data.enabled !== false;
  const currentKey = keyState(data, data.provider, keyStatus);
  const endpointPreview =
    data.provider === "azure" ? previewAzureEndpoint(data.azure?.endpoint || "") : null;

  const handleChange = useCallback(
    (field, value) => {
      setVerified(false);
      setTestResult(null);
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const handleNestedAzure = useCallback(
    (field, value) => {
      setVerified(false);
      setTestResult(null);
      onChange({
        ...data,
        azure: { ...(data.azure || { endpoint: "", apiStyle: "auto" }), [field]: value },
      });
    },
    [data, onChange]
  );

  const handleProviderChange = useCallback(
    (newProvider) => {
      if (data.provider === newProvider) return;
      setVerified(false);
      setTestResult(null);
      setModels([]);
      setModelsSource(null);
      setModelsWarning(null);
      setModelQuery("");
      setReplacingKey((prev) => ({ ...prev, [data.provider]: false }));
      // Keep other providers' key fields; clear model when switching
      onChange({
        ...data,
        provider: newProvider,
        model: data.provider === newProvider ? data.model : "",
      });
    },
    [data, onChange]
  );

  const onProviderKeyDown = useCallback(
    (e, index) => {
      if (
        e.key !== "ArrowRight" &&
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowDown" &&
        e.key !== "ArrowUp"
      ) {
        return;
      }
      e.preventDefault();
      const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const next = (index + delta + PROVIDERS.length) % PROVIDERS.length;
      handleProviderChange(PROVIDERS[next].id);
      providerRefs.current[PROVIDERS[next].id]?.focus();
    },
    [handleProviderChange]
  );

  const fetchModels = useCallback(
    async (opts = {}) => {
      const provider = opts.provider || data.provider;
      if (!provider || provider === "azure" || loadingModels) return;
      setLoadingModels(true);
      try {
        const response = await axios.get(`/api/ai/models/${provider}`, { headers: authHeaders() });
        setModels(response.data.models || []);
        setModelsSource(response.data.source || null);
        setModelsWarning(response.data.warning || null);
      } catch (error) {
        setModels([]);
        setModelsSource("static");
        const message = error.userMessage || error.response?.data?.error || "Failed to load models";
        setModelsWarning({ code: "UNKNOWN", message });
        if (!opts.silent) {
          toast({ title: "Failed to Load Models", description: message, variant: "destructive" });
        }
      } finally {
        setLoadingModels(false);
      }
    },
    [data.provider, loadingModels, toast]
  );

  // Auto-load models when provider changes or key becomes available (debounced)
  useEffect(() => {
    if (data.provider === "azure") return;
    const ks = keyState(data, data.provider, keyStatus);
    const hasUsableKey = ks.kind === "saved" || ks.kind === "unsaved";
    if (!hasUsableKey) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchModels({ silent: true });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key/provider driven
  }, [data.provider, data.openaiApiKey, data.groqApiKey, data.geminiApiKey]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.value?.toLowerCase().includes(q) ||
        m.label?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
    );
  }, [models, modelQuery]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const body = {
        provider: data.provider,
        model: data.model,
      };
      const ks = keyState(data, data.provider, keyStatus);
      if (ks.kind === "unsaved") {
        body.apiKey = data[activeProvider.keyField];
      }
      if (data.provider === "azure") {
        body.azure = {
          endpoint: data.azure?.endpoint || "",
          apiStyle: data.azure?.apiStyle || "auto",
        };
      }

      const response = await axios.post("/api/ai/test", body, { headers: authHeaders() });
      setTestResult({ ok: true, ...response.data });
      setVerified(true);
      onStatusRefresh?.();
    } catch (error) {
      const payload = error.response?.data;
      setTestResult({
        ok: false,
        error: payload?.error || {
          code: "UNKNOWN",
          message: error.userMessage || "Connection test failed",
          hint: "Check your settings and try again.",
        },
        latencyMs: payload?.latencyMs,
      });
      setVerified(false);
      onStatusRefresh?.();
    } finally {
      setTesting(false);
    }
  };

  const confirmClearKey = () => {
    if (!clearProvider) return;
    const provider = PROVIDERS.find((p) => p.id === clearProvider);
    const nextClear = Array.from(new Set([...(data.clearKeys || []), clearProvider]));
    onChange({
      ...data,
      [provider.keyField]: "",
      clearKeys: nextClear,
    });
    setReplacingKey((prev) => ({ ...prev, [clearProvider]: false }));
    setClearProvider(null);
    setVerified(false);
  };

  const startReplaceKey = () => {
    setReplacingKey((prev) => ({ ...prev, [data.provider]: true }));
    handleChange(activeProvider.keyField, "");
  };

  const showKeyInput =
    currentKey.kind === "none" || currentKey.kind === "unsaved" || replacingKey[data.provider];

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="AI Configuration"
        description="Configure your AI provider, credentials, and how AI is used"
      />

      <SettingsPanel title="Status">
        <SettingRow
          id="ai-status"
          label="Connection status"
          description={relativeTested ? `Last tested ${relativeTested}` : "Not tested yet"}
        >
          <div className="flex justify-end">
            <StatusBadge tone={statusBadge.tone} label={statusBadge.label} />
          </div>
        </SettingRow>

        <SettingRow
          id="ai-enabled"
          htmlFor="ai-enabled"
          label="Enable AI features"
          description="When off, interactive AI actions should stay disabled (enforced in a follow-up)."
        >
          <div className="flex justify-end">
            <Switch
              id="ai-enabled"
              checked={enabled}
              onCheckedChange={(checked) => handleChange("enabled", checked)}
            />
          </div>
        </SettingRow>

        <div className="border-t border-border py-4">
          <p className="mb-2 text-sm font-medium text-foreground">AI powers</p>
          <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {AI_FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </SettingsPanel>

      <div>
        <p id="ai-provider-label" className="mb-2 text-sm font-medium text-foreground">
          AI Provider
        </p>
        <div
          role="radiogroup"
          aria-labelledby="ai-provider-label"
          className="grid gap-2 sm:grid-cols-2"
        >
          {PROVIDERS.map((provider, index) => {
            const selected = data.provider === provider.id;
            const saved = keyStatus?.[provider.id]?.saved;
            return (
              <button
                key={provider.id}
                ref={(el) => {
                  providerRefs.current[provider.id] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleProviderChange(provider.id)}
                onKeyDown={(e) => onProviderKeyDown(e, index)}
                className={cn(
                  "rounded-panel border px-3 py-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  selected
                    ? "border-foreground bg-muted"
                    : "border-border bg-surface hover:bg-muted/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{provider.label}</div>
                    {provider.subtitle ? (
                      <p className="text-xs text-muted-foreground">{provider.subtitle}</p>
                    ) : null}
                  </div>
                  {saved ? <StatusBadge tone="success" label="Key saved" dot={false} /> : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{provider.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      <SettingsPanel title="Credentials">
        <SettingRow
          id="ai-api-key"
          htmlFor={activeProvider.keyId}
          label={`${activeProvider.label} API Key`}
          error={errors?.aiApiKey}
          description={
            currentKey.kind === "saved" && !replacingKey[data.provider]
              ? currentKey.last4
                ? `Key saved, ending ${currentKey.last4}`
                : "Key saved"
              : activeProvider.blurb
          }
          align="start"
        >
          {showKeyInput ? (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id={activeProvider.keyId}
                  type={showSecrets[activeProvider.id] ? "text" : "password"}
                  placeholder={activeProvider.placeholder}
                  value={
                    data[activeProvider.keyField] === MASK
                      ? ""
                      : data[activeProvider.keyField] || ""
                  }
                  onChange={(e) => {
                    const nextClear = (data.clearKeys || []).filter((p) => p !== data.provider);
                    onChange({
                      ...data,
                      [activeProvider.keyField]: e.target.value,
                      clearKeys: nextClear,
                    });
                    setVerified(false);
                    setTestResult(null);
                  }}
                  onBlur={() => onValidateField?.("aiApiKey")}
                  className="pr-10"
                  autoComplete="off"
                  aria-describedby={errors?.aiApiKey ? "ai-api-key-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() =>
                    setShowSecrets((prev) => ({
                      ...prev,
                      [activeProvider.id]: !prev[activeProvider.id],
                    }))
                  }
                  aria-label={showSecrets[activeProvider.id] ? "Hide API key" : "Show API key"}
                >
                  {showSecrets[activeProvider.id] ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
              {currentKey.kind === "unsaved" ||
              (replacingKey[data.provider] && data[activeProvider.keyField]) ? (
                <StatusBadge tone="warning" label="Unsaved" />
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={startReplaceKey}>
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClearProvider(data.provider)}
              >
                Remove
              </Button>
            </div>
          )}
        </SettingRow>

        {data.provider === "azure" ? (
          <>
            <SettingRow
              id="ai-azure-endpoint"
              htmlFor="ai-azure-endpoint-input"
              label="Endpoint"
              error={errors?.aiAzureEndpoint}
              description={
                endpointPreview?.ok
                  ? `Calls ${endpointPreview.baseUrl}`
                  : endpointPreview?.reason || "Azure OpenAI / Foundry resource endpoint"
              }
              align="start"
            >
              <Input
                id="ai-azure-endpoint-input"
                value={data.azure?.endpoint || ""}
                placeholder="https://YOUR-RESOURCE.openai.azure.com"
                onChange={(e) => handleNestedAzure("endpoint", e.target.value)}
                onBlur={() => onValidateField?.("aiAzureEndpoint")}
                aria-invalid={Boolean(errors?.aiAzureEndpoint)}
              />
            </SettingRow>

            <SettingRow
              id="ai-model"
              htmlFor="ai-deployment-input"
              label="Deployment name"
              error={errors?.aiModel}
              description="Use your deployment name, not the base model name"
              align="start"
            >
              <Input
                id="ai-deployment-input"
                value={data.model || ""}
                placeholder="my-gpt-deployment"
                onChange={(e) => handleChange("model", e.target.value)}
                onBlur={() => onValidateField?.("aiModel")}
                aria-invalid={Boolean(errors?.aiModel)}
              />
            </SettingRow>

            <div className="border-t border-border py-3">
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-1 px-0">
                    Advanced
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")}
                      aria-hidden
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <SettingRow
                    id="ai-api-style"
                    htmlFor="ai-api-style-select"
                    label="API style"
                    description="Auto tries Responses, then Chat Completions if the deployment does not support Responses."
                    align="start"
                  >
                    <Select
                      value={data.azure?.apiStyle || "auto"}
                      onValueChange={(value) => handleNestedAzure("apiStyle", value)}
                    >
                      <SelectTrigger id="ai-api-style-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="responses">Responses</SelectItem>
                        <SelectItem value="chat">Chat Completions</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>
        ) : (
          <SettingRow
            id="ai-model"
            htmlFor="ai-model-select"
            label="Model"
            error={errors?.aiModel}
            description="Models load after a key is saved or entered. You can also type a custom model id."
            align="start"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {modelsSource === "live" ? (
                  <StatusBadge tone="success" label="Live from provider" dot={false} />
                ) : modelsSource === "static" ? (
                  <StatusBadge tone="neutral" label="Default list" dot={false} />
                ) : null}
                {modelsWarning ? (
                  <span className="text-xs text-warning-foreground" role="status">
                    {modelsWarning.message}
                  </span>
                ) : null}
              </div>
              <Input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="Search models…"
                aria-label="Search models"
              />
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={data.model || undefined}
                    onValueChange={(value) => handleChange("model", value)}
                    disabled={!data.provider}
                  >
                    <SelectTrigger id="ai-model-select" aria-invalid={Boolean(errors?.aiModel)}>
                      <SelectValue
                        placeholder={
                          loadingModels
                            ? "Loading models..."
                            : models.length === 0
                              ? "Select or enter a model"
                              : "Select a model"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {loadingModels && (
                          <SelectItem value="__loading" disabled>
                            Loading models...
                          </SelectItem>
                        )}
                        {!loadingModels && filteredModels.length === 0 && (
                          <SelectItem value="__empty" disabled>
                            No models in list — type a custom id below
                          </SelectItem>
                        )}
                        {filteredModels.map((model) => (
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
                  onClick={() => fetchModels()}
                  disabled={!data.provider || loadingModels}
                  aria-label="Refresh models"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loadingModels ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                </Button>
              </div>
              <Input
                id="ai-custom-model"
                value={data.model || ""}
                onChange={(e) => handleChange("model", e.target.value)}
                onBlur={() => onValidateField?.("aiModel")}
                placeholder="Or enter a custom model id"
                aria-label="Custom model id"
              />
            </div>
          </SettingRow>
        )}

        <div className="border-t border-border py-3">
          <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-1 px-0">
                Where do I find these?
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", helpOpen && "rotate-180")}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2 text-xs text-muted-foreground">
              {data.provider === "azure" ? (
                <ol className="list-decimal space-y-1 pl-4">
                  <li>
                    In Microsoft Foundry / Azure OpenAI, open your resource and copy the endpoint
                    host (for example{" "}
                    <code className="text-foreground">https://YOUR-RESOURCE.openai.azure.com</code>
                    ).
                  </li>
                  <li>Copy an API key from the resource Keys and Endpoint page.</li>
                  <li>
                    Open Deployments and copy the{" "}
                    <strong className="font-medium text-foreground">deployment name</strong> (not
                    the base model name).
                  </li>
                  <li>
                    Docs:{" "}
                    <a
                      href={activeProvider.docsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Foundry endpoints
                    </a>
                  </li>
                </ol>
              ) : (
                <p>
                  Create an API key in the provider console, then choose a model from the loaded
                  list.{" "}
                  <a
                    href={activeProvider.docsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Open {activeProvider.label} docs
                  </a>
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SettingsPanel>

      <SettingsPanel>
        <SettingRow
          id="ai-test"
          label="Test connection"
          description="Sends a short request using the values above (typed key if present, otherwise the saved key)."
          align="start"
        >
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              {verified ? <StatusBadge tone="success" label="Verified" /> : null}
              <Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? "Testing…" : "Test connection"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground" aria-live="polite" role="status">
              {testResult?.ok ? (
                <p>
                  Connected in {(testResult.latencyMs / 1000).toFixed(1)}s
                  {testResult.reply ? ", model replied" : ""}
                  {testResult.apiStyleUsed ? ` (API style: ${testResult.apiStyleUsed})` : ""}
                </p>
              ) : null}
              {testResult && !testResult.ok ? (
                <div className="text-danger-foreground">
                  <p>{testResult.error?.message}</p>
                  {testResult.error?.hint ? (
                    <p className="mt-0.5 text-muted-foreground">{testResult.error.hint}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </SettingRow>
      </SettingsPanel>

      <SettingsPanel>
        <SettingRow
          id="ai-use-in-notifications"
          htmlFor="ai-use-in-notifications"
          label="Use AI in Google Chat notifications"
          description={
            enabled
              ? "When enabled, build/PR/work item text may be sent to your provider automatically for notification summaries."
              : "Turn on Enable AI features to use AI in notifications."
          }
        >
          <div className="flex justify-end">
            <Switch
              id="ai-use-in-notifications"
              checked={data.useInNotifications !== false}
              disabled={!enabled}
              onCheckedChange={(checked) => handleChange("useInNotifications", checked)}
            />
          </div>
        </SettingRow>
      </SettingsPanel>

      <AlertDialog
        open={Boolean(clearProvider)}
        onOpenChange={(open) => !open && setClearProvider(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved {providerLabel(clearProvider)} key from this organization after
              you save settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearKey}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
