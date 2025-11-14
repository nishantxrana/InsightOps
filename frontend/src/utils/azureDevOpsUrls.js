// Helper functions to build Azure DevOps URLs

export const buildReleaseUrl = (organization, project, releaseId, baseUrl = 'https://dev.azure.com') => {
  if (!organization || !project || !releaseId) {
    console.warn('Missing required parameters for release URL:', { organization, project, releaseId });
    return '#';
  }
  
  const encodedProject = encodeURIComponent(project);
  return `${baseUrl}/${organization}/${encodedProject}/_release?releaseId=${releaseId}`;
};

export const buildWorkItemUrl = (organization, project, workItemId, baseUrl = 'https://dev.azure.com') => {
  if (!organization || !project || !workItemId) {
    console.warn('Missing required parameters for work item URL:', { organization, project, workItemId });
    return '#';
  }
  
  const encodedProject = encodeURIComponent(project);
  return `${baseUrl}/${organization}/${encodedProject}/_workitems/edit/${workItemId}`;
};

export const buildPipelineUrl = (organization, project, buildId, baseUrl = 'https://dev.azure.com') => {
  if (!organization || !project || !buildId) {
    console.warn('Missing required parameters for pipeline URL:', { organization, project, buildId });
    return '#';
  }
  
  const encodedProject = encodeURIComponent(project);
  return `${baseUrl}/${organization}/${encodedProject}/_build/results?buildId=${buildId}`;
};

export const buildPullRequestUrl = (organization, project, pullRequestId, baseUrl = 'https://dev.azure.com') => {
  if (!organization || !project || !pullRequestId) {
    console.warn('Missing required parameters for pull request URL:', { organization, project, pullRequestId });
    return '#';
  }
  
  const encodedProject = encodeURIComponent(project);
  return `${baseUrl}/${organization}/${encodedProject}/_git/pullrequest/${pullRequestId}`;
};
