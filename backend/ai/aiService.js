import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { configLoader } from '../config/settings.js';
import { metrics } from '../observability/metrics.js';

/**
 * AI Client - Isolated instance for a specific organization/user
 * NOT shared across requests - created fresh per request context
 */
class AIClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this._initialize();
  }

  _initialize() {
    const { provider, openaiApiKey, groqApiKey, geminiApiKey } = this.config;

    if (provider === 'openai') {
      if (!openaiApiKey) {
        throw new Error('OpenAI API key is required when using OpenAI provider');
      }
      this.client = new OpenAI({ apiKey: openaiApiKey });
    } else if (provider === 'groq') {
      if (!groqApiKey) {
        throw new Error('Groq API key is required when using Groq provider');
      }
      this.client = new Groq({ apiKey: groqApiKey });
    } else if (provider === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Gemini API key is required when using Gemini provider');
      }
      this.client = new GoogleGenerativeAI(geminiApiKey);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  async generateCompletion(messages, options = {}) {
    const defaultOptions = {
      model: this.config.model,
      max_tokens: 500,
      temperature: 0.3
    };

    const completionOptions = { ...defaultOptions, ...options };

    if (this.config.provider === 'openai') {
      const response = await this.client.chat.completions.create({
        ...completionOptions,
        messages
      });
      return response.choices[0].message.content;
    } else if (this.config.provider === 'groq') {
      const response = await this.client.chat.completions.create({
        ...completionOptions,
        messages
      });
      return response.choices[0].message.content;
    } else if (this.config.provider === 'gemini') {
      const model = this.client.getGenerativeModel({ model: completionOptions.model });
      
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessage = messages.find(m => m.role === 'user');
      
      let prompt = '';
      if (systemMessage) {
        prompt += `${systemMessage.content}\n\n`;
      }
      if (userMessage) {
        prompt += userMessage.content;
      }
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  }
}

/**
 * AI Service - Factory for creating isolated AI clients
 * 
 * IMPORTANT: This service does NOT maintain shared state across requests.
 * Each request that needs AI should call createClientFromSettings() to get
 * an isolated client instance.
 * 
 * For backward compatibility, legacy methods that don't pass settings
 * will use the global configLoader settings.
 */
class AIService {
  constructor() {
    // NO shared client state - each request gets its own client
    // These are only used for legacy backward compatibility
    this._legacyClient = null;
    this._legacyInitialized = false;
  }

  /**
   * Create an isolated AI client from organization/user settings
   * This is the PREFERRED method - creates request-scoped client
   * 
   * @param {Object} settings - Settings object with ai.provider, ai.model, ai.apiKeys
   * @returns {AIClient} - Isolated AI client instance
   */
  createClientFromSettings(settings) {
    if (!settings?.ai?.provider) {
      throw new Error('AI provider is required in settings');
    }

    const config = {
      provider: settings.ai.provider,
      model: settings.ai.model,
      openaiApiKey: settings.ai.apiKeys?.openai,
      groqApiKey: settings.ai.apiKeys?.groq,
      geminiApiKey: settings.ai.apiKeys?.gemini
    };

    return new AIClient(config);
  }

  /**
   * DEPRECATED: Initialize with user settings
   * This method exists for backward compatibility but stores state temporarily.
   * New code should use createClientFromSettings() instead.
   * 
   * @deprecated Use createClientFromSettings() for proper isolation
   */
  initializeWithUserSettings(userSettings) {
    // Create isolated client but store reference for legacy methods
    // WARNING: This is NOT thread-safe in concurrent environments
    // The client is replaced on each call, which can cause race conditions
    logger.warn('DEPRECATED: initializeWithUserSettings called. Use createClientFromSettings() for proper isolation.', {
      provider: userSettings.ai?.provider
    });

    const config = {
      provider: userSettings.ai.provider,
      model: userSettings.ai.model,
      openaiApiKey: userSettings.ai.apiKeys?.openai,
      groqApiKey: userSettings.ai.apiKeys?.groq,
      geminiApiKey: userSettings.ai.apiKeys?.gemini
    };

    this._legacyClient = new AIClient(config);
    this._legacyInitialized = true;
    
    logger.info(`AI service initialized with user settings - provider: ${config.provider}`);
  }

  /**
   * LEGACY: Initialize from global config
   * Only used when no org/user settings are provided
   */
  initializeClient() {
    if (this._legacyInitialized) return;
    
    const globalConfig = configLoader.getAIConfig();
    
    const config = {
      provider: globalConfig.provider,
      model: globalConfig.model,
      openaiApiKey: globalConfig.openaiApiKey,
      groqApiKey: globalConfig.groqApiKey,
      geminiApiKey: globalConfig.geminiApiKey
    };

    this._legacyClient = new AIClient(config);
    this._legacyInitialized = true;
  }

  // Helper to get current client (for legacy methods)
  _getClient() {
    if (!this._legacyInitialized) {
      this.initializeClient();
    }
    return this._legacyClient;
  }

  // Expose initialized state for backward compatibility
  get initialized() {
    return this._legacyInitialized;
  }

  get config() {
    return this._legacyClient?.config || {};
  }

  /**
   * Generate AI completion
   * For org-isolated calls, pass orgSettings to create fresh client
   */
  async generateCompletion(messages, options = {}, orgSettings = null) {
    const startTime = Date.now();
    const provider = orgSettings?.ai?.provider || this.config?.provider || 'unknown';
    
    try {
      let client;
      
      if (orgSettings) {
        // Create isolated client for this request
        client = this.createClientFromSettings(orgSettings);
      } else {
        // Fall back to legacy client
        client = this._getClient();
      }

      const result = await client.generateCompletion(messages, options);
      
      // Record success metric
      const durationMs = Date.now() - startTime;
      metrics.recordAICall(provider, true, durationMs);
      
      return result;
    } catch (error) {
      // Record failure metric
      const durationMs = Date.now() - startTime;
      metrics.recordAICall(provider, false, durationMs);
      
      logger.error('Error generating AI completion:', error);
      throw error;
    }
  }

  // Helper method to convert priority number to readable text
  getPriorityText(priority) {
    if (!priority) return 'Not set';
    const priorityMap = {
      1: 'Critical',
      2: 'High', 
      3: 'Medium',
      4: 'Low'
    };
    return priorityMap[priority] || `Priority ${priority}`;
  }

  async summarizeWorkItem(workItem, orgSettings = null) {
    try {
      let client;
      if (orgSettings) {
        client = this.createClientFromSettings(orgSettings);
      } else {
        try {
          client = this._getClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback summary');
          return 'AI summarization not available - please configure AI provider in settings.';
        }
      }
      
      const title = workItem.fields?.['System.Title'] || 'No title';
      const description = workItem.fields?.['System.Description'] || 'No description';
      const workItemType = workItem.fields?.['System.WorkItemType'] || 'Unknown';
      const priority = workItem.fields?.['Microsoft.VSTS.Common.Priority'] || 'Not set';

      const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

      const messages = [
        {
          role: 'system',
          content: `You are a DevOps work item analyzer. Provide clear, actionable summaries for development teams.

Formatting Rules:
- Write in plain text with selective *bold* emphasis only for key terms
- Use *bold* ONLY for: feature names, bug types, component names, or priority levels
- Do NOT make entire sentences or responses bold
- Write exactly 2-3 sentences

Content Rules:
- State only facts from the work item data provided
- Focus on what needs to be done and its business impact
- No assumptions or speculation beyond the data
- Make it informative and actionable for the team`
        },
        {
          role: 'user',
          content: `Analyze this work item and provide a 2-3 sentence summary:

Work Item Type: ${workItemType}
Title: ${title}
Priority: ${this.getPriorityText(priority)}
Description: ${cleanDescription}

Summarize what needs to be done, why it's important, and any key technical or business considerations.`
        }
      ];

      const summary = await client.generateCompletion(messages, { 
        max_tokens: 150,
        temperature: 0.1
      });
      
      logger.info('Generated work item summary', {
        workItemId: workItem.id,
        workItemType,
        priority: this.getPriorityText(priority),
        summaryLength: summary.length
      });

      return summary;
    } catch (error) {
      logger.error('Error summarizing work item:', error);
      return 'Unable to generate AI summary at this time.';
    }
  }

  async explainWorkItem(workItem, userSettings = null) {
    try {
      let client;
      if (userSettings) {
        client = this.createClientFromSettings(userSettings);
      } else {
        try {
          client = this._getClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback explanation');
          return 'AI explanation not available - please configure AI provider in settings.';
        }
      }
      
      const title = workItem.fields?.['System.Title'] || 'No title';
      const description = workItem.fields?.['System.Description'] || 'No description';
      const workItemType = workItem.fields?.['System.WorkItemType'] || 'Unknown';
      const priority = workItem.fields?.['Microsoft.VSTS.Common.Priority'] || 'Not set';
      const state = workItem.fields?.['System.State'] || 'Unknown';
      const assignee = workItem.fields?.['System.AssignedTo']?.displayName || 'Unassigned';

      const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

      const messages = [
        {
          role: 'system',
          content: `You are a DevOps assistant that provides concise, factual work item explanations. Base your response the provided work item data - no assumptions or speculation.

**Formatting Rules:**
- Use markdown formatting (**bold**, bullet points)
- Keep response to 3-5 sentences maximum
- Use **bold** only for: work item type, key feature names, or critical status
- Use bullet points only if listing specific items from the data

**Content Rules:**
- State only facts from the work item fields provided
- Focus on: what it is, current status, and immediate next action
- No speculation about business impact or technical details not in the data
- If description is empty/unclear, acknowledge it directly`
        },
        {
          role: 'user',
          content: `Explain this work item based on the provided data:

**Type:** ${workItemType}
**Title:** ${title}
**State:** ${state}
**Priority:** ${this.getPriorityText(priority)}
**Assigned:** ${assignee}
**Description:** ${cleanDescription || 'No description provided'}

Provide a concise explanation (3-5 sentences max) based on this data.`
        }
      ];

      const explanation = await client.generateCompletion(messages, { 
        max_tokens: 500,
        temperature: 0.4
      });

      logger.info('Generated work item explanation', {
        workItemId: workItem.id,
        workItemType,
        priority: this.getPriorityText(priority),
        explanationLength: explanation.length
      });

      return explanation;
    } catch (error) {
      logger.error('Error explaining work item:', error);
      return 'Unable to generate AI explanation at this time. Please try again later.';
    }
  }

  async explainPullRequest(pullRequest, changes = null, commits = null, userSettings = null) {
    try {
      let client;
      if (userSettings) {
        client = this.createClientFromSettings(userSettings);
      } else {
        try {
          client = this._getClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback explanation');
          return 'AI analysis not available - please configure AI provider in settings.';
        }
      }

      const title = pullRequest.title || 'No title';
      const description = pullRequest.description || 'No description provided';
      const sourceBranch = pullRequest.sourceRefName?.replace('refs/heads/', '') || 'Unknown';
      const targetBranch = pullRequest.targetRefName?.replace('refs/heads/', '') || 'Unknown';
      const status = pullRequest.status || 'Unknown';
      const createdBy = pullRequest.createdBy?.displayName || 'Unknown';
      const isDraft = pullRequest.isDraft || false;
      const reviewers = pullRequest.reviewers || [];
      const workItemRefs = pullRequest.workItemRefs || [];

      let changesSummary = 'No file changes available';
      let fileAnalysis = '';
      
      if (changes?.changeEntries && changes.changeEntries.length > 0) {
        const summary = changes.summary || {};
        
        const filesByType = summary.fileTypes || {};
        const fileTypeAnalysis = Object.entries(filesByType)
          .map(([type, count]) => `${count} ${type} file${count !== 1 ? 's' : ''}`)
          .join(', ');
        
        changesSummary = `${summary.totalFiles || 0} files changed:
- ${summary.addedFiles || 0} added
- ${summary.modifiedFiles || 0} modified  
- ${summary.deletedFiles || 0} deleted

File types: ${fileTypeAnalysis || 'Mixed files'}`;

        const keyFiles = changes.changeEntries
          .filter(c => !c.isFolder)
          .slice(0, 10)
          .map(c => `${c.changeType}: ${c.path}`)
          .join('\n');
        
        if (keyFiles) {
          fileAnalysis = `\n\nKey file changes:\n${keyFiles}`;
        }
      }

      let commitsSummary = 'No commit information available';
      if (commits?.value && commits.value.length > 0) {
        const commitMessages = commits.value
          .slice(0, 5)
          .map(commit => commit.comment || 'No commit message')
          .join('\n');
        
        commitsSummary = `${commits.value.length} commit${commits.value.length !== 1 ? 's' : ''}:\n${commitMessages}`;
      }

      let reviewerInfo = '';
      if (reviewers.length > 0) {
        const reviewerNames = reviewers.map(r => r.displayName).join(', ');
        reviewerInfo = `\nReviewers: ${reviewerNames}`;
      }

      let workItemInfo = '';
      if (workItemRefs.length > 0) {
        workItemInfo = `\nLinked work items: ${workItemRefs.length} item${workItemRefs.length !== 1 ? 's' : ''}`;
      }

      const messages = [
        {
          role: 'system',
          content: `You are a senior code reviewer analyzing pull requests. Provide clear, actionable insights.

**Formatting Rules:**
- Use markdown formatting (**bold**, bullet points)
- Keep response to 6-8 sentences maximum
- Use **bold** for: PR purpose, key technologies, important changes
- Use bullet points for specific technical details

**Analysis Focus:**
- Explain the PR's purpose and scope based on title, description, and file changes
- Identify the type of change (feature, bugfix, refactor, etc.)
- Highlight key technical areas affected
- Mention review considerations based on file types and changes
- Note any patterns in the changes that suggest the implementation approach`
        },
        {
          role: 'user',
          content: `Analyze this pull request:

**Title:** ${title}
**Description:** ${description}
**Branch:** ${sourceBranch} → ${targetBranch}
**Status:** ${status}${isDraft ? ' (Draft)' : ''}
**Author:** ${createdBy}${reviewerInfo}${workItemInfo}

**File Changes:**
${changesSummary}${fileAnalysis}

**Commits:**
${commitsSummary}

Provide a comprehensive analysis of what this PR accomplishes, the technical approach, and what reviewers should focus on.`
        }
      ];

      const explanation = await client.generateCompletion(messages, { 
        max_tokens: 500,
        temperature: 0.3
      });

      logger.info('Generated PR explanation', {
        pullRequestId: pullRequest.pullRequestId,
        title,
        filesChanged: changes?.summary?.totalFiles || 0,
        explanationLength: explanation.length
      });

      return explanation;
    } catch (error) {
      logger.error('Error explaining pull request:', error);
      return 'Unable to generate AI explanation at this time. Please try again later.';
    }
  }

  async summarizeBuildFailure(build, timeline, logs, userClient = null, orgSettings = null) {
    try {
      let aiClient;
      if (orgSettings) {
        aiClient = this.createClientFromSettings(orgSettings);
      } else {
        try {
          aiClient = this._getClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback summary');
          return 'AI analysis not available - please configure AI provider in settings.';
        }
      }
      
      const buildName = build.definition?.name || 'Unknown Build';
      const buildNumber = build.buildNumber || 'Unknown';
      
      let sourceBranch = build.sourceBranch || 'Unknown';
      if (sourceBranch.includes('refs/pull/')) {
        sourceBranch = 'master';
        logger.info(`PR build detected, using master branch for YAML analysis instead of ${build.sourceBranch}`);
      } else {
        sourceBranch = sourceBranch.replace('refs/heads/', '');
      }
      
      const failedJobs = timeline?.records?.filter(record => 
        record.result === 'failed' || record.result === 'canceled'
      ) || [];

      const errorMessages = failedJobs.map(job => {
        const jobName = job.name || 'Unknown Job';
        const issues = job.issues?.map(i => i.message).join('; ') || 'No specific error details';
        return `${jobName}: ${issues}`;
      }).join('\n');

      let pipelineContent = '';
      let pipelineType = 'classic';
      let pipelineAnalysisNote = '';
      
      try {
        if (build.definition?.id && userClient) {
          const definition = await userClient.getBuildDefinition(build.definition.id);
          
          if (definition.process?.type === 2 && definition.process?.yamlFilename) {
            pipelineType = 'yaml';
            const yamlPath = definition.process.yamlFilename;
            const repositoryId = definition.repository?.id;
            
            if (repositoryId && yamlPath) {
              try {
                const yamlFile = await userClient.getRepositoryFile(repositoryId, yamlPath, sourceBranch);
                pipelineContent = yamlFile.content || '';
                
                if (!pipelineContent) {
                  pipelineAnalysisNote = 'YAML pipeline file was found but appears to be empty.';
                }
              } catch (yamlError) {
                logger.warn(`Failed to fetch YAML file ${yamlPath}:`, yamlError);
                pipelineAnalysisNote = `Unable to fetch YAML pipeline file (${yamlPath}).`;
              }
            } else {
              pipelineAnalysisNote = 'YAML pipeline detected but missing repository information.';
            }
          }
        } else if (!userClient) {
          pipelineAnalysisNote = 'User client not available for pipeline analysis.';
        }
      } catch (definitionError) {
        logger.warn('Failed to fetch build definition:', definitionError);
        pipelineAnalysisNote = `Unable to fetch build definition. Analysis limited to timeline data.`;
      }

      let systemPrompt, userPrompt;

      if (pipelineType === 'classic') {
        systemPrompt = `You are a DevOps build failure analyzer for classic Azure DevOps pipelines.

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
Timeline Errors: ${errorMessages || 'No specific error details available from timeline'}

Explain the likely cause based on the timeline errors and provide general troubleshooting steps for classic pipeline configuration. Write in flowing paragraphs without section headers.`;

      } else if (pipelineType === 'yaml' && pipelineContent) {
        systemPrompt = `You are a DevOps build failure analyzer for YAML Azure DevOps pipelines.

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

TIMELINE ERRORS (what failed):
${errorMessages || 'No specific error details available'}

YAML PIPELINE CONFIGURATION:
\`\`\`yaml
${pipelineContent}
\`\`\`

Cross-reference the timeline errors with the YAML configuration to identify the specific issue and provide exact YAML fixes needed. Write in flowing paragraphs without section headers.`;

      } else {
        systemPrompt = `You are a DevOps build failure analyzer for YAML Azure DevOps pipelines.

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
Timeline Errors: ${errorMessages || 'No specific error details available'}
Note: ${pipelineAnalysisNote}

Explain the likely cause based on timeline errors and suggest what to check in the YAML pipeline configuration. Write in flowing paragraphs without section headers.`;
      }

      logger.info('AI Prompt being sent:', {
        systemPrompt,
        userPrompt
      });

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const summary = await aiClient.generateCompletion(messages, { 
        max_tokens: 1000,
        temperature: 0.1
      });
      
      logger.info('AI Response received:', { response: summary });
      
      logger.info('Build failure analysis completed', {
        buildId: build.id,
        buildName,
        pipelineType,
        hasYamlContent: pipelineContent.length > 0,
        failedJobsCount: failedJobs.length,
        analysisSuccess: !!summary
      });

      return summary;
    } catch (error) {
      logger.error('Error in build failure analysis:', {
        error: error.message,
        buildId: build?.id,
        buildName: build?.definition?.name
      });
      return 'Unable to generate AI analysis of build failure at this time.';
    }
  }

  async summarizePullRequest(pullRequest, orgSettings = null) {
    try {
      let client;
      if (orgSettings) {
        client = this.createClientFromSettings(orgSettings);
      } else {
        try {
          client = this._getClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback summary');
          return 'AI summarization not available - please configure AI provider in settings.';
        }
      }
      
      const title = pullRequest.title || 'No title';
      const description = pullRequest.description || 'No description';
      const sourceBranch = pullRequest.sourceRefName?.replace('refs/heads/', '') || 'unknown';
      const targetBranch = pullRequest.targetRefName?.replace('refs/heads/', '') || 'unknown';
      const createdBy = pullRequest.createdBy?.displayName || 'Unknown';

      const messages = [
        {
          role: 'system',
          content: `You are a pull request code reviewer assistant. Provide clear, actionable summaries for development teams.

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
- No speculation beyond the provided information`
        },
        {
          role: 'user',
          content: `Analyze this pull request and provide a 2-3 sentence summary:

Title: ${title}
Author: ${createdBy}
Source Branch: ${sourceBranch}
Target Branch: ${targetBranch}
Description: ${description}

Summarize what type of change this is, what specific functionality is affected, and why this change is important for the codebase.`
        }
      ];

      const summary = await client.generateCompletion(messages, { 
        max_tokens: 120,
        temperature: 0.2
      });
      
      logger.info('Generated pull request summary', {
        pullRequestId: pullRequest.pullRequestId,
        author: createdBy,
        sourceBranch,
        targetBranch,
        summaryLength: summary.length
      });

      return summary;
    } catch (error) {
      logger.error('Error summarizing pull request:', error);
      return 'Unable to generate AI summary of pull request at this time.';
    }
  }

  async summarizeSprintWorkItems(workItems, orgSettings = null) {
    try {
      if (!workItems || workItems.length === 0) {
        return 'No work items found in the current sprint.';
      }

      let client;
      if (orgSettings) {
        client = this.createClientFromSettings(orgSettings);
      } else {
        try {
          client = this._getClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback message');
          return 'AI insights not available - please configure AI provider in settings.';
        }
      }

      const groupedItems = workItems.reduce((acc, item) => {
        const state = item.fields?.['System.State'] || 'Unknown';
        const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
        
        if (!acc[state]) acc[state] = {};
        if (!acc[state][assignee]) acc[state][assignee] = [];
        
        acc[state][assignee].push({
          id: item.id,
          title: item.fields?.['System.Title'] || 'No title',
          type: item.fields?.['System.WorkItemType'] || 'Unknown',
          priority: item.fields?.['Microsoft.VSTS.Common.Priority'] || 'Not set'
        });
        
        return acc;
      }, {});

      const dataSummary = Object.entries(groupedItems).map(([state, assignees]) => {
        const assigneeSummary = Object.entries(assignees).map(([assignee, items]) => {
          return `${assignee}: ${items.length} items (${items.map(i => `${i.type} #${i.id}`).join(', ')})`;
        }).join('; ');
        
        return `${state} (${Object.values(assignees).flat().length} items): ${assigneeSummary}`;
      }).join('\n');

      const totalItems = workItems.length;
      const activeStates = workItems.filter(item => {
        const state = item.fields?.['System.State'];
        return state && !['Defined', 'New', 'Closed', 'Blocked', 'Paused', 'Removed', 'Released to Production'].includes(state);
      });
      const unassignedItems = workItems.filter(item => !item.fields?.['System.AssignedTo']?.displayName);
      
      const assigneeWorkloads = {};
      workItems.forEach(item => {
        const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
        assigneeWorkloads[assignee] = (assigneeWorkloads[assignee] || 0) + 1;
      });

      const messages = [
        {
          role: 'system',
          content: `You are a sprint analysis expert providing actionable insights for development teams.

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
- Process improvements and next steps`
        },
        {
          role: 'user',
          content: `Analyze this sprint data and provide insights and recommendations:

SPRINT METRICS:
- Total items: ${totalItems}
- Active items: ${activeStates.length}
- Unassigned items: ${unassignedItems.length}
- Team members: ${Object.keys(assigneeWorkloads).filter(a => a !== 'Unassigned').length}

WORK DISTRIBUTION:
${dataSummary}

TEAM WORKLOADS:
${Object.entries(assigneeWorkloads).map(([assignee, count]) => `${assignee}: ${count} items`).join('\n')}

Provide executive insights focusing on:
1. Sprint progress and velocity assessment
2. Team workload balance and potential issues
3. Risk factors and blockers
4. Specific recommendations for improvement

Do NOT repeat the raw data - focus on analysis and actionable insights only.`
        }
      ];

      const aiInsights = await client.generateCompletion(messages, { 
        max_tokens: 800,
        temperature: 0.3 
      });
      
      logger.info('Generated sprint insights', {
        totalItems,
        activeItems: activeStates.length,
        unassignedItems: unassignedItems.length,
        teamMembers: Object.keys(assigneeWorkloads).filter(a => a !== 'Unassigned').length,
        insightsLength: aiInsights.length
      });
      
      return aiInsights;
    } catch (error) {
      logger.error('Error generating sprint insights:', error);
      return 'Unable to generate sprint insights at this time.';
    }
  }

  async analyzeReleaseFailure(release, failedTasks, orgSettings = null) {
    try {
      let client;
      if (orgSettings) {
        client = this.createClientFromSettings(orgSettings);
      } else {
        client = this._getClient();
      }

      const tasksSummary = failedTasks.map(task => {
        const logPreview = task.logContent.length > 2000 
          ? task.logContent.slice(-2000) 
          : task.logContent;
        
        return `Task: ${task.taskName}
Environment: ${task.environmentName}
Status: ${task.status}
${task.issues.length > 0 ? `Issues: ${task.issues.map(i => i.message || i).join(', ')}` : ''}
Log Output (last 2000 chars):
${logPreview}`;
      }).join('\n\n---\n\n');

      const messages = [
        {
          role: 'system',
          content: `You are an expert DevOps engineer analyzing release deployment failures. Explain why the deployment failed in simple, clear terms. Focus on:
- What went wrong (the root cause)
- Which component or step failed
- The specific error or issue
DO NOT provide fixes or solutions - only explain what happened and why it failed.`
        },
        {
          role: 'user',
          content: `Release: ${release.name}
Failed Tasks: ${failedTasks.length}

${tasksSummary}

Explain in simple terms why this release failed. Focus on the root cause and what went wrong, not how to fix it.`
        }
      ];

      const analysis = await client.generateCompletion(messages, {
        max_tokens: 500,
        temperature: 0.3
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing release failure:', error);
      return 'Unable to analyze release failure at this time.';
    }
  }
}

export const aiService = new AIService();
