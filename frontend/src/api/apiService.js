import axios from 'axios'

// Create axios instance with default configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server took too long to respond')
      throw new Error('Request timeout - please try again')
    }
    if (error.response?.status === 504) {
      throw new Error('Server timeout - please try again')
    }
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('apiToken')
      window.location.href = '/settings'
    }
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
  async getRecentBuilds() {
    const response = await api.get('/builds/recent')
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
