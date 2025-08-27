import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import { configLoader } from '../config/settings.js';

class AIService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  initializeClient() {
    if (this.initialized) return;
    
    this.config = configLoader.getAIConfig();
    
    if (this.config.provider === 'openai') {
      if (!this.config.openaiApiKey) {
        throw new Error('OpenAI API key is required when using OpenAI provider');
      }
      this.client = new OpenAI({
        apiKey: this.config.openaiApiKey
      });
    } else if (this.config.provider === 'groq') {
      if (!this.config.groqApiKey) {
        throw new Error('Groq API key is required when using Groq provider');
      }
      this.client = new Groq({
        apiKey: this.config.groqApiKey
      });
    } else if (this.config.provider === 'gemini') {
      if (!this.config.geminiApiKey) {
        throw new Error('Gemini API key is required when using Gemini provider');
      }
      this.client = new GoogleGenerativeAI(this.config.geminiApiKey);
    } else {
      throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
    
    this.initialized = true;
  }

  async generateCompletion(messages, options = {}) {
    try {
      if (!this.initialized) {
        this.initializeClient();
      }
      
      const defaultOptions = {
        model: this.config.model,
        max_tokens: 500,
        temperature: 0.3
      };

      const completionOptions = { ...defaultOptions, ...options };

      let response;
      if (this.config.provider === 'openai') {
        response = await this.client.chat.completions.create({
          ...completionOptions,
          messages
        });
        return response.choices[0].message.content;
      } else if (this.config.provider === 'groq') {
        response = await this.client.chat.completions.create({
          ...completionOptions,
          messages
        });
        return response.choices[0].message.content;
      } else if (this.config.provider === 'gemini') {
        // Gemini uses a different API structure
        const model = this.client.getGenerativeModel({ model: completionOptions.model });
        
        // Convert messages to Gemini format
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
        const responseText = result.response.text();
        return responseText;
      }
    } catch (error) {
      logger.error('Error generating AI completion:', error);
      throw error;
    }
  }

  async summarizeWorkItem(workItem) {
    try {
      if (!this.initialized) {
        try {
          this.initializeClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback summary');
          return 'AI summarization not available - please configure AI provider in settings.';
        }
      }
      
      const title = workItem.fields?.['System.Title'] || 'No title';
      const description = workItem.fields?.['System.Description'] || 'No description';
      const workItemType = workItem.fields?.['System.WorkItemType'] || 'Unknown';
      const priority = workItem.fields?.['Microsoft.VSTS.Common.Priority'] || 'Not set';

      // Clean HTML from description
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

      const summary = await this.generateCompletion(messages, { 
        max_tokens: 150,  // Increased for 2-3 sentences
        temperature: 0.1  // Very low for factual, consistent responses
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

  async summarizeBuildFailure(build, timeline, logs) {
    try {
      if (!this.initialized) {
        try {
          this.initializeClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback summary');
          return 'AI analysis not available - please configure AI provider in settings.';
        }
      }
      
      const buildName = build.definition?.name || 'Unknown Build';
      const buildNumber = build.buildNumber || 'Unknown';
      const result = build.result || 'Unknown';
      const sourceBranch = build.sourceBranch?.replace('refs/heads/', '') || 'Unknown';
      
      // Extract relevant error information from timeline
      const failedJobs = timeline?.records?.filter(record => 
        record.result === 'failed' || record.result === 'canceled'
      ) || [];

      const errorMessages = failedJobs.map(job => {
        const jobName = job.name || 'Unknown Job';
        const issues = job.issues?.map(i => i.message).join('; ') || 'No specific error details';
        return `${jobName}: ${issues}`;
      }).join('\n');

      // Try to get pipeline definition to determine type and fetch YAML if applicable
      let pipelineContent = '';
      let pipelineType = 'classic';
      let pipelineAnalysisNote = '';
      
      try {
        if (build.definition?.id) {
          const { azureDevOpsClient } = await import('../devops/azureDevOpsClient.js');
          const definition = await azureDevOpsClient.getBuildDefinition(build.definition.id);
          
          // Check if it's YAML pipeline (type 2) or classic (type 1)
          if (definition.process?.type === 2 && definition.process?.yamlFilename) {
            pipelineType = 'yaml';
            const yamlPath = definition.process.yamlFilename;
            const repositoryId = definition.repository?.id;
            
            if (repositoryId && yamlPath) {
              try {
                const yamlFile = await azureDevOpsClient.getRepositoryFile(repositoryId, yamlPath, sourceBranch);
                pipelineContent = yamlFile.content || '';
                
                if (!pipelineContent) {
                  pipelineAnalysisNote = 'YAML pipeline file was found but appears to be empty.';
                }
              } catch (yamlError) {
                pipelineAnalysisNote = `Unable to fetch YAML pipeline file (${yamlPath}).`;
              }
            } else {
              pipelineAnalysisNote = 'YAML pipeline detected but missing repository information.';
            }
          }
        }
      } catch (definitionError) {
        pipelineAnalysisNote = `Unable to fetch build definition. Analysis limited to timeline data.`;
      }

      // Create focused prompts based on pipeline type
      let systemPrompt, userPrompt;

      if (pipelineType === 'classic') {
        // Classic pipeline: Focus only on timeline errors with general solutions
        systemPrompt = `You are a DevOps build failure analyzer for classic Azure DevOps pipelines.

CRITICAL GOOGLE CHAT FORMATTING RULES:
- ONLY use *text* for bold (NEVER **text** - this will break formatting)
- Use _text_ for italic
- Use ~text~ for strikethrough
- Use \`code\` for inline code
- Use \`\`\`code block\`\`\` for code blocks
- Use - for bullet points
- NEVER use **text** or # headers or ### - they don't work in Google Chat
- Do NOT create section headers - write in flowing paragraphs

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
        // YAML pipeline with content: Use both timeline and YAML for specific solutions
        systemPrompt = `You are a DevOps build failure analyzer for YAML Azure DevOps pipelines.

CRITICAL GOOGLE CHAT FORMATTING RULES:
- ONLY use *text* for bold (NEVER **text** - this will break formatting)
- Use _text_ for italic
- Use ~text~ for strikethrough
- Use \`code\` for inline code
- Use \`\`\`yaml for YAML code blocks
- Use - for bullet points
- NEVER use **text** or # headers or ### - they don't work in Google Chat
- Do NOT create section headers like "Issue:" or "YAML Fix:" - write in flowing paragraphs

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
        // YAML pipeline without content: Timeline errors only with YAML guidance
        systemPrompt = `You are a DevOps build failure analyzer for YAML Azure DevOps pipelines.

CRITICAL GOOGLE CHAT FORMATTING RULES:
- ONLY use *text* for bold (NEVER **text** - this will break formatting)
- Use _text_ for italic
- Use ~text~ for strikethrough
- Use \`code\` for inline code
- Use \`\`\`yaml for YAML code blocks
- Use - for bullet points
- NEVER use **text** or # headers or ### - they don't work in Google Chat
- Do NOT create section headers - write in flowing paragraphs

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

      // Log what we're sending to AI
      logger.info('AI Prompt being sent:', {
        systemPrompt,
        userPrompt
      });

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ];

      const summary = await this.generateCompletion(messages, { 
        max_tokens: 1000,
        temperature: 0.1
      });
      
      // Log what we got back from AI
      logger.info('AI Response received:', {
        response: summary
      });
      
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

  async summarizePullRequest(pullRequest) {
    try {
      if (!this.initialized) {
        try {
          this.initializeClient();
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

      const summary = await this.generateCompletion(messages, { 
        max_tokens: 120,  // Slightly reduced for more focused output
        temperature: 0.2  // Slightly higher for more natural language
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

  async summarizeSprintWorkItems(workItems) {
    try {
      if (!workItems || workItems.length === 0) {
        return 'No work items found in the current sprint.';
      }

      if (!this.initialized) {
        try {
          this.initializeClient();
        } catch (error) {
          logger.warn('AI service not configured, returning fallback message');
          return 'AI insights not available - please configure AI provider in settings.';
        }
      }

      // Group work items by state and assignee for analysis (not for display)
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

      // Create data summary for AI analysis (internal use only)
      const dataSummary = Object.entries(groupedItems).map(([state, assignees]) => {
        const assigneeSummary = Object.entries(assignees).map(([assignee, items]) => {
          return `${assignee}: ${items.length} items (${items.map(i => `${i.type} #${i.id}`).join(', ')})`;
        }).join('; ');
        
        return `${state} (${Object.values(assignees).flat().length} items): ${assigneeSummary}`;
      }).join('\n');

      // Calculate key metrics for AI analysis
      const totalItems = workItems.length;
      const completedStates = ['Closed', 'Removed', 'Released to Production'];
      const activeStates = workItems.filter(item => {
        const state = item.fields?.['System.State'];
        return state && !['Defined', 'New', 'Closed', 'Blocked', 'Paused', 'Removed', 'Released to Production'].includes(state);
      });
      const unassignedItems = workItems.filter(item => !item.fields?.['System.AssignedTo']?.displayName);
      
      // Get unique assignees and their workloads
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

      const aiInsights = await this.generateCompletion(messages, { 
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
}

export const aiService = new AIService();
