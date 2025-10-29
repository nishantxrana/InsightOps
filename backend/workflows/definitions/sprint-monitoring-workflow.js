/**
 * Sprint Monitoring Workflow
 * Proactively monitors sprint health
 */
export default {
  id: 'sprint-monitoring',
  name: 'Sprint Health Monitoring',
  description: 'Monitor sprint progress and identify risks',
  
  trigger: {
    type: 'scheduled',
    cron: '0 9 * * *' // Every day at 9 AM
  },

  steps: [
    {
      id: 'analyze_sprint',
      agent: 'analyze',
      action: 'analyzeSprintHealth',
      input: '${workItems}',
      output: 'sprint_analysis'
    },
    {
      id: 'check_risks',
      agent: 'execute',
      action: 'decide',
      input: '${sprint_analysis}',
      output: 'risk_decision'
    },
    {
      id: 'escalate_blockers',
      agent: 'execute',
      action: 'escalate',
      input: {
        issue: '${sprint_analysis.risks}',
        reason: 'Sprint blockers detected'
      },
      condition: '${sprint_analysis.risks.length} > 0',
      output: 'escalation_result'
    },
    {
      id: 'send_summary',
      agent: 'execute',
      action: 'sendNotification',
      input: {
        recipient: 'team',
        message: '${sprint_analysis}',
        priority: 'normal'
      },
      output: 'notification_result'
    }
  ]
};
