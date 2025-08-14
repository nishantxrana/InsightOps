import React, { useState, useEffect } from 'react'
import { 
  CheckSquare, 
  GitBranch, 
  GitPullRequest, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  Activity
} from 'lucide-react'
import { apiService } from '../api/apiService'
import { useHealth } from '../contexts/HealthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    workItems: { total: 0, active: 0, overdue: 0 },
    builds: { total: 0, succeeded: 0, failed: 0 },
    pullRequests: { total: 0, active: 0, idle: 0 }
  })
  const [recentActivity, setRecentActivity] = useState([])
  const { isConnected, isChecking, healthData, lastCheck } = useHealth()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load dashboard statistics
      const [workItems, builds, pullRequests, logs] = await Promise.allSettled([
        apiService.getCurrentSprintSummary(),
        apiService.getRecentBuilds(),
        apiService.getPullRequests(),
        apiService.getLogs({ limit: 10 })
      ])

      // Process work items data
      if (workItems.status === 'fulfilled') {
        const workItemsData = workItems.value
        setStats(prev => ({
          ...prev,
          workItems: {
            total: workItemsData.total || 0,
            active: workItemsData.active || 0,
            overdue: workItemsData.overdue || 0
          }
        }))
      }

      // Process builds data
      if (builds.status === 'fulfilled') {
        const buildsData = builds.value
        setStats(prev => ({
          ...prev,
          builds: {
            total: buildsData.count || 0,
            succeeded: buildsData.value?.filter(b => b.result === 'succeeded').length || 0,
            failed: buildsData.value?.filter(b => b.result === 'failed').length || 0
          }
        }))
      }

      // Process pull requests data
      if (pullRequests.status === 'fulfilled') {
        const prData = pullRequests.value
        setStats(prev => ({
          ...prev,
          pullRequests: {
            total: prData.count || 0,
            active: prData.value?.filter(pr => pr.status === 'active').length || 0,
            idle: prData.idle || 0
          }
        }))
      }

      // Process recent activity
      if (logs.status === 'fulfilled') {
        setRecentActivity(logs.value.logs || [])
      }

    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadDashboardData} />
  }

  const statCards = [
    {
      title: 'Work Items',
      value: stats.workItems.total,
      subtitle: `${stats.workItems.active} active, ${stats.workItems.overdue} overdue`,
      icon: CheckSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Recent Builds',
      value: stats.builds.total,
      subtitle: `${stats.builds.succeeded} succeeded, ${stats.builds.failed} failed`,
      icon: GitBranch,
      color: stats.builds.failed > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: stats.builds.failed > 0 ? 'bg-red-50' : 'bg-green-50'
    },
    {
      title: 'Pull Requests',
      value: stats.pullRequests.total,
      subtitle: `${stats.pullRequests.active} active, ${stats.pullRequests.idle} idle`,
      icon: GitPullRequest,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'System Status',
      value: isChecking ? 'Checking...' : isConnected ? 'Healthy' : 'Unhealthy',
      subtitle: isChecking ? 'Checking connection...' : 
                isConnected ? `Uptime: ${healthData?.uptime ? Math.floor(healthData.uptime / 3600) + 'h' : 'N/A'}` : 
                'Backend disconnected',
      icon: Activity,
      color: isChecking ? 'text-yellow-600' : isConnected ? 'text-green-600' : 'text-red-600',
      bgColor: isChecking ? 'bg-yellow-50' : isConnected ? 'bg-green-50' : 'bg-red-50'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Overview of your Azure DevOps monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          const isSystemStatus = stat.title === 'System Status'
          const tooltipText = isSystemStatus && lastCheck 
            ? `Last checked: ${lastCheck.toLocaleTimeString()}`
            : undefined
            
          return (
            <div 
              key={index} 
              className="card hover:shadow-lg transition-shadow duration-200"
              title={tooltipText}
            >
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor} transition-all duration-200 hover:scale-105`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">{stat.subtitle}</p>
              
              {/* Add progress indicator for Work Items */}
              {stat.title === 'Work Items' && stats.workItems.total > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Completion</span>
                    <span>{Math.round(((stats.workItems.total - stats.workItems.active) / stats.workItems.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.round(((stats.workItems.total - stats.workItems.active) / stats.workItems.total) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Add success rate for Builds */}
              {stat.title === 'Recent Builds' && stats.builds.total > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Success Rate</span>
                    <span>{Math.round((stats.builds.succeeded / stats.builds.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.round((stats.builds.succeeded / stats.builds.total) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {stats.workItems.overdue > 0 && (
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <Clock className="h-5 w-5 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {stats.workItems.overdue} overdue work items
                  </p>
                  <p className="text-xs text-red-600">Require immediate attention</p>
                </div>
              </div>
            )}
            {stats.builds.failed > 0 && (
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <GitBranch className="h-5 w-5 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {stats.builds.failed} failed builds
                  </p>
                  <p className="text-xs text-red-600">Check build logs for details</p>
                </div>
              </div>
            )}
            {stats.pullRequests.idle > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <GitPullRequest className="h-5 w-5 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {stats.pullRequests.idle} idle pull requests
                  </p>
                  <p className="text-xs text-yellow-600">No activity for 48+ hours</p>
                </div>
              </div>
            )}
            {stats.workItems.overdue === 0 && stats.builds.failed === 0 && stats.pullRequests.idle === 0 && (
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">All systems healthy</p>
                  <p className="text-xs text-green-600">No active alerts</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-azure-500 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadDashboardData}
          className="btn btn-secondary"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  )
}
