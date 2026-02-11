import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const OrganizationContext = createContext();

export function OrganizationProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    const currentToken = localStorage.getItem("token");
    if (!isAuthenticated || !currentToken) {
      setLoading(false);
      setOrganizations([]);
      setCurrentOrganization(null);
      return;
    }

    try {
      setLoading(true);
      // Use global axios (has interceptor from AuthContext)
      const response = await axios.get("/api/organizations");
      const orgs = response.data.organizations || [];
      setOrganizations(orgs);

      // Set current org from localStorage or default
      const savedOrgId = localStorage.getItem("currentOrganizationId");
      const savedOrg = orgs.find((o) => o._id === savedOrgId);
      const defaultOrg = orgs.find((o) => o.isDefault) || orgs[0];

      const newCurrent = savedOrg || defaultOrg || null;
      setCurrentOrganization(newCurrent);

      // Set current project from localStorage or org default
      const savedProject = localStorage.getItem("currentProject");
      setCurrentProject(savedProject || newCurrent?.azureDevOps?.project || null);

      // Update localStorage if we selected a different org
      if (newCurrent && newCurrent._id !== savedOrgId) {
        localStorage.setItem("currentOrganizationId", newCurrent._id);
      }

      setError(null);
    } catch (err) {
      // If 401, user is not authenticated - let AuthContext handle logout
      if (err.response?.status === 401) {
        console.warn("OrganizationContext: 401 detected, skipping error handling");
        setOrganizations([]);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }

      const message = err.userMessage || "Failed to load organizations. Please try again.";
      setError(message);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Removed 'api' dependency

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Also refetch when token changes (e.g., after login)
  useEffect(() => {
    if (token && isAuthenticated) {
      fetchOrganizations();
    }
  }, [token]);

  // Switch organization
  const switchOrganization = useCallback(
    (orgId) => {
      const org = organizations.find((o) => o._id === orgId);
      if (org) {
        setCurrentOrganization(org);
        localStorage.setItem("currentOrganizationId", orgId);
        // Reset project to org default
        setCurrentProject(org.azureDevOps?.project || null);
        localStorage.setItem("currentProject", org.azureDevOps?.project || "");
        // Force page reload to refetch all data with new org context
        window.location.reload();
      }
    },
    [organizations]
  );

  // Switch project
  const switchProject = useCallback((projectName) => {
    // Only update local state and storage (don't save to DB)
    setCurrentProject(projectName);
    localStorage.setItem("currentProject", projectName);
    // Force page reload to refetch all data with new project context
    window.location.reload();
  }, []);

  // Add organization
  const addOrganization = useCallback(
    async (orgData) => {
      try {
        const response = await axios.post("/api/organizations", orgData);
        const newOrg = response.data.organization;
        setOrganizations((prev) => [...prev, newOrg]);

        // If first org, set as current
        if (organizations.length === 0) {
          setCurrentOrganization(newOrg);
          localStorage.setItem("currentOrganizationId", newOrg._id);
        }

        return { success: true, organization: newOrg };
      } catch (err) {
        return {
          success: false,
          error:
            err.userMessage ||
            err.response?.data?.error ||
            "Failed to add organization. Please try again.",
        };
      }
    },
    [organizations.length]
  );

  // Update organization
  const updateOrganization = useCallback(
    async (orgId, updates) => {
      try {
        const response = await axios.put(`/api/organizations/${orgId}`, updates);
        const updatedOrg = response.data.organization;

        setOrganizations((prev) => prev.map((o) => (o._id === orgId ? updatedOrg : o)));

        if (currentOrganization?._id === orgId) {
          setCurrentOrganization(updatedOrg);
        }

        return { success: true, organization: updatedOrg };
      } catch (err) {
        return {
          success: false,
          error:
            err.userMessage ||
            err.response?.data?.error ||
            "Failed to update organization. Please try again.",
        };
      }
    },
    [currentOrganization]
  );

  // Delete organization
  const deleteOrganization = useCallback(
    async (orgId) => {
      try {
        await axios.delete(`/api/organizations/${orgId}`);

        setOrganizations((prev) => prev.filter((o) => o._id !== orgId));

        // If deleted current org, switch to another
        if (currentOrganization?._id === orgId) {
          const remaining = organizations.filter((o) => o._id !== orgId);
          const newCurrent = remaining.find((o) => o.isDefault) || remaining[0] || null;
          setCurrentOrganization(newCurrent);
          if (newCurrent) {
            localStorage.setItem("currentOrganizationId", newCurrent._id);
          } else {
            localStorage.removeItem("currentOrganizationId");
          }
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err.userMessage ||
            err.response?.data?.error ||
            "Failed to delete organization. Please try again.",
        };
      }
    },
    [currentOrganization, organizations]
  );

  // Test connection
  const testConnection = useCallback(async (orgId) => {
    try {
      const response = await axios.post(`/api/organizations/${orgId}/test-connection`);
      return response.data;
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || "Connection test failed",
      };
    }
  }, []);

  // Set default organization
  const setDefaultOrganization = useCallback(async (orgId) => {
    try {
      const response = await axios.post(`/api/organizations/${orgId}/set-default`);
      const updatedOrg = response.data.organization;

      setOrganizations((prev) =>
        prev.map((o) => ({
          ...o,
          isDefault: o._id === orgId,
        }))
      );

      return { success: true, organization: updatedOrg };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || "Failed to set default",
      };
    }
  }, []);

  // Check if user has any organizations
  const hasOrganizations = organizations.length > 0;
  const needsSetup = isAuthenticated && !loading && !hasOrganizations;

  const value = {
    organizations,
    currentOrganization,
    currentProject,
    loading,
    error,
    hasOrganizations,
    needsSetup,
    switchOrganization,
    switchProject,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    testConnection,
    setDefaultOrganization,
    refreshOrganizations: fetchOrganizations,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}

export default OrganizationContext;
