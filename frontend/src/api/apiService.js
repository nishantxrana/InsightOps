import axios from 'axios'

// Create axios instance with default configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for adding auth token and organization context
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add organization context header
    const currentOrgId = localStorage.getItem('currentOrganizationId')
    if (currentOrgId) {
      config.headers['X-Organization-ID'] = currentOrgId
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors with user-friendly messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const errorData = error.response?.data
    
    // Create user-friendly error messages
    let userMessage = 'Something went wrong. Please try again.'
    
    if (error.code === 'ECONNABORTED' || status === 504) {
      userMessage = 'Request timed out. Please check your connection and try again.'
    } else if (status === 400) {
      // Bad request - usually missing org or invalid input
      if (errorData?.code === 'MISSING_ORGANIZATION_ID') {
        userMessage = 'Please select an organization to continue.'
      } else {
        userMessage = errorData?.error || 'Invalid request. Please check your input.'
      }
    } else if (status === 401) {
      // Unauthorized - session expired
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('currentOrganizationId')
      window.location.href = '/signin'
      userMessage = 'Your session has expired. Please sign in again.'
    } else if (status === 403) {
      userMessage = 'You don\'t have permission to perform this action.'
    } else if (status === 410) {
      // Gone - organization deactivated
      userMessage = errorData?.error || 'This resource is no longer available.'
    } else if (status === 429) {
      userMessage = 'Too many requests. Please wait a moment and try again.'
    } else if (status >= 500) {
      userMessage = 'Server error. Our team has been notified. Please try again later.'
    }
    
    // Attach user-friendly message to error
    error.userMessage = userMessage
    
    return Promise.reject(error)
  }
)

// API service methods
export const apiService = {
  // Health check
  async getHealth() {
    const response = await api.get('/health')
    return response.data
  },

  // Aggregated Dashboard Summary (performance optimized)
  // Fetches all dashboard data in a single request
  async getDashboardSummary() {
    const response = await api.get('/dashboard/summary')
    return response.data
  },

  // Webhook health
  async getWebhookHealth() {
    const response = await api.get('/webhooks/health')
    return response.data
  },

  // Test webhook
  async testWebhook(payload) {
    const response = await api.post('/webhooks/test', payload)
    return response.data
  },

  // Work Items
  async getWorkItems() {
    const response = await api.get('/work-items')
    return response.data
  },

  async getCurrentSprintSummary() {
    const response = await api.get('/work-items/sprint-summary')
    return response.data
  },

  async getOverdueItems() {
    const response = await api.get('/work-items/overdue')
    return response.data
  },

  // AI Summary (separate endpoint for async loading)
  async getAISummary() {
    const response = await api.get('/work-items/ai-summary')
    return response.data
  },

  // Work item AI explanation
  async explainWorkItem(workItemId) {
    const response = await api.get(`/work-items/${workItemId}/explain`)
    return response.data
  },

  // Builds/Pipelines
  async getRecentBuilds(limit = 20, repository = 'all') {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (repository && repository !== 'all') {
      params.append('repository', repository);
    }
    const response = await api.get(`/builds/recent?${params.toString()}`)
    return response.data
  },

  async getBuildDetails(buildId) {
    const response = await api.get(`/builds/${buildId}`)
    return response.data
  },

  // Pull Requests
  async getPullRequests() {
    const response = await api.get('/pull-requests')
    return response.data
  },

  async getIdlePullRequests() {
    const response = await api.get('/pull-requests/idle')
    return response.data
  },

  // Releases
  async getReleaseStats() {
    const response = await api.get('/releases/stats')
    return response.data
  },

  // Pull request AI explanation
  async explainPullRequest(pullRequestId) {
    const response = await api.get(`/pull-requests/${pullRequestId}/explain`)
    return response.data
  },

  // Build analysis
  async analyzeBuild(buildId) {
    const response = await api.post(`/builds/${buildId}/analyze`)
    return response.data
  },

  // Pull request changes/diffs
  async getPullRequestChanges(pullRequestId) {
    const response = await api.get(`/pull-requests/${pullRequestId}/changes`)
    return response.data
  },

  // Logs
  async getLogs(params = {}) {
    const response = await api.get('/logs', { params })
    return response.data
  },

  // Settings
  async getSettings() {
    const response = await api.get('/settings')
    return response.data
  },

  async updateSettings(settings) {
    const response = await api.put('/settings', settings)
    return response.data
  },

  async testConnection(azureDevOpsConfig) {
    const response = await api.post('/settings/test-connection', azureDevOpsConfig)
    return response.data
  }
}

export default api
