/**
 * Build Failure Resolution Workflow
 * Automatically handles build failures
 */
export default {
  id: 'build-failure-resolution',
  name: 'Build Failure Resolution',
  description: 'Automatically analyze and resolve build failures',
  
  trigger: {
    type: 'event',
    event: 'build.failed'
  },

  steps: [
    {
      id: 'monitor',
      agent: 'monitor',
      action: 'monitorBuildFailure',
      input: '${build}',
      output: 'analysis'
    },
    {
      id: 'check_auto_fix',
      agent: 'execute',
      action: 'decide',
      input: '${analysis}',
      output: 'decision'
    },
    {
      id: 'execute_fix',
      agent: 'execute',
      action: 'executeAction',
      input: '${decision}',
      condition: '${decision.decision} == "auto_execute"',
      output: 'fix_result'
    },
    {
      id: 'notify',
      agent: 'execute',
      action: 'sendNotification',
      input: {
        recipient: 'team',
        message: '${fix_result}',
        priority: 'high'
      },
      output: 'notification_result'
    }
  ]
};
