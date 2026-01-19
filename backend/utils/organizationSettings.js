import { organizationService } from '../services/organizationService.js';
import { logger } from './logger.js';

/**
 * Get organization settings for API requests
 * Uses organization from request context (set by middleware)
 * Falls back to default organization if not specified
 */
export async function getOrganizationSettings(req) {
  // If organization already loaded by middleware
  if (req.organization) {
    // Get with decrypted credentials
    const org = await organizationService.getOrganizationWithCredentials(req.organization._id);
    logger.info(`[GET-ORG-SETTINGS] Using middleware org: ${org?.name} (${org?.azureDevOps?.organization}/${org?.azureDevOps?.project})`);
    return org;
  }

  // If organizationId specified but not loaded
  if (req.organizationId) {
    const org = await organizationService.getOrganizationWithCredentials(req.organizationId, req.user._id);
    logger.info(`[GET-ORG-SETTINGS] Using orgId: ${org?.name} (${org?.azureDevOps?.organization}/${org?.azureDevOps?.project})`);
    return org;
  }

  // Fall back to default organization
  const defaultOrg = await organizationService.getDefaultOrganization(req.user._id);
  if (!defaultOrg) {
    logger.info(`[GET-ORG-SETTINGS] No org found for user`);
    return null;
  }

  const org = await organizationService.getOrganizationWithCredentials(defaultOrg._id, req.user._id);
  logger.info(`[GET-ORG-SETTINGS] Using DEFAULT org: ${org?.name} (${org?.azureDevOps?.organization}/${org?.azureDevOps?.project})`);
  return org;
}

/**
 * Check if organization has required Azure DevOps configuration
 */
export function hasAzureDevOpsConfig(org) {
  return org?.azureDevOps?.organization && 
         org?.azureDevOps?.project && 
         org?.azureDevOps?.pat;
}

/**
 * Check if organization has AI configuration
 */
export function hasAIConfig(org) {
  if (!org?.ai?.provider) return false;
  const provider = org.ai.provider;
  return !!org.ai.apiKeys?.[provider];
}

/**
 * Get Azure DevOps config from organization (for client creation)
 */
export function getAzureDevOpsConfig(org) {
  if (!hasAzureDevOpsConfig(org)) return null;
  return {
    organization: org.azureDevOps.organization,
    project: org.azureDevOps.project,
    pat: org.azureDevOps.pat,
    baseUrl: org.azureDevOps.baseUrl || 'https://dev.azure.com'
  };
}

/**
 * Get AI config from organization
 */
export function getAIConfig(org) {
  if (!org?.ai) return null;
  return {
    provider: org.ai.provider,
    model: org.ai.model,
    apiKeys: org.ai.apiKeys
  };
}

/**
 * Get notification config from organization
 */
export function getNotificationConfig(org) {
  return org?.notifications || { enabled: false };
}

/**
 * Get polling config from organization
 */
export function getPollingConfig(org) {
  return org?.polling || {};
}
