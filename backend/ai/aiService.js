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
      const state = workItem.fields?.['System.State'] || 'Unknown';
      const assignedTo = workItem.fields?.['System.AssignedTo']?.displayName || 'Unassigned';

      const messages = [
        {
          role: 'system',
          content: 'You are an AI assistant that summarizes Azure DevOps work items. Provide a concise, professional summary focusing on the key points and requirements.'
        },
        {
          role: 'user',
          content: `Please summarize this work item:
          
Type: ${workItemType}
Title: ${title}
State: ${state}
Assigned To: ${assignedTo}
Description: ${description}

Provide a brief, actionable summary in 2-3 sentences.`
        }
      ];

      const summary = await this.generateCompletion(messages, { max_tokens: 200 });
      
      logger.info('Generated work item summary', {
        workItemId: workItem.id,
        summaryLength: summary.length
      });

      return summary;
    } catch (error) {
      logger.error('Error summarizing work item:', error);
      return 'Unable to generate AI summary at this time.';
    }
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
      
      // Extract relevant error information from timeline and logs
      const failedJobs = timeline?.records?.filter(record => 
        record.result === 'failed' || record.result === 'canceled'
      ) || [];

      const errorMessages = failedJobs.map(job => 
        `Job: ${job.name}, Result: ${job.result}, Issues: ${job.issues?.map(i => i.message).join('; ') || 'None'}`
      ).join('\n');

      const messages = [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes build failures in Azure DevOps. Provide a concise analysis of the failure cause and suggest potential solutions.'
        },
        {
          role: 'user',
          content: `Please analyze this build failure:

Build: ${buildName} #${buildNumber}
Status: ${build.status}
Result: ${build.result}

Failed Jobs and Errors:
${errorMessages}

Provide a brief analysis of the likely cause and 1-2 actionable suggestions to fix the issue.`
        }
      ];

      const summary = await this.generateCompletion(messages, { max_tokens: 300 });
      
      logger.info('Generated build failure summary', {
        buildId: build.id,
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
          content: 'You are an AI assistant that summarizes pull requests. Create a changelog-style summary focusing on what changes were made and their impact.'
        },
        {
          role: 'user',
          content: `Please create a changelog-style summary for this pull request:

Title: ${title}
Author: ${createdBy}
Source Branch: ${sourceBranch}
Target Branch: ${targetBranch}
Description: ${description}

Format the summary as a brief changelog entry highlighting the key changes and their purpose.`
        }
      ];

      const summary = await this.generateCompletion(messages, { max_tokens: 250 });
      
      logger.info('Generated pull request summary', {
        pullRequestId: pullRequest.pullRequestId,
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
