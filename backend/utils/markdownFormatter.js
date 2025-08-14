
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
      message += `\n*🤖 AI Summary* \n${aiSummary}\n`;
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
      message += `- *Work Item Url:* <${item.url || `https://dev.azure.com/${item.fields?.['System.TeamProject']}/_workitems/edit/${item.id}`}|Open Work Item>\n\n`;
    });

    message += `Please review and update the status of these items to keep the project on track.\n`;

    return message;
  }
}

export const markdownFormatter = new MarkdownFormatter();
