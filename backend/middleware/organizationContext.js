import { Organization } from "../models/Organization.js";
import { organizationService } from "../services/organizationService.js";
import { createComponentLogger } from "../utils/logger.js";

const log = createComponentLogger("org-context");

// Routes that don't need organization context logging
const SKIP_ORG_LOGGING = ["/health", "/api/health", "/api/auth"];

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

    // Skip verbose logging for certain routes
    const skipLogging = SKIP_ORG_LOGGING.some((path) => req.url.startsWith(path));

    // Get organizationId from header (case-insensitive), query, or body
    let organizationId =
      req.headers["x-organization-id"] ||
      req.headers["X-Organization-ID"] ||
      req.get("X-Organization-ID") ||
      req.query.organizationId ||
      req.body?.organizationId;

    let orgSource = organizationId ? "header" : null;

    // If no org specified, use default
    if (!organizationId) {
      const defaultOrg = await organizationService.getDefaultOrganization(req.user._id);
      if (defaultOrg) {
        organizationId = defaultOrg._id;
        orgSource = "default";
      }
    }

    if (organizationId) {
      // Verify user owns this organization
      const org = await Organization.findOne({
        _id: organizationId,
        userId: req.user._id,
        isActive: true,
      }).lean();

      if (org) {
        req.organizationId = org._id;
        req.organization = org;

        // Only log debug for normal requests, warn for missing header
        if (!skipLogging) {
          if (orgSource === "default") {
            log.debug("Using default org", {
              userId: req.user._id.toString(),
              organizationId: org._id.toString(),
              orgName: org.name,
              url: req.url,
            });
          }
          // Don't log every successful org context set - too noisy
        }
      } else {
        log.warn("Organization not found or access denied", {
          userId: req.user._id.toString(),
          requestedOrgId: organizationId.toString(),
          url: req.url,
        });
      }
    } else if (!skipLogging) {
      // No org found at all - this might be an issue
      log.warn("No organization context available", {
        userId: req.user._id.toString(),
        url: req.url,
        hasHeader: !!req.headers["x-organization-id"],
      });
    }

    next();
  } catch (error) {
    log.error("Error in organization context middleware", {
      error: error.message,
      userId: req.user?._id?.toString(),
      url: req.url,
    });
    next();
  }
};

/**
 * Middleware to require organization context
 * Use this for routes that must have an organization
 */
export const requireOrganization = (req, res, next) => {
  if (!req.organizationId) {
    return res.status(400).json({
      error: "Organization context required",
      message: "Please select an organization or configure a default organization",
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
      return res.status(400).json({ error: "Organization ID required" });
    }

    const org = await Organization.findOne({
      _id: organizationId,
      userId: req.user._id,
      isActive: true,
    }).lean();

    if (!org) {
      log.warn("Organization access denied", {
        userId: req.user._id.toString(),
        requestedOrgId: organizationId,
        url: req.url,
      });
      return res.status(403).json({ error: "Access denied to this organization" });
    }

    req.organizationId = org._id;
    req.organization = org;
    next();
  } catch (error) {
    log.error("Error verifying organization access", {
      error: error.message,
      userId: req.user?._id?.toString(),
    });
    res.status(500).json({ error: "Failed to verify organization access" });
  }
};
