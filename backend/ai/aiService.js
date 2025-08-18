import OpenAI from 'openai';
import Groq from 'groq-sdk';
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
      
      // Extract relevant error information from timeline and logs
      const failedJobs = timeline?.records?.filter(record => 
        record.result === 'failed' || record.result === 'canceled'
      ) || [];

      const errorMessages = failedJobs.map(job => {
        const jobName = job.name || 'Unknown Job';
        const issues = job.issues?.map(i => i.message).join('; ') || 'No specific error details';
        return `${jobName}: ${issues}`;
      }).join('\n');

      const messages = [
        {
          role: 'system',
          content: `You are a DevOps build failure analyzer. Provide clear, actionable analysis for development teams.

Formatting Rules:
- Write in plain text with selective *bold* emphasis only for key terms
- Use *bold* ONLY for: error types, component names, file names, or critical actions
- Do NOT make entire sentences or responses bold
- Write exactly 2-3 sentences

Content Rules:
- Focus on the most likely cause based on error data
- Suggest immediate next steps for developers
- Be specific about technical issues when available
- No speculation beyond what the error data shows
- Make it actionable and helpful for debugging`
        },
        {
          role: 'user',
          content: `Analyze this build failure and provide a 2-3 sentence analysis:

Build: ${buildName} #${buildNumber}
Branch: ${sourceBranch}
Result: ${result}
Failed Jobs & Errors: ${errorMessages || 'No specific error details available'}

Identify the most likely cause of the failure and suggest what the development team should check first.`
        }
      ];

      const summary = await this.generateCompletion(messages, { 
        max_tokens: 150,
        temperature: 0.1
      });
      
      logger.info('Generated build failure summary', {
        buildId: build.id,
        buildName,
        result,
        failedJobsCount: failedJobs.length,
        summaryLength: summary.length
      });

      return summary;
    } catch (error) {
      logger.error('Error summarizing build failure:', error);
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
          logger.warn('AI service not configured, returning basic summary');
          // Return a basic summary without AI insights
          const groupedItems = workItems.reduce((acc, item) => {
            const state = item.fields?.['System.State'] || 'Unknown';
            const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
            
            if (!acc[state]) acc[state] = {};
            if (!acc[state][assignee]) acc[state][assignee] = [];
            
            acc[state][assignee].push({
              id: item.id,
              title: item.fields?.['System.Title'] || 'No title',
              type: item.fields?.['System.WorkItemType'] || 'Unknown'
            });
            
            return acc;
          }, {});

          const summary = Object.entries(groupedItems).map(([state, assignees]) => {
            const assigneeSummary = Object.entries(assignees).map(([assignee, items]) => {
              return `  - ${assignee}: ${items.length} items (${items.map(i => `${i.type} #${i.id}`).join(', ')})`;
            }).join('\n');
            
            return `**${state}** (${Object.values(assignees).flat().length} items):\n${assigneeSummary}`;
          }).join('\n\n');

          return `## Sprint Summary\n\n${summary}\n\n*AI insights not available - please configure AI provider in settings.*`;
        }
      }

      // Group work items by state and assignee
      const groupedItems = workItems.reduce((acc, item) => {
        const state = item.fields?.['System.State'] || 'Unknown';
        const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
        
        if (!acc[state]) acc[state] = {};
        if (!acc[state][assignee]) acc[state][assignee] = [];
        
        acc[state][assignee].push({
          id: item.id,
          title: item.fields?.['System.Title'] || 'No title',
          type: item.fields?.['System.WorkItemType'] || 'Unknown'
        });
        
        return acc;
      }, {});

      const summary = Object.entries(groupedItems).map(([state, assignees]) => {
        const assigneeSummary = Object.entries(assignees).map(([assignee, items]) => {
          return `  - ${assignee}: ${items.length} items (${items.map(i => `${i.type} #${i.id}`).join(', ')})`;
        }).join('\n');
        
        return `**${state}** (${Object.values(assignees).flat().length} items):\n${assigneeSummary}`;
      }).join('\n\n');

      const messages = [
        {
          role: 'system',
          content: 'You are an AI assistant that creates executive summaries of sprint progress. Provide insights and recommendations based on the work item distribution.'
        },
        {
          role: 'user',
          content: `Please provide an executive summary and insights for this sprint status:

${summary}

Include key observations about progress, potential blockers, and recommendations for the team.`
        }
      ];

      const aiInsights = await this.generateCompletion(messages, { max_tokens: 400 });
      
      return `## Sprint Summary\n\n${summary}\n\n## AI Insights\n\n${aiInsights}`;
    } catch (error) {
      logger.error('Error summarizing sprint work items:', error);
      return 'Unable to generate sprint summary at this time.';
    }
  }
}

export const aiService = new AIService();
