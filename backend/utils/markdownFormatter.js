
import { azureDevOpsClient } from '../devops/azureDevOpsClient.js';

class MarkdownFormatter {
  formatWorkItemCreated(workItem, aiSummary = null) {
    const fields = workItem.fields || {};
    const title = fields['System.Title'] || 'No title';
    const workItemType = fields['System.WorkItemType'] || 'Work Item';
    const assignedTo = fields['System.AssignedTo'] || 'Unassigned';
    const createdBy = fields['System.CreatedBy'] || 'Unknown';
    const state = fields['System.State'] || 'New';
    const priority = fields['Microsoft.VSTS.Common.Priority'] || 'Not set';
    const createdDate = fields['System.CreatedDate'] || new Date().toISOString();

    // Construct work item URL
    const webUrl = workItem.webUrl || azureDevOpsClient.constructWorkItemWebUrl(workItem);

    let message = `*🆕 New ${workItemType} Created*\n\n`;
    message += `*${workItemType} #${workItem.id}*: ${title}\n\n`;
    message += `- *State*: ${state}\n`;
    message += `- *Assigned To*: ${this.extractDisplayName(assignedTo)}\n`;
    message += `- *Created By*: ${this.extractDisplayName(createdBy)}\n`;
    message += `- *Priority*: ${this.getPriorityText(priority)}\n`;
    message += `- *Created*: ${this.formatLocalTime(createdDate)}\n`;
    message += `- *Work Item URL*: <${webUrl}|Open Work Item>\n`;

    if (aiSummary) {
      message += `\n*🤖 AI Summary*\n${aiSummary}\n`;
    }

    return message;
  }

  formatWorkItemUpdated(webhookData) {
    // Extract data from webhook structure
    const resource = webhookData.resource || webhookData;
    const revision = resource.revision || resource;
    const fields = revision.fields || resource.fields || {};
    const changedFields = resource.fields || {}; // This contains old/new values
    
    const workItemId = resource.workItemId || revision.id || resource.id;
    const title = fields['System.Title'] || 'No title';
    const workItemType = fields['System.WorkItemType'] || 'Work Item';
    const currentState = fields['System.State'] || 'Unknown';
    const currentAssignedTo = fields['System.AssignedTo'] || 'Unassigned';
    const priority = fields['Microsoft.VSTS.Common.Priority'] || 'Not set';
    const changedBy = fields['System.ChangedBy'] || 'Unknown';
    const changedDate = fields['System.ChangedDate'] || new Date().toISOString();
    
    // Extract what changed
    const changes = [];
    
    // Check for state change
    if (changedFields['System.State']) {
      const oldState = changedFields['System.State'].oldValue || 'Unknown';
      const newState = changedFields['System.State'].newValue || currentState;
      changes.push(`*State*: ${oldState} ➝ ${newState}`);
    }
    
    // Check for assignment change
    if (changedFields['System.AssignedTo']) {
      const oldAssignee = this.extractDisplayName(changedFields['System.AssignedTo'].oldValue) || 'Unassigned';
      const newAssignee = this.extractDisplayName(changedFields['System.AssignedTo'].newValue) || 'Unassigned';
      changes.push(`*Assigned To*: ${oldAssignee} ➝ ${newAssignee}`);
    }
    
    // Check for priority change
    if (changedFields['Microsoft.VSTS.Common.Priority']) {
      const oldPriority = this.getPriorityText(changedFields['Microsoft.VSTS.Common.Priority'].oldValue);
      const newPriority = this.getPriorityText(changedFields['Microsoft.VSTS.Common.Priority'].newValue);
      changes.push(`*Priority*: ${oldPriority} ➝ ${newPriority}`);
    }

    // Check for due date change
    if (changedFields['Microsoft.VSTS.Scheduling.DueDate']) {
      const oldDueDate = changedFields['Microsoft.VSTS.Scheduling.DueDate'].oldValue;
      const newDueDate = changedFields['Microsoft.VSTS.Scheduling.DueDate'].newValue;
      const oldDueDateFormatted = oldDueDate ? this.formatLocalDate(oldDueDate) : 'Not set';
      const newDueDateFormatted = newDueDate ? this.formatLocalDate(newDueDate) : 'Not set';
      changes.push(`*Due Date*: ${oldDueDateFormatted} ➝ ${newDueDateFormatted}`);
    }

    // Construct work item URL
    const webUrl = resource._links?.html?.href || 
                   revision._links?.html?.href ||
                   azureDevOpsClient.constructWorkItemWebUrl({ id: workItemId, fields });

    let message = `*📝 Work Item Updated*\n\n`;
    message += `*${workItemType} #${workItemId}*: ${title}\n\n`;
    
    if (changes.length > 0) {
      message += `*Changes:*\n`;
      changes.forEach(change => {
        message += `- ${change}\n`;
      });
      message += `\n`;
    }
    
    message += `- *Current State*: ${currentState}\n`;
    message += `- *Current Assigned To*: ${this.extractDisplayName(currentAssignedTo)}\n`;
    message += `- *Priority*: ${this.getPriorityText(priority)}\n`;
    message += `- *Updated By*: ${this.extractDisplayName(changedBy)}\n`;
    message += `- *Updated*: ${this.formatLocalTime(changedDate)}\n`;
    message += `- *Work Item URL*: <${webUrl}|Open Work Item>\n`;

    return message;
  }

  // Helper method to extract display name from Azure DevOps user string
  extractDisplayName(userString) {
    if (!userString) return 'Unassigned';
    if (typeof userString === 'string') {
      // Handle formats like "Nishant Rana <nishantrana249000@gmail.com>" or just "nishantrana249000@gmail.com"
      const match = userString.match(/^([^<]+)<.*>$/) || userString.match(/^(.+)$/);
      return match ? match[1].trim() : userString;
    }
    return userString.displayName || userString.name || 'Unknown';
  }

  // Helper method to convert priority number to text
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

  // Helper method to format time in IST timezone (+5:30)
  formatLocalTime(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      // Format in IST timezone (Asia/Kolkata)
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString; // Fallback to original string if parsing fails
    }
  }

  // Helper method to format date only in IST timezone (+5:30)
  formatLocalDate(dateString) {
    if (!dateString) return 'Not set';
    
    try {
      const date = new Date(dateString);
      // Format date only in IST timezone (Asia/Kolkata)
      return date.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString; // Fallback to original string if parsing fails
    }
  }

  formatBuildCompleted(build) {
    const buildName = build.definition?.name || 'Unknown Build';
    const buildNumber = build.buildNumber || 'Unknown';
    const result = build.result || 'Unknown';
    const requestedBy = build.requestedBy?.displayName || 'Unknown';
    const startTime = build.startTime ? new Date(build.startTime).toLocaleString() : 'Unknown';
    const finishTime = build.finishTime ? new Date(build.finishTime).toLocaleString() : 'Unknown';

    const emoji = result === 'succeeded' ? '✅' : result === 'failed' ? '❌' : '⚠️';
    
    let message = `## ${emoji} Build ${result.charAt(0).toUpperCase() + result.slice(1)}\n\n`;
    message += `**${buildName}** #${buildNumber}\n\n`;
    message += `- **Result**: ${result}\n`;
    message += `- **Requested By**: ${requestedBy}\n`;
    message += `- **Started**: ${startTime}\n`;
    message += `- **Finished**: ${finishTime}\n`;

    if (build.sourceBranch) {
      message += `- **Branch**: ${build.sourceBranch.replace('refs/heads/', '')}\n`;
    }

    return message;
  }

  formatBuildFailed(build, aiSummary = null) {
    let message = this.formatBuildCompleted(build);

    if (aiSummary) {
      message += `\n### 🤖 AI Analysis\n${aiSummary}\n`;
    }

    message += `\n### 🔍 Next Steps\n`;
    message += `- Check the build logs for detailed error information\n`;
    message += `- Verify recent code changes in the source branch\n`;
    message += `- Contact the build owner if the issue persists\n`;

    return message;
  }

  formatPullRequestCreated(pullRequest, aiSummary = null) {
      const title = pullRequest.title || 'No title';
      const createdBy = pullRequest.createdBy?.displayName || 'Unknown';
      const project = pullRequest.repository?.project?.name || 'Unknown';
      const repository = pullRequest.repository?.name || 'Unknown';
      const sourceBranch = pullRequest.sourceRefName?.replace('refs/heads/', '') || 'unknown';
      const targetBranch = pullRequest.targetRefName?.replace('refs/heads/', '') || 'unknown';
      const description = ((pullRequest.description || 'No description').slice(0, 200)) +
                    ((pullRequest.description?.length ?? 0) > 200 ? '...' : '');

      let message = `*New Pull Request Created!*\n`;

      message += `- *Title:* ${title}\n`;
      message += `- *PR ID:* ${pullRequest.pullRequestId}\n`;
      message += `- *Created By:* ${createdBy}\n`;
      message += `- *Project:* ${project}\n`;
      message += `- *Repository:* ${repository}\n`;
      message += `- *Source Branch:* ${sourceBranch}\n`;
      message += `- *Target Branch:* ${targetBranch}\n`;
      message += `- *PR Url:* <${pullRequest.webUrl || pullRequest.url}|Open Pull Request>\n`;
      message += `- *Description:* ${description}\n\n`;

    // if (aiSummary) {
    //   message += `\n*🤖 AI Summary* \n${aiSummary}\n`;
    // }

    return message;
  }

  formatPullRequestUpdated(pullRequest) {
    const title = pullRequest.title || 'No title';
    const status = pullRequest.status || 'unknown';

    let message = `## 🔄 Pull Request Updated\n\n`;
    message += `**#${pullRequest.pullRequestId}**: ${title}\n\n`;
    message += `- **Status**: ${status}\n`;
    message += `- **Updated**: ${new Date().toLocaleString()}\n`;
    message += `- **PR URL**: ${pullRequest.webUrl || pullRequest.url}\n`;

    return message;
  }

  formatPullRequestReviewerAssigned(pullRequest, reviewers) {
    const title = pullRequest.title || 'No title';
    const reviewerList = Array.isArray(reviewers) ? reviewers.join(', ') : reviewers;

    let message = `## 👥 Pull Request Reviewer Assigned\n\n`;
    message += `**#${pullRequest.pullRequestId}**: ${title}\n\n`;
    message += `- **New Reviewers**: ${reviewerList}\n`;
    message += `- **Action Required**: Please review the pull request\n`;
    message += `- **PR URL**: ${pullRequest.webUrl || pullRequest.url}\n`;

    return message;
  }

  formatIdlePullRequestReminder(pullRequests) {
    if (!pullRequests || pullRequests.length === 0) {
      return '';
    }

    let message = `*⏰ Idle Pull Requests Reminder* \n\n`;
    message += `The following pull requests have been inactive for more than 48 hours:\n\n`;

    pullRequests.forEach(pr => {
      const title = pr.title || 'No title';
      const createdBy = pr.createdBy?.displayName || 'Unknown';
      const lastActivity = pr.lastMergeCommit?.committer?.date || pr.creationDate;
      const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
      const project = pr.repository?.project?.name || 'Unknown';
      const repository = pr.repository?.name || 'Unknown';
      const sourceBranch = pr.sourceRefName?.replace('refs/heads/', '') || 'unknown';
      const targetBranch = pr.targetRefName?.replace('refs/heads/', '') || 'unknown';
      const description = ((pr.description || 'No description').slice(0, 100)) +
                    ((pr.description?.length ?? 0) > 100 ? '...' : '');

      message += `*Pull Request ID:* ${pr.pullRequestId}\n`;
      message += `- *Title:* ${title}\n`;
      message += `- *Created By:* ${createdBy}\n`;
      message += `- *Project:* ${project}\n`;
      message += `- *Repository:* ${repository}\n`;
      message += `- *Source Branch:* ${sourceBranch}\n`;
      message += `- *Target Branch:* ${targetBranch}\n`;
      message += `- *Last Activity:* ${daysSinceActivity} days ago\n`;
      message += `- *PR Url:* <${pr.webUrl || pr.url}|Open Pull Request>\n`;
      message += `- *Description:* ${description}\n\n`;
    });

    message += `Please review these pull requests to keep the development process moving.\n`;

    return message;
  }

  formatOverdueItemsMessage(overdueItems) {
    if (!overdueItems || overdueItems.length === 0) {
      return '';
    }

    let message = `*⚠️ Overdue Work Items (${overdueItems.length})* \n\n`;
    message += `The following work items are past their due date and need attention:\n\n`;

    overdueItems.forEach(item => {
      const title = item.fields?.['System.Title'] || 'No title';
      const assignee = item.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
      const dueDate = item.fields?.['Microsoft.VSTS.Scheduling.DueDate'];
      const workItemType = item.fields?.['System.WorkItemType'] || 'Item';
      const state = item.fields?.['System.State'] || 'Unknown';
      const priority = item.fields?.['Microsoft.VSTS.Common.Priority'] || 'Not set';
      const createdBy = item.fields?.['System.CreatedBy']?.displayName || 'Unknown';
      const daysPastDue = dueDate ? Math.floor((Date.now() - new Date(dueDate)) / (1000 * 60 * 60 * 24)) : 0;

      message += `*${workItemType}* #${item.id}: ${title}\n`;
      message += `- *Assigned To:* ${assignee}\n`;
      message += `- *State:* ${state}\n`;
      message += `- *Priority:* ${priority}\n`;
      message += `- *Due Date:* ${dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date'}\n`;
      if (dueDate && daysPastDue > 0) {
        message += `- *Days Overdue:* ${daysPastDue} days\n`;
      }
      message += `- *Work Item Url:* <${item.webUrl || azureDevOpsClient.constructWorkItemWebUrl(item)}|Open Work Item>\n\n`;
    });

    message += `Please review and update the status of these items to keep the project on track.\n`;

    return message;
  }
}

export const markdownFormatter = new MarkdownFormatter();
