import axios from "axios";

const API_BASE_URL = "/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token and organization context to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add organization context header
  const currentOrgId = localStorage.getItem("currentOrganizationId");
  if (currentOrgId) {
    config.headers["X-Organization-ID"] = currentOrgId;
  }

  // Add project context header
  const currentProject = localStorage.getItem("currentProject");
  if (currentProject) {
    config.headers["X-Project-Name"] = currentProject;
  }

  return config;
});

// Add error handling interceptor (same as apiService)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;

    let userMessage = "Something went wrong. Please try again.";

    if (error.code === "ECONNABORTED" || status === 504) {
      userMessage = "Request timed out. Please check your connection and try again.";
    } else if (status === 400) {
      userMessage = errorData?.error || "Invalid request. Please check your input.";
    } else if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("currentOrganizationId");
      window.location.href = "/signin";
      userMessage = "Your session has expired. Please sign in again.";
    } else if (status === 403) {
      userMessage = "You don't have permission to perform this action.";
    } else if (status === 429) {
      userMessage = "Too many requests. Please wait a moment and try again.";
    } else if (status >= 500) {
      userMessage = "Server error. Please try again later.";
    }

    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

export const releaseService = {
  // Get recent releases with optional filtering
  async getReleases(params = {}) {
    const response = await api.get("/releases", { params });
    return response.data;
  },

  // Get release statistics
  async getReleaseStats(params = {}) {
    const response = await api.get("/releases/stats", { params });
    return response.data;
  },

  // Get release definitions
  async getReleaseDefinitions() {
    const response = await api.get("/releases/definitions");
    return response.data;
  },

  // Get pending approvals
  async getPendingApprovals() {
    const response = await api.get("/releases/approvals");
    return response.data;
  },

  // Get detailed approval information for a release
  async getReleaseApprovals(releaseId) {
    const response = await api.get(`/releases/${releaseId}/approvals`);
    return response.data;
  },

  // Get failed task logs for a specific release
  async getReleaseTaskLogs(releaseId) {
    const response = await api.get(`/releases/${releaseId}/logs`);
    return response.data;
  },

  // Get AI-powered release analysis
  async getAIAnalysis() {
    const response = await api.get("/releases/ai-analysis");
    return response.data;
  },

  // Analyze failed release task logs with AI
  async analyzeRelease(releaseId) {
    const response = await api.get(`/releases/${releaseId}/analyze`);
    return response.data;
  },
};
