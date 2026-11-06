import OpenAI from "openai";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../utils/logger.js";
import { metrics } from "../observability/metrics.js";
import { normalizeAzureEndpoint } from "./azureEndpoint.js";
import {
  isResponsesUnsupportedError,
  isUnsupportedParameterError,
  redactSecrets,
} from "./errors.js";
import { emptyResponseError } from "./http.js";
import {
  ADO_DATA_RULE,
  PROMPT_CAPS,
  redactForPrompt,
  sanitizeAdoField,
  wrapAdoContent,
} from "./promptSafety.js";

const SDK_TIMEOUT_MS = 45000;
const SDK_MAX_RETRIES = 1;
/** Short probe for Azure apiStyle=auto Responses attempt before Chat fallback. */
const AZURE_RESPONSES_PROBE_MS = 12000;
const AZURE_STYLE_CACHE_TTL_MS = 60 * 60 * 1000;

/** In-memory apiStyle decisions: key = host::deployment → { style, expiresAt } */
const azureApiStyleCache = new Map();

function azureStyleCacheKey(host, deployment) {
  return `${host}::${deployment}`;
}

function getCachedAzureStyle(host, deployment) {
  const key = azureStyleCacheKey(host, deployment);
  const entry = azureApiStyleCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    azureApiStyleCache.delete(key);
    return null;
  }
  return entry.style;
}

function setCachedAzureStyle(host, deployment, style) {
  azureApiStyleCache.set(azureStyleCacheKey(host, deployment), {
    style,
    expiresAt: Date.now() + AZURE_STYLE_CACHE_TTL_MS,
  });
}

/** Test helper — clears the in-memory Azure apiStyle cache. */
export function clearAzureApiStyleCache() {
  azureApiStyleCache.clear();
}

function messagesToResponsesInput(messages) {
  return (messages || []).map((m) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
}

/**
 * AI Client - Isolated instance for a specific organization/user
 * NOT shared across requests - created fresh per request context
 */
export class AIClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.azureHost = null;
    this._initialize();
  }

  _initialize() {
    const { provider, openaiApiKey, groqApiKey, geminiApiKey, azureApiKey, azureEndpoint } =
      this.config;
    const timeout = this.config.timeoutMs ?? SDK_TIMEOUT_MS;
    const maxRetries = this.config.maxRetries ?? SDK_MAX_RETRIES;

    if (provider === "openai") {
      if (!openaiApiKey) {
        throw new Error("OpenAI API key is required when using OpenAI provider");
      }
      this.client = new OpenAI({
        apiKey: openaiApiKey,
        timeout,
        maxRetries,
      });
    } else if (provider === "groq") {
      if (!groqApiKey) {
        throw new Error("Groq API key is required when using Groq provider");
      }
      this.client = new Groq({
        apiKey: groqApiKey,
        timeout,
        maxRetries,
      });
    } else if (provider === "gemini") {
      if (!geminiApiKey) {
        throw new Error("Gemini API key is required when using Gemini provider");
      }
      // @google/generative-ai does not accept timeout/maxRetries on the client
      this.client = new GoogleGenerativeAI(geminiApiKey);
    } else if (provider === "azure") {
      if (!azureApiKey) {
        throw new Error("Azure API key is required when using Azure provider");
      }
      const normalized = normalizeAzureEndpoint(azureEndpoint);
      if (!normalized.ok) {
        const err = new Error(normalized.reason || "Invalid Azure endpoint");
        err.code = "invalid_endpoint";
        throw err;
      }
      this.azureHost = normalized.host;
      this.client = new OpenAI({
        apiKey: azureApiKey,
        baseURL: normalized.baseUrl,
        timeout,
        maxRetries,
      });
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  async generateCompletion(messages, options = {}) {
    const result = await this.generateCompletionWithMeta(messages, options);
    return result.text;
  }

  /**
   * @returns {Promise<{ text: string, meta: { provider: string, model: string, apiStyleUsed?: string, latencyMs: number, usage?: object } }>}
   */
  async generateCompletionWithMeta(messages, options = {}) {
    const started = Date.now();
    const defaultOptions = {
      model: this.config.model,
      max_tokens: 500,
      temperature: 0.3,
    };
    const completionOptions = { ...defaultOptions, ...options };
    const provider = this.config.provider;

    let text;
    let apiStyleUsed;
    let usage;

    if (provider === "openai") {
      const response = await this.client.chat.completions.create({
        ...completionOptions,
        messages,
      });
      text = response?.choices?.[0]?.message?.content;
      usage = response?.usage;
      if (!text || text.trim() === "") {
        throw emptyResponseError();
      }
    } else if (provider === "groq") {
      const response = await this.client.chat.completions.create({
        ...completionOptions,
        messages,
      });
      text = response?.choices?.[0]?.message?.content;
      usage = response?.usage;
      if (!text || text.trim() === "") {
        throw emptyResponseError();
      }
    } else if (provider === "gemini") {
      const model = this.client.getGenerativeModel({ model: completionOptions.model });
      const systemMessage = messages.find((m) => m.role === "system");
      const userMessage = messages.find((m) => m.role === "user");
      let prompt = "";
      if (systemMessage) prompt += `${systemMessage.content}\n\n`;
      if (userMessage) prompt += userMessage.content;
      const result = await model.generateContent(prompt);
      text = result?.response?.text();
      if (!text || text.trim() === "") {
        throw emptyResponseError();
      }
    } else if (provider === "azure") {
      const azureResult = await this._generateAzure(messages, completionOptions);
      text = azureResult.text;
      apiStyleUsed = azureResult.apiStyleUsed;
      usage = azureResult.usage;
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return {
      text,
      meta: {
        provider,
        model: completionOptions.model,
        ...(apiStyleUsed ? { apiStyleUsed } : {}),
        latencyMs: Date.now() - started,
        ...(usage ? { usage } : {}),
      },
    };
  }

  async _generateAzure(messages, completionOptions) {
    const deployment = completionOptions.model;
    const apiStyle = this.config.azureApiStyle || "auto";
    const host = this.azureHost || "unknown";

    let style = apiStyle;
    if (apiStyle === "auto") {
      style = getCachedAzureStyle(host, deployment) || "responses";
    }

    if (style === "responses" || (apiStyle === "auto" && style === "responses")) {
      try {
        // In auto mode, don't wait the full SDK timeout on Responses — many
        // deployments need Chat Completions and would otherwise stall ~45–90s.
        const result =
          apiStyle === "auto"
            ? await this._withTimeout(
                this._azureResponses(messages, completionOptions),
                this.config.azureResponsesProbeMs ?? AZURE_RESPONSES_PROBE_MS,
                "Azure Responses probe timed out"
              )
            : await this._azureResponses(messages, completionOptions);
        if (apiStyle === "auto") setCachedAzureStyle(host, deployment, "responses");
        return { ...result, apiStyleUsed: "responses" };
      } catch (err) {
        if (apiStyle === "auto" && this._shouldFallbackToChat(err)) {
          logger.info("Azure Responses unavailable; falling back to Chat Completions", {
            host,
            deployment,
            reason: err?.code || err?.message?.slice?.(0, 120),
          });
          const result = await this._azureChat(messages, completionOptions);
          setCachedAzureStyle(host, deployment, "chat");
          return { ...result, apiStyleUsed: "chat" };
        }
        throw err;
      }
    }

    const result = await this._azureChat(messages, completionOptions);
    if (apiStyle === "auto") setCachedAzureStyle(host, deployment, "chat");
    return { ...result, apiStyleUsed: "chat" };
  }

  _shouldFallbackToChat(err) {
    if (isResponsesUnsupportedError(err)) return true;
    const msg = String(err?.message || "");
    if (err?.code === "ETIMEDOUT" || err?.code === "ABORT_ERR" || err?.name === "AbortError") {
      return true;
    }
    if (/timed out|timeout|empty response/i.test(msg)) return true;
    // 404/400 on the responses route often means the deployment only supports chat
    const status = err?.status || err?.statusCode;
    if (status === 404) return true;
    return false;
  }

  _withTimeout(promise, ms, message) {
    let timer;
    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(message || "Request timed out");
          err.code = "ETIMEDOUT";
          reject(err);
        }, ms);
      }),
    ]);
  }

  async _azureResponses(messages, completionOptions) {
    const body = {
      model: completionOptions.model,
      input: messagesToResponsesInput(messages),
      max_output_tokens: completionOptions.max_tokens,
    };
    if (completionOptions.reasoning_effort) {
      body.reasoning = { effort: completionOptions.reasoning_effort };
    }
    const response = await this.client.responses.create(body);
    const text = response?.output_text;
    if (!text || String(text).trim() === "") {
      // Reasoning models may spend the token budget on thinking; treat as
      // fallback-worthy in auto rather than a hard failure after a long wait.
      throw emptyResponseError();
    }
    return { text, usage: response?.usage };
  }

  async _azureChat(messages, completionOptions) {
    const base = {
      model: completionOptions.model,
      messages,
      max_completion_tokens: completionOptions.max_tokens,
    };
    if (completionOptions.reasoning_effort) {
      base.reasoning_effort = completionOptions.reasoning_effort;
    }

    try {
      const response = await this.client.chat.completions.create(base);
      const text = response?.choices?.[0]?.message?.content;
      if (!text || text.trim() === "") {
        throw emptyResponseError();
      }
      return { text, usage: response?.usage };
    } catch (err) {
      if (isUnsupportedParameterError(err)) {
        // Retry without the unsupported field(s): try max_tokens, drop reasoning_effort
        const retryBody = {
          model: completionOptions.model,
          messages,
          max_tokens: completionOptions.max_tokens,
        };
        try {
          const response = await this.client.chat.completions.create(retryBody);
          const text = response?.choices?.[0]?.message?.content;
          if (!text || text.trim() === "") {
            throw emptyResponseError();
          }
          return { text, usage: response?.usage };
        } catch (retryErr) {
          // Last attempt: max_completion_tokens only (no reasoning_effort)
          if (isUnsupportedParameterError(retryErr)) {
            const response = await this.client.chat.completions.create({
              model: completionOptions.model,
              messages,
              max_completion_tokens: completionOptions.max_tokens,
            });
            const text = response?.choices?.[0]?.message?.content;
            if (!text || text.trim() === "") {
              throw emptyResponseError();
            }
            return { text, usage: response?.usage };
          }
          throw retryErr;
        }
      }
      throw err;
    }
  }
}
/**
 * Soft-failure strings returned to webhooks when AI fails.
 * Callers should omit AI text from notifications when these appear.
 */
const SOFT_FAIL = {
  notConfigured: "AI summarization not available - please configure AI provider in settings.",
  summarize: "Unable to generate AI summary at this time.",
  explain: "Unable to generate AI explanation at this time. Please try again later.",
  analyze: "Unable to generate AI analysis of build failure at this time.",
  prSummary: "Unable to generate AI summary of pull request at this time.",
  sprint: "Unable to generate sprint insights at this time.",
  release: "Unable to analyze release failure at this time.",
};

/**
 * @param {unknown} text
 * @returns {boolean}
 */
export function isSoftAiFailure(text) {
  if (!text || typeof text !== "string") return true;
  return /unable to generate|not available - please configure|AI summarization not available|AI analysis not available|AI insights not available|AI explanation not available|Unable to analyze release/i.test(
    text
  );
}

/**
 * AI Service - Factory for creating isolated AI clients per org request.
 * Org feature methods require orgSettings — no silent configLoader fallback.
 */
class AIService {
  /**
   * Create an isolated AI client from organization settings.
   * @param {Object} settings - `{ ai: { provider, model, apiKeys, azure? } }`
   * @returns {AIClient}
   */
  createClientFromSettings(settings) {
    if (!settings?.ai?.provider) {
      throw new Error("AI provider is required in settings");
    }

    const config = {
      provider: settings.ai.provider,
      model: settings.ai.model,
      openaiApiKey: settings.ai.apiKeys?.openai,
      groqApiKey: settings.ai.apiKeys?.groq,
      geminiApiKey: settings.ai.apiKeys?.gemini,
      azureApiKey: settings.ai.apiKeys?.azure,
      azureEndpoint: settings.ai.azure?.endpoint,
      azureApiStyle: settings.ai.azure?.apiStyle || "auto",
    };

    return new AIClient(config);
  }

  _requireOrgSettings(orgSettings) {
    if (!orgSettings?.ai?.provider) {
      const err = new Error("AI organization settings are required");
      err.aiCode = "NOT_CONFIGURED";
      throw err;
    }
    return this.createClientFromSettings(orgSettings);
  }

  _inputChars(messages) {
    return (messages || []).reduce((n, m) => n + String(m?.content || "").length, 0);
  }

  _logAiCall({ feature, meta, success, inputChars, outputChars, error }) {
    const line = {
      feature,
      provider: meta?.provider || "unknown",
      model: meta?.model || "unknown",
      durationMs: meta?.latencyMs,
      success,
      inputChars,
      outputChars,
    };
    if (meta?.usage) line.usage = meta.usage;
    if (meta?.apiStyleUsed) line.apiStyleUsed = meta.apiStyleUsed;
    if (success) {
      logger.info("AI call", line);
    } else {
      logger.error("AI call failed", {
        ...line,
        error: redactSecrets(error?.message || String(error || "")),
      });
    }
  }

  /**
   * @returns {Promise<{ text: string, meta: object }>}
   */
  async generateCompletionWithMeta(messages, options = {}, orgSettings = null) {
    const startTime = Date.now();
    const provider = orgSettings?.ai?.provider || "unknown";
    const feature = options.feature || "completion";
    const inputChars = this._inputChars(messages);

    try {
      const client = this._requireOrgSettings(orgSettings);
      const { feature: _f, ...completionOpts } = options;
      void _f;
      const result = await client.generateCompletionWithMeta(messages, completionOpts);
      const durationMs = Date.now() - startTime;
      metrics.recordAICall(provider, true, durationMs);
      const meta = { ...result.meta, latencyMs: result.meta.latencyMs ?? durationMs };
      this._logAiCall({
        feature,
        meta,
        success: true,
        inputChars,
        outputChars: String(result.text || "").length,
      });
      if (!result.text || !String(result.text).trim()) {
        throw emptyResponseError();
      }
      return { text: result.text, meta };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      metrics.recordAICall(provider, false, durationMs);
      this._logAiCall({
        feature,
        meta: { provider, model: orgSettings?.ai?.model, latencyMs: durationMs },
        success: false,
        inputChars,
        outputChars: 0,
        error,
      });
      throw error;
    }
  }

  async generateCompletion(messages, options = {}, orgSettings = null) {
    const result = await this.generateCompletionWithMeta(messages, options, orgSettings);
    return result.text;
  }

  getPriorityText(priority) {
    if (!priority) return "Not set";
    const priorityMap = {
      1: "Critical",
      2: "High",
      3: "Medium",
      4: "Low",
    };
    return priorityMap[priority] || `Priority ${priority}`;
  }

  // --- Work item summarize (webhook) ---

  async summarizeWorkItemWithMeta(workItem, orgSettings) {
    const title = workItem.fields?.["System.Title"] || "No title";
    const description = sanitizeAdoField(workItem.fields?.["System.Description"], {
      max: PROMPT_CAPS.DESCRIPTION_CAP,
    });
    const workItemType = workItem.fields?.["System.WorkItemType"] || "Unknown";
    const priority = workItem.fields?.["Microsoft.VSTS.Common.Priority"] || "Not set";

    const messages = [
      {
        role: "system",
        content: `You are a DevOps work item analyzer. Provide clear, actionable summaries for development teams.

${ADO_DATA_RULE}

Formatting Rules:
- Write in plain text with selective *bold* emphasis only for key terms
- Use *bold* ONLY for: feature names, bug types, component names, or priority levels
- Do NOT make entire sentences or responses bold
- Write exactly 2-3 sentences

Content Rules:
- State only facts from the work item data provided
- Focus on what needs to be done and its business impact
- No assumptions or speculation beyond the data
- Make it informative and actionable for the team`,
      },
      {
        role: "user",
        content: `Analyze this work item and provide a 2-3 sentence summary:

Work Item Type: ${workItemType}
Title: ${title}
Priority: ${this.getPriorityText(priority)}
${wrapAdoContent("description", description)}

Summarize what needs to be done, why it's important, and any key technical or business considerations.`,
      },
    ];

    return this.generateCompletionWithMeta(
      messages,
      { max_tokens: 150, temperature: 0.1, feature: "summarizeWorkItem" },
      orgSettings
    );
  }

  async summarizeWorkItem(workItem, orgSettings = null) {
    try {
      if (!orgSettings?.ai?.provider) {
        return SOFT_FAIL.notConfigured;
      }
      const { text } = await this.summarizeWorkItemWithMeta(workItem, orgSettings);
      return text;
    } catch (error) {
      logger.error("Error summarizing work item:", redactSecrets(error?.message || error));
      return SOFT_FAIL.summarize;
    }
  }

  // --- Work item explain ---

  async explainWorkItemWithMeta(workItem, orgSettings) {
    const title = workItem.fields?.["System.Title"] || "No title";
    const description = sanitizeAdoField(workItem.fields?.["System.Description"], {
      max: PROMPT_CAPS.DESCRIPTION_CAP,
    });
    const workItemType = workItem.fields?.["System.WorkItemType"] || "Unknown";
    const priority = workItem.fields?.["Microsoft.VSTS.Common.Priority"] || "Not set";
    const state = workItem.fields?.["System.State"] || "Unknown";
    const assignee = workItem.fields?.["System.AssignedTo"]?.displayName || "Unassigned";

    const messages = [
      {
        role: "system",
        content: `You are a DevOps assistant that provides concise, factual work item explanations. Base your response the provided work item data - no assumptions or speculation.

${ADO_DATA_RULE}

**Formatting Rules:**
- Use markdown formatting (**bold**, bullet points)
- Keep response to 3-5 sentences maximum
- Use **bold** only for: work item type, key feature names, or critical status
- Use bullet points only if listing specific items from the data

**Content Rules:**
- State only facts from the work item fields provided
- Focus on: what it is, current status, and immediate next action
- No speculation about business impact or technical details not in the data
- If description is empty/unclear, acknowledge it directly`,
      },
      {
        role: "user",
        content: `Explain this work item based on the provided data:

**Type:** ${workItemType}
**Title:** ${title}
**State:** ${state}
**Priority:** ${this.getPriorityText(priority)}
**Assigned:** ${assignee}
${wrapAdoContent("description", description || "No description provided")}

Provide a concise explanation (3-5 sentences max) based on this data.`,
      },
    ];

    return this.generateCompletionWithMeta(
      messages,
      { max_tokens: 500, temperature: 0.4, feature: "explainWorkItem" },
      orgSettings
    );
  }

  async explainWorkItem(workItem, userSettings = null) {
    try {
      if (!userSettings?.ai?.provider) {
        return "AI explanation not available - please configure AI provider in settings.";
      }
      const { text } = await this.explainWorkItemWithMeta(workItem, userSettings);
      return text;
    } catch (error) {
      logger.error("Error explaining work item:", redactSecrets(error?.message || error));
      return SOFT_FAIL.explain;
    }
  }

  // --- PR explain ---

  async explainPullRequestWithMeta(pullRequest, changes = null, commits = null, orgSettings) {
    const title = pullRequest.title || "No title";
    const description = sanitizeAdoField(pullRequest.description, {
      max: PROMPT_CAPS.DESCRIPTION_CAP,
    });
    const sourceBranch = pullRequest.sourceRefName?.replace("refs/heads/", "") || "Unknown";
    const targetBranch = pullRequest.targetRefName?.replace("refs/heads/", "") || "Unknown";
    const status = pullRequest.status || "Unknown";
    const createdBy = pullRequest.createdBy?.displayName || "Unknown";
    const isDraft = pullRequest.isDraft || false;
    const reviewers = pullRequest.reviewers || [];
    const workItemRefs = pullRequest.workItemRefs || [];

    let changesSummary = "No file changes available";
    let fileAnalysis = "";

    if (changes?.changeEntries && changes.changeEntries.length > 0) {
      const summary = changes.summary || {};
      const filesByType = summary.fileTypes || {};
      const fileTypeAnalysis = Object.entries(filesByType)
        .map(([type, count]) => `${count} ${type} file${count !== 1 ? "s" : ""}`)
        .join(", ");

      changesSummary = `${summary.totalFiles || 0} files changed:
- ${summary.addedFiles || 0} added
- ${summary.modifiedFiles || 0} modified  
- ${summary.deletedFiles || 0} deleted

File types: ${fileTypeAnalysis || "Mixed files"}`;

      const keyFiles = changes.changeEntries
        .filter((c) => !c.isFolder)
        .slice(0, 10)
        .map((c) => `${c.changeType}: ${c.path}`)
        .join("\n");

      if (keyFiles) {
        fileAnalysis = `\n\nKey file changes:\n${keyFiles}`;
      }
    }

    let commitsSummary = "No commit information available";
    if (commits?.value && commits.value.length > 0) {
      const commitMessages = commits.value
        .slice(0, 5)
        .map((commit) => sanitizeAdoField(commit.comment || "No commit message", { max: 500 }))
        .join("\n");

      commitsSummary = `${commits.value.length} commit${commits.value.length !== 1 ? "s" : ""}:\n${commitMessages}`;
    }

    let reviewerInfo = "";
    if (reviewers.length > 0) {
      const reviewerNames = reviewers.map((r) => r.displayName).join(", ");
      reviewerInfo = `\nReviewers: ${reviewerNames}`;
    }

    let workItemInfo = "";
    if (workItemRefs.length > 0) {
      workItemInfo = `\nLinked work items: ${workItemRefs.length} item${workItemRefs.length !== 1 ? "s" : ""}`;
    }

    const messages = [
      {
        role: "system",
        content: `You are a senior code reviewer analyzing pull requests. Provide clear, actionable insights.

${ADO_DATA_RULE}

**Formatting Rules:**
- Use markdown formatting (**bold**, bullet points)
- Keep response to 6-8 sentences maximum
- Use **bold** for: PR purpose, key technologies, important changes
- Use bullet points for specific technical details

**Analysis Focus:**
- Explain the PR's purpose and scope based on title, description, and file changes
- Identify the type of change (feature, bug fix, refactor, etc.)
- Highlight key technical areas affected
- Mention review considerations based on file types and changes
- Note any patterns in the changes that suggest the implementation approach`,
      },
      {
        role: "user",
        content: `Analyze this pull request:

**Title:** ${title}
${wrapAdoContent("description", description || "No description provided")}
**Branch:** ${sourceBranch} → ${targetBranch}
**Status:** ${status}${isDraft ? " (Draft)" : ""}
**Author:** ${createdBy}${reviewerInfo}${workItemInfo}

**File Changes:**
${changesSummary}${fileAnalysis}

**Commits:**
${wrapAdoContent("commits", commitsSummary)}

Provide a comprehensive analysis of what this PR accomplishes, the technical approach, and what reviewers should focus on.`,
      },
    ];

    return this.generateCompletionWithMeta(
      messages,
      { max_tokens: 500, temperature: 0.3, feature: "explainPullRequest" },
      orgSettings
    );
  }

  async explainPullRequest(pullRequest, changes = null, commits = null, userSettings = null) {
    try {
      if (!userSettings?.ai?.provider) {
        return "AI analysis not available - please configure AI provider in settings.";
      }
      const { text } = await this.explainPullRequestWithMeta(
        pullRequest,
        changes,
        commits,
        userSettings
      );
      return text;
    } catch (error) {
      logger.error("Error explaining pull request:", redactSecrets(error?.message || error));
      return SOFT_FAIL.explain;
    }
  }

  // --- Build failure ---

  async _prepareBuildFailureContext(build, timeline, logs, userClient) {
    void logs;
    const buildName = build.definition?.name || "Unknown Build";
    const buildNumber = build.buildNumber || "Unknown";

    let sourceBranch = build.sourceBranch || "Unknown";
    if (sourceBranch.includes("refs/pull/")) {
      sourceBranch = "master";
    } else {
      sourceBranch = sourceBranch.replace("refs/heads/", "");
    }

    const failedJobs =
      timeline?.records?.filter(
        (record) => record.result === "failed" || record.result === "canceled"
      ) || [];

    const errorMessages = redactForPrompt(
      failedJobs
        .map((job) => {
          const jobName = job.name || "Unknown Job";
          const issues =
            job.issues?.map((i) => i.message).join("; ") || "No specific error details";
          return `${jobName}: ${issues}`;
        })
        .join("\n")
    );

    let pipelineContent = "";
    let pipelineType = "classic";
    let pipelineAnalysisNote = "";

    try {
      if (build.definition?.id && userClient) {
        const definition = await userClient.getBuildDefinition(build.definition.id);

        if (definition.process?.type === 2 && definition.process?.yamlFilename) {
          pipelineType = "yaml";
          const yamlPath = definition.process.yamlFilename;
          const repositoryId = definition.repository?.id;

          if (repositoryId && yamlPath) {
            try {
              const yamlFile = await userClient.getRepositoryFile(
                repositoryId,
                yamlPath,
                sourceBranch
              );
              pipelineContent = redactForPrompt(truncateYaml(yamlFile.content || ""));

              if (!pipelineContent) {
                pipelineAnalysisNote = "YAML pipeline file was found but appears to be empty.";
              }
            } catch (yamlError) {
              logger.warn(
                `Failed to fetch YAML file ${yamlPath}:`,
                redactSecrets(yamlError?.message || yamlError)
              );
              pipelineAnalysisNote = `Unable to fetch YAML pipeline file (${yamlPath}).`;
            }
          } else {
            pipelineAnalysisNote = "YAML pipeline detected but missing repository information.";
          }
        }
      } else if (!userClient) {
        pipelineAnalysisNote = "User client not available for pipeline analysis.";
      }
    } catch (definitionError) {
      logger.warn("Failed to fetch build definition:", redactSecrets(definitionError?.message));
      pipelineAnalysisNote = `Unable to fetch build definition. Analysis limited to timeline data.`;
    }

    return {
      buildName,
      buildNumber,
      sourceBranch,
      failedJobs,
      errorMessages,
      pipelineContent,
      pipelineType,
      pipelineAnalysisNote,
    };
  }

  _buildFailureMessages(ctx) {
    const {
      buildName,
      buildNumber,
      sourceBranch,
      errorMessages,
      pipelineContent,
      pipelineType,
      pipelineAnalysisNote,
    } = ctx;

    let systemPrompt;
    let userPrompt;

    if (pipelineType === "classic") {
      systemPrompt = `You are a DevOps build failure analyzer for classic Azure DevOps pipelines.

${ADO_DATA_RULE}

FORMATTING RULES:
- Write in plain text paragraphs
- Use simple, clear language
- No special formatting needed (displayed in card widget)
- Keep response concise and readable

RESPONSE RULES:
- Focus ONLY on the timeline error data provided
- Provide 2-3 sentences explaining the likely cause
- Give general troubleshooting steps that apply to classic pipelines
- Use *bold* sparingly only for error types, task names, or key actions
- Do NOT speculate about YAML configuration or specific file paths
- Keep response concise and actionable
- Write in natural paragraphs, not sections with headers

CONTEXT: Classic pipelines are configured through Azure DevOps UI, not YAML files.`;

      userPrompt = `Analyze this classic pipeline build failure:

Build: ${buildName} #${buildNumber}
Branch: ${sourceBranch}
${wrapAdoContent("timeline_errors", errorMessages || "No specific error details available from timeline")}

Explain the likely cause based on the timeline errors and provide general troubleshooting steps for classic pipeline configuration. Write in flowing paragraphs without section headers.`;
    } else if (pipelineType === "yaml" && pipelineContent) {
      systemPrompt = `You are a DevOps build failure analyzer for YAML Azure DevOps pipelines.

${ADO_DATA_RULE}

FORMATTING RULES:
- Write in plain text paragraphs
- Use simple, clear language
- No special formatting needed (displayed in card widget)
- Keep response concise and readable

RESPONSE RULES:
- Analyze BOTH timeline errors AND YAML configuration
- Identify specific issues in the YAML that caused the timeline errors
- Provide exact YAML fixes with proper formatting
- Use *bold* sparingly for task names, file paths, and configuration keys
- Give 3-4 sentences with specific actionable solutions
- Focus on YAML configuration corrections
- Write in natural paragraphs, not sections with headers

CONTEXT: You have both the execution errors and the YAML pipeline configuration.`;

      userPrompt = `Analyze this YAML pipeline build failure:

Build: ${buildName} #${buildNumber}
Branch: ${sourceBranch}

${wrapAdoContent("timeline_errors", errorMessages || "No specific error details available")}

${wrapAdoContent("yaml_pipeline", pipelineContent)}

Cross-reference the timeline errors with the YAML configuration to identify the specific issue and provide exact YAML fixes needed. Write in flowing paragraphs without section headers.`;
    } else {
      systemPrompt = `You are a DevOps build failure analyzer for YAML Azure DevOps pipelines.

${ADO_DATA_RULE}

FORMATTING RULES:
- Write in plain text paragraphs
- Use simple, clear language
- No special formatting needed (displayed in card widget)
- Keep response concise and readable

RESPONSE RULES:
- Focus on timeline error data (YAML configuration not available)
- Provide 2-3 sentences explaining the likely cause
- Give general guidance about checking YAML configuration
- Use *bold* sparingly for error types and task names
- Suggest specific YAML sections to review
- Write in natural paragraphs, not sections with headers

CONTEXT: YAML pipeline detected but configuration could not be retrieved.`;

      userPrompt = `Analyze this YAML pipeline build failure (configuration not available):

Build: ${buildName} #${buildNumber}
Branch: ${sourceBranch}
${wrapAdoContent("timeline_errors", errorMessages || "No specific error details available")}
Note: ${pipelineAnalysisNote}

Explain the likely cause based on timeline errors and suggest what to check in the YAML pipeline configuration. Write in flowing paragraphs without section headers.`;
    }

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  async summarizeBuildFailureWithMeta(
    build,
    timeline,
    logs,
    userClient = null,
    orgSettings = null
  ) {
    const ctx = await this._prepareBuildFailureContext(build, timeline, logs, userClient);
    const messages = this._buildFailureMessages(ctx);
    return this.generateCompletionWithMeta(
      messages,
      { max_tokens: 1000, temperature: 0.1, feature: "summarizeBuildFailure" },
      orgSettings
    );
  }

  async summarizeBuildFailure(build, timeline, logs, userClient = null, orgSettings = null) {
    try {
      if (!orgSettings?.ai?.provider) {
        return "AI analysis not available - please configure AI provider in settings.";
      }
      const { text } = await this.summarizeBuildFailureWithMeta(
        build,
        timeline,
        logs,
        userClient,
        orgSettings
      );
      return text;
    } catch (error) {
      logger.error("Error in build failure analysis:", {
        error: redactSecrets(error?.message || error),
        buildId: build?.id,
      });
      return SOFT_FAIL.analyze;
    }
  }

  // --- PR summarize (webhook) ---

  async summarizePullRequestWithMeta(pullRequest, orgSettings) {
    const title = pullRequest.title || "No title";
    const description = sanitizeAdoField(pullRequest.description, {
      max: PROMPT_CAPS.DESCRIPTION_CAP,
    });
    const sourceBranch = pullRequest.sourceRefName?.replace("refs/heads/", "") || "unknown";
    const targetBranch = pullRequest.targetRefName?.replace("refs/heads/", "") || "unknown";
    const createdBy = pullRequest.createdBy?.displayName || "Unknown";

    const messages = [
      {
        role: "system",
        content: `You are a pull request code reviewer assistant. Provide clear, actionable summaries for development teams.

${ADO_DATA_RULE}

Formatting Rules:
- Write in plain text with selective *bold* emphasis only for key terms
- Use *bold* ONLY for: feature names, bug types, component names, or critical impacts
- Do NOT make entire sentences or responses bold
- Write exactly 2-3 sentences

Content Rules:
- Focus on WHAT was changed and WHY it matters
- Identify the type of change: feature, bugfix, refactor, etc.
- Mention business impact or technical benefit
- Be specific about components or functionality affected
- No speculation beyond the provided information`,
      },
      {
        role: "user",
        content: `Analyze this pull request and provide a 2-3 sentence summary:

Title: ${title}
Author: ${createdBy}
Source Branch: ${sourceBranch}
Target Branch: ${targetBranch}
${wrapAdoContent("description", description)}

Summarize what type of change this is, what specific functionality is affected, and why this change is important for the codebase.`,
      },
    ];

    return this.generateCompletionWithMeta(
      messages,
      { max_tokens: 120, temperature: 0.2, feature: "summarizePullRequest" },
      orgSettings
    );
  }

  async summarizePullRequest(pullRequest, orgSettings = null) {
    try {
      if (!orgSettings?.ai?.provider) {
        return SOFT_FAIL.notConfigured;
      }
      const { text } = await this.summarizePullRequestWithMeta(pullRequest, orgSettings);
      return text;
    } catch (error) {
      logger.error("Error summarizing pull request:", redactSecrets(error?.message || error));
      return SOFT_FAIL.prSummary;
    }
  }

  // --- Sprint ---

  async summarizeSprintWorkItemsWithMeta(workItems, orgSettings) {
    if (!workItems || workItems.length === 0) {
      return {
        text: "No work items found in the current sprint.",
        meta: {
          provider: orgSettings?.ai?.provider,
          model: orgSettings?.ai?.model,
          latencyMs: 0,
        },
      };
    }

    const groupedItems = workItems.reduce((acc, item) => {
      const state = item.fields?.["System.State"] || "Unknown";
      const assignee = item.fields?.["System.AssignedTo"]?.displayName || "Unassigned";

      if (!acc[state]) acc[state] = {};
      if (!acc[state][assignee]) acc[state][assignee] = [];

      acc[state][assignee].push({
        id: item.id,
        title: item.fields?.["System.Title"] || "No title",
        type: item.fields?.["System.WorkItemType"] || "Unknown",
        priority: item.fields?.["Microsoft.VSTS.Common.Priority"] || "Not set",
      });

      return acc;
    }, {});

    const dataSummary = Object.entries(groupedItems)
      .map(([state, assignees]) => {
        const assigneeSummary = Object.entries(assignees)
          .map(([assignee, items]) => {
            return `${assignee}: ${items.length} items (${items.map((i) => `${i.type} #${i.id}`).join(", ")})`;
          })
          .join("; ");

        return `${state} (${Object.values(assignees).flat().length} items): ${assigneeSummary}`;
      })
      .join("\n");

    const totalItems = workItems.length;
    const activeStates = workItems.filter((item) => {
      const state = item.fields?.["System.State"];
      return (
        state &&
        ![
          "Defined",
          "New",
          "Closed",
          "Blocked",
          "Paused",
          "Removed",
          "Released to Production",
        ].includes(state)
      );
    });
    const unassignedItems = workItems.filter(
      (item) => !item.fields?.["System.AssignedTo"]?.displayName
    );

    const assigneeWorkloads = {};
    workItems.forEach((item) => {
      const assignee = item.fields?.["System.AssignedTo"]?.displayName || "Unassigned";
      assigneeWorkloads[assignee] = (assigneeWorkloads[assignee] || 0) + 1;
    });

    const messages = [
      {
        role: "system",
        content: `You are a sprint analysis expert providing actionable insights for development teams.

${ADO_DATA_RULE}

FORMATTING RULES:
- Use markdown formatting for structure
- Use **bold** for key metrics, names, and important points
- Use bullet points (-) for lists and recommendations
- Use proper headings (##, ###) for sections
- Keep paragraphs concise and focused

CONTENT RULES:
- Focus ONLY on insights, patterns, and recommendations
- Do NOT repeat the raw data - assume the team can see work item details elsewhere
- Analyze team workload balance, sprint progress, and potential risks
- Provide specific, actionable recommendations
- Identify blockers, bottlenecks, and opportunities
- Keep analysis concise but comprehensive (3-4 paragraphs max)

ANALYSIS FOCUS:
- Sprint velocity and completion trends
- Team workload distribution and balance
- Risk identification (overloaded members, unassigned items, blockers)
- Process improvements and next steps`,
      },
      {
        role: "user",
        content: `Analyze this sprint data and provide insights and recommendations:

SPRINT METRICS:
- Total items: ${totalItems}
- Active items: ${activeStates.length}
- Unassigned items: ${unassignedItems.length}
- Team members: ${Object.keys(assigneeWorkloads).filter((a) => a !== "Unassigned").length}

${wrapAdoContent(
  "work_distribution",
  `WORK DISTRIBUTION:\n${dataSummary}\n\nTEAM WORKLOADS:\n${Object.entries(assigneeWorkloads)
    .map(([assignee, count]) => `${assignee}: ${count} items`)
    .join("\n")}`
)}

Provide executive insights focusing on:
1. Sprint progress and velocity assessment
2. Team workload balance and potential issues
3. Risk factors and blockers
4. Specific recommendations for improvement

Do NOT repeat the raw data - focus on analysis and actionable insights only.`,
      },
    ];

    return this.generateCompletionWithMeta(
      messages,
      { max_tokens: 800, temperature: 0.3, feature: "summarizeSprintWorkItems" },
      orgSettings
    );
  }

  async summarizeSprintWorkItems(workItems, orgSettings = null) {
    try {
      if (!workItems || workItems.length === 0) {
        return "No work items found in the current sprint.";
      }
      if (!orgSettings?.ai?.provider) {
        return "AI insights not available - please configure AI provider in settings.";
      }
      const { text } = await this.summarizeSprintWorkItemsWithMeta(workItems, orgSettings);
      return text;
    } catch (error) {
      logger.error("Error generating sprint insights:", redactSecrets(error?.message || error));
      return SOFT_FAIL.sprint;
    }
  }

  // --- Release ---

  async analyzeReleaseFailureWithMeta(release, failedTasks, orgSettings) {
    const tasksSummary = failedTasks
      .map((task) => {
        const logPreview = sanitizeAdoField(task.logContent, {
          max: PROMPT_CAPS.LOG_CAP,
          html: false,
        });
        // Prefer last N chars of log (existing behavior)
        const raw = String(task.logContent || "");
        const sliced = raw.length > PROMPT_CAPS.LOG_CAP ? raw.slice(-PROMPT_CAPS.LOG_CAP) : raw;
        const safeLog = redactForPrompt(sliced);

        return `Task: ${task.taskName}
Environment: ${task.environmentName}
Status: ${task.status}
${task.issues.length > 0 ? `Issues: ${task.issues.map((i) => i.message || i).join(", ")}` : ""}
Log Output (last 2000 chars):
${safeLog || logPreview}`;
      })
      .join("\n\n---\n\n");

    const messages = [
      {
        role: "system",
        content: `You are an expert DevOps engineer analyzing release deployment failures. Explain why the deployment failed in simple, clear terms. Focus on:
- What went wrong (the root cause)
- Which component or step failed
- The specific error or issue
DO NOT provide fixes or solutions - only explain what happened and why it failed.

${ADO_DATA_RULE}`,
      },
      {
        role: "user",
        content: `Release: ${release.name}
Failed Tasks: ${failedTasks.length}

${wrapAdoContent("failed_tasks", tasksSummary)}

Explain in simple terms why this release failed. Focus on the root cause and what went wrong, not how to fix it.`,
      },
    ];

    return this.generateCompletionWithMeta(
      messages,
      { max_tokens: 500, temperature: 0.3, feature: "analyzeReleaseFailure" },
      orgSettings
    );
  }

  async analyzeReleaseFailure(release, failedTasks, orgSettings = null) {
    try {
      if (!orgSettings?.ai?.provider) {
        return SOFT_FAIL.release;
      }
      const { text } = await this.analyzeReleaseFailureWithMeta(release, failedTasks, orgSettings);
      return text;
    } catch (error) {
      logger.error("Error analyzing release failure:", redactSecrets(error?.message || error));
      return SOFT_FAIL.release;
    }
  }
}

function truncateYaml(content) {
  const s = String(content || "");
  if (s.length <= PROMPT_CAPS.YAML_CAP) return s;
  return `${s.slice(0, PROMPT_CAPS.YAML_CAP)}\n[truncated]`;
}

export const aiService = new AIService();
