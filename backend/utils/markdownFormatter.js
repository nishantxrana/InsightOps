class MarkdownFormatter {
  formatWorkItemCreated(workItem, aiSummary = null) {
    const title = workItem.fields?.['System.Title'] || 'No title';
    const workItemType = workItem.fields?.['System.WorkItemType'] || 'Work Item';
    const assignedTo = workItem.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
    const createdBy = workItem.fields?.['System.CreatedBy']?.displayName || 'Unknown';
    const state = workItem.fields?.['System.State'] || 'New';
    const priority = workItem.fields?.['Microsoft.VSTS.Common.Priority'] || 'Not set';

    let message = `## 🆕 New ${workItemType} Created\n\n`;
    message += `**#${workItem.id}**: ${title}\n\n`;
    message += `- **Type**: ${workItemType}\n`;
    message += `- **State**: ${state}\n`;
    message += `- **Assigned To**: ${assignedTo}\n`;
    message += `- **Created By**: ${createdBy}\n`;
    message += `- **Priority**: ${priority}\n`;

    if (aiSummary) {
      message += `\n### 🤖 AI Summary\n${aiSummary}\n`;
    }

    return message;
  }

  formatWorkItemUpdated(workItem) {
    const title = workItem.fields?.['System.Title'] || 'No title';
    const workItemType = workItem.fields?.['System.WorkItemType'] || 'Work Item';
    const assignedTo = workItem.fields?.['System.AssignedTo']?.displayName || 'Unassigned';
    const changedBy = workItem.fields?.['System.ChangedBy']?.displayName || 'Unknown';
    const state = workItem.fields?.['System.State'] || 'Unknown';

    let message = `## 📝 ${workItemType} Updated\n\n`;
    message += `**#${workItem.id}**: ${title}\n\n`;
    message += `- **Current State**: ${state}\n`;
    message += `- **Assigned To**: ${assignedTo}\n`;
    message += `- **Updated By**: ${changedBy}\n`;
    message += `- **Updated**: ${new Date().toLocaleString()}\n`;

    return message;
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
    const sourceBranch = pullRequest.sourceRefName?.replace('refs/heads/', '') || 'unknown';
    const targetBranch = pullRequest.targetRefName?.replace('refs/heads/', '') || 'unknown';
    const reviewers = pullRequest.reviewers?.map(r => r.displayName).join(', ') || 'None assigned';

    let message = `## 🔀 New Pull Request Created\n\n`;
    message += `**#${pullRequest.pullRequestId}**: ${title}\n\n`;
    message += `- **Author**: ${createdBy}\n`;
    message += `- **Source**: ${sourceBranch}\n`;
    message += `- **Target**: ${targetBranch}\n`;
    message += `- **Reviewers**: ${reviewers}\n`;

    if (pullRequest.description) {
      message += `\n### Description\n${pullRequest.description}\n`;
    }

    if (aiSummary) {
      message += `\n### 🤖 AI Summary\n${aiSummary}\n`;
    }

    return message;
  }

  formatPullRequestUpdated(pullRequest) {
    const title = pullRequest.title || 'No title';
    const status = pullRequest.status || 'unknown';

    let message = `## 🔄 Pull Request Updated\n\n`;
    message += `**#${pullRequest.pullRequestId}**: ${title}\n\n`;
    message += `- **Status**: ${status}\n`;
    message += `- **Updated**: ${new Date().toLocaleString()}\n`;

    return message;
  }

  formatPullRequestReviewerAssigned(pullRequest, reviewers) {
    const title = pullRequest.title || 'No title';
    const reviewerList = Array.isArray(reviewers) ? reviewers.join(', ') : reviewers;

    let message = `## 👥 Pull Request Reviewer Assigned\n\n`;
    message += `**#${pullRequest.pullRequestId}**: ${title}\n\n`;
    message += `- **New Reviewers**: ${reviewerList}\n`;
    message += `- **Action Required**: Please review the pull request\n`;

    return message;
  }

  formatIdlePullRequestReminder(pullRequests) {
    if (!pullRequests || pullRequests.length === 0) {
      return '';
    }

    let message = `## ⏰ Idle Pull Requests Reminder\n\n`;
    message += `The following pull requests have been inactive for more than 48 hours:\n\n`;

    pullRequests.forEach(pr => {
      const title = pr.title || 'No title';
      const createdBy = pr.createdBy?.displayName || 'Unknown';
      const lastActivity = pr.lastMergeCommit?.committer?.date || pr.creationDate;
      const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));

      message += `- **#${pr.pullRequestId}**: ${title}\n`;
      message += `  - Author: ${createdBy}\n`;
      message += `  - Last Activity: ${daysSinceActivity} days ago\n\n`;
    });

    message += `Please review these pull requests to keep the development process moving.\n`;

    return message;
  }
}

export const markdownFormatter = new MarkdownFormatter();
