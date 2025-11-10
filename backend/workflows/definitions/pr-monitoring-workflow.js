/**
 * PR Monitoring Workflow
 * Handles idle PRs automatically
 */
export default {
  id: 'pr-monitoring',
  name: 'Pull Request Monitoring',
  description: 'Monitor PRs and send reminders for idle ones',
  
  trigger: {
    type: 'scheduled',
    cron: '0 */6 * * *' // Every 6 hours
  },

  steps: [
    {
      id: 'check_pr',
      agent: 'monitor',
      action: 'monitorPullRequest',
      input: '${pr}',
      output: 'pr_status'
    },
    {
      id: 'send_reminder',
      agent: 'execute',
      action: 'sendNotification',
      input: {
        recipient: '${pr.reviewers}',
        message: 'PR review reminder: ${pr.title}',
        priority: 'normal'
      },
      condition: '${pr_status.result.action} == "send_notification"',
      output: 'reminder_sent'
    },
    {
      id: 'escalate_if_needed',
      agent: 'execute',
      action: 'escalate',
      input: {
        issue: { type: 'pr_idle', pr: '${pr}' },
        reason: 'PR idle for extended period'
      },
      condition: '${pr_status.result.action} == "escalate"',
      output: 'escalation_result'
    }
  ]
};
