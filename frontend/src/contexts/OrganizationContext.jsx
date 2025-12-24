import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext();

export function OrganizationProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create axios instance that always uses current token
  const api = useMemo(() => {
    const instance = axios.create({ baseURL: '/api' });
    instance.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    });
    return instance;
  }, []);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    const currentToken = localStorage.getItem('token');
    if (!isAuthenticated || !currentToken) {
      setLoading(false);
      setOrganizations([]);
      setCurrentOrganization(null);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/organizations');
      const orgs = response.data.organizations || [];
      setOrganizations(orgs);

      // Set current org from localStorage or default
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const savedOrg = orgs.find(o => o._id === savedOrgId);
      const defaultOrg = orgs.find(o => o.isDefault) || orgs[0];
      
      const newCurrent = savedOrg || defaultOrg || null;
      setCurrentOrganization(newCurrent);
      
      // Update localStorage if we selected a different org
      if (newCurrent && newCurrent._id !== savedOrgId) {
        localStorage.setItem('currentOrganizationId', newCurrent._id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to load organizations');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, api]);

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
  const switchOrganization = useCallback((orgId) => {
    const org = organizations.find(o => o._id === orgId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', orgId);
      // Trigger a page refresh to reload data with new org context
      window.dispatchEvent(new CustomEvent('organizationChanged', { detail: org }));
    }
  }, [organizations]);

  // Add organization
  const addOrganization = useCallback(async (orgData) => {
    try {
      const response = await api.post('/organizations', orgData);
      const newOrg = response.data.organization;
      setOrganizations(prev => [...prev, newOrg]);
      
      // If first org, set as current
      if (organizations.length === 0) {
        setCurrentOrganization(newOrg);
        localStorage.setItem('currentOrganizationId', newOrg._id);
      }
      
      return { success: true, organization: newOrg };
    } catch (err) {
      console.error('Failed to add organization:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to add organization' 
      };
    }
  }, [organizations.length]);

  // Update organization
  const updateOrganization = useCallback(async (orgId, updates) => {
    try {
      const response = await api.put(`/organizations/${orgId}`, updates);
      const updatedOrg = response.data.organization;
      
      setOrganizations(prev => 
        prev.map(o => o._id === orgId ? updatedOrg : o)
      );
      
      if (currentOrganization?._id === orgId) {
        setCurrentOrganization(updatedOrg);
      }
      
      return { success: true, organization: updatedOrg };
    } catch (err) {
      console.error('Failed to update organization:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to update organization' 
      };
    }
  }, [currentOrganization]);

  // Delete organization
  const deleteOrganization = useCallback(async (orgId) => {
    try {
      await api.delete(`/organizations/${orgId}`);
      
      setOrganizations(prev => prev.filter(o => o._id !== orgId));
      
      // If deleted current org, switch to another
      if (currentOrganization?._id === orgId) {
        const remaining = organizations.filter(o => o._id !== orgId);
        const newCurrent = remaining.find(o => o.isDefault) || remaining[0] || null;
        setCurrentOrganization(newCurrent);
        if (newCurrent) {
          localStorage.setItem('currentOrganizationId', newCurrent._id);
        } else {
          localStorage.removeItem('currentOrganizationId');
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('Failed to delete organization:', err);
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to delete organization' 
      };
    }
  }, [currentOrganization, organizations]);

  // Test connection
  const testConnection = useCallback(async (orgId) => {
    try {
      const response = await api.post(`/organizations/${orgId}/test-connection`);
      return response.data;
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Connection test failed' 
      };
    }
  }, []);

  // Set default organization
  const setDefaultOrganization = useCallback(async (orgId) => {
    try {
      const response = await api.post(`/organizations/${orgId}/set-default`);
      const updatedOrg = response.data.organization;
      
      setOrganizations(prev => 
        prev.map(o => ({
          ...o,
          isDefault: o._id === orgId
        }))
      );
      
      return { success: true, organization: updatedOrg };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Failed to set default' 
      };
    }
  }, []);

  // Check if user has any organizations
  const hasOrganizations = organizations.length > 0;
  const needsSetup = isAuthenticated && !loading && !hasOrganizations;

  const value = {
    organizations,
    currentOrganization,
    loading,
    error,
    hasOrganizations,
    needsSetup,
    switchOrganization,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    testConnection,
    setDefaultOrganization,
    refreshOrganizations: fetchOrganizations
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export default OrganizationContext;
