import { Organization } from '../models/Organization.js';
import { organizationService } from '../services/organizationService.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to inject organization context into requests
 * Looks for organizationId in: header, query, or uses default
 */
export const injectOrganizationContext = async (req, res, next) => {
  try {
    // Skip if no authenticated user
    if (!req.user?._id) {
      return next();
    }

    // Get organizationId from header (case-insensitive), query, or body
    let organizationId = 
      req.headers['x-organization-id'] || 
      req.headers['X-Organization-ID'] ||
      req.get('X-Organization-ID') ||
      req.query.organizationId || 
      req.body?.organizationId;

    // If no org specified, use default
    if (!organizationId) {
      const defaultOrg = await organizationService.getDefaultOrganization(req.user._id);
      if (defaultOrg) {
        organizationId = defaultOrg._id;
      }
    }

    if (organizationId) {
      // Verify user owns this organization
      const org = await Organization.findOne({
        _id: organizationId,
        userId: req.user._id,
        isActive: true
      }).lean();

      if (org) {
        req.organizationId = org._id;
        req.organization = org;
      } else {
        logger.warn(`User ${req.user._id} attempted to access org ${organizationId} they don't own`);
      }
    }

    next();
  } catch (error) {
    logger.error('Error in organization context middleware:', error);
    next(); // Continue without org context rather than failing
  }
};

/**
 * Middleware to require organization context
 * Use this for routes that must have an organization
 */
export const requireOrganization = (req, res, next) => {
  if (!req.organizationId) {
    return res.status(400).json({ 
      error: 'Organization context required',
      message: 'Please select an organization or configure a default organization'
    });
  }
  next();
};

/**
 * Middleware to verify organization ownership
 * Use for routes with :organizationId param
 */
export const verifyOrganizationAccess = async (req, res, next) => {
  try {
    const organizationId = req.params.organizationId || req.params.id;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const org = await Organization.findOne({
      _id: organizationId,
      userId: req.user._id,
      isActive: true
    }).lean();

    if (!org) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    req.organizationId = org._id;
    req.organization = org;
    next();
  } catch (error) {
    logger.error('Error verifying organization access:', error);
    res.status(500).json({ error: 'Failed to verify organization access' });
  }
};
