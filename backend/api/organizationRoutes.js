import express from "express";
import { organizationService } from "../services/organizationService.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/organizations
 * List all organizations for the authenticated user
 */
router.get("/", async (req, res) => {
  try {
    const organizations = await organizationService.getUserOrganizations(req.user._id);
    res.json({ organizations });
  } catch (error) {
    logger.error("Error fetching organizations:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

/**
 * GET /api/organizations/current
 * Get the current/default organization
 */
router.get("/current", async (req, res) => {
  try {
    const organization = await organizationService.getDefaultOrganization(req.user._id);
    if (!organization) {
      return res.status(404).json({ error: "No organization configured" });
    }
    res.json({ organization });
  } catch (error) {
    logger.error("Error fetching current organization:", error);
    res.status(500).json({ error: "Failed to fetch current organization" });
  }
});

/**
 * GET /api/organizations/:id
 * Get a specific organization
 */
router.get("/:id", async (req, res) => {
  try {
    const organization = await organizationService.getOrganization(req.params.id, req.user._id);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json({ organization });
  } catch (error) {
    logger.error("Error fetching organization:", error);
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

/**
 * POST /api/organizations
 * Create a new organization
 */
router.post("/", async (req, res) => {
  try {
    const { name, azureDevOps, ai, notifications, polling } = req.body;

    // Validate required fields
    if (!azureDevOps?.organization || !azureDevOps?.project || !azureDevOps?.pat) {
      return res.status(400).json({
        error: "Azure DevOps organization, project, and PAT are required",
      });
    }

    const organization = await organizationService.createOrganization(req.user._id, {
      name,
      azureDevOps,
      ai,
      notifications,
      polling,
    });

    res.status(201).json({ organization });
  } catch (error) {
    logger.error("Error creating organization:", error);
    if (error.message.includes("already exists")) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create organization" });
  }
});

/**
 * PUT /api/organizations/:id
 * Update an organization
 */
router.put("/:id", async (req, res) => {
  try {
    const organization = await organizationService.updateOrganization(
      req.params.id,
      req.user._id,
      req.body
    );
    res.json({ organization });
  } catch (error) {
    logger.error("Error updating organization:", error);
    if (error.message === "Organization not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update organization" });
  }
});

/**
 * DELETE /api/organizations/:id
 * Delete an organization
 */
router.delete("/:id", async (req, res) => {
  try {
    await organizationService.deleteOrganization(req.params.id, req.user._id);
    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting organization:", error);
    if (error.message === "Organization not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("Cannot delete")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to delete organization" });
  }
});

/**
 * POST /api/organizations/:id/set-default
 * Set an organization as the default
 */
router.post("/:id/set-default", async (req, res) => {
  try {
    const organization = await organizationService.setDefaultOrganization(
      req.params.id,
      req.user._id
    );
    res.json({ organization });
  } catch (error) {
    logger.error("Error setting default organization:", error);
    if (error.message === "Organization not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to set default organization" });
  }
});

/**
 * POST /api/organizations/:id/test-connection
 * Test Azure DevOps connection for an organization
 */
router.post("/:id/test-connection", async (req, res) => {
  try {
    const result = await organizationService.testConnection(req.params.id, req.user._id);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error testing connection:", error);
    if (error.message === "Organization not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to test connection" });
  }
});

/**
 * POST /api/organizations/:id/projects
 * Fetch Azure DevOps projects using saved credentials
 */
router.post("/:id/projects", async (req, res) => {
  try {
    const result = await organizationService.fetchProjects(req.params.id, req.user._id);
    res.json(result);
  } catch (error) {
    logger.error("Error fetching projects:", error);
    if (error.message === "Organization not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

export default router;
