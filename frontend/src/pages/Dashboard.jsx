import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  CheckSquare, 
  GitBranch, 
  GitPullRequest, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  Activity,
  RefreshCw,
  ChevronRight,
  Zap
} from 'lucide-react'
import { apiService } from '../api/apiService'
import { useHealth } from '../contexts/HealthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function Dashboard() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState({
    workItems: true,
    builds: true,
    pullRequests: true,
    logs: true
  })
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
    builds: { total: 0, succeeded: 0, failed: 0 },
    pullRequests: { total: 0, active: 0, idle: 0 }
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [liveUptime, setLiveUptime] = useState(0)
  const { isConnected, isChecking, healthData, checkConnection } = useHealth()

  // Live uptime counter that updates every second
  useEffect(() => {
    if (isConnected && healthData?.uptime) {
      setLiveUptime(Math.floor(healthData.uptime)) // Convert to integer seconds
      
      const interval = setInterval(() => {
        setLiveUptime(prev => prev + 1)
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [isConnected, healthData?.uptime])

  // Format uptime to show hours, minutes, and seconds
  const formatUptime = (totalSeconds) => {
    const seconds = Math.floor(totalSeconds) // Ensure integer
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleSync = async () => {
    await Promise.all([
      checkConnection(),
      loadDashboardData()
    ])
  }

  const loadDashboardData = async () => {
    try {
      setInitialLoading(true)
      setError(null)
      setLoadingStates({
        workItems: true,
        builds: true,
        pullRequests: true,
        logs: true
      })

      try {
        const workItems = await apiService.getCurrentSprintSummary()
        setStats(prev => ({
          ...prev,
          workItems: {
            total: workItems.total || 0,
            active: workItems.active || 0,
            completed: workItems.completed || 0,
            overdue: workItems.overdue || 0
          }
        }))
        setLoadingStates(prev => ({ ...prev, workItems: false }))
        setInitialLoading(false)
      } catch (err) {
        console.error('Failed to load work items:', err)
        setStats(prev => ({
          ...prev,
          workItems: { total: 0, active: 0, completed: 0, overdue: 0 }
        }))
        setLoadingStates(prev => ({ ...prev, workItems: false }))
      }

      const [builds, pullRequests, idlePRs, logs] = await Promise.allSettled([
        apiService.getRecentBuilds(),
        apiService.getPullRequests(),
        apiService.getIdlePullRequests(),
        apiService.getLogs({ limit: 10 })
      ])

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
      } else {
        setStats(prev => ({
          ...prev,
          builds: { total: 0, succeeded: 0, failed: 0 }
        }))
      }
      setLoadingStates(prev => ({ ...prev, builds: false }))

      if (pullRequests.status === 'fulfilled') {
        const prData = pullRequests.value
        const idleCount = idlePRs.status === 'fulfilled' ? (idlePRs.value.value?.length || 0) : 0
        setStats(prev => ({
          ...prev,
          pullRequests: {
            total: prData.count || 0,
            active: prData.value?.filter(pr => pr.status === 'active').length || 0,
            idle: idleCount
          }
        }))
      } else {
        setStats(prev => ({
          ...prev,
          pullRequests: { total: 0, active: 0, idle: 0 }
        }))
      }
      setLoadingStates(prev => ({ ...prev, pullRequests: false }))

      if (logs.status === 'fulfilled') {
        setRecentActivity(logs.value.logs || [])
      } else {
        setRecentActivity([])
      }
      setLoadingStates(prev => ({ ...prev, logs: false }))

    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', err)
      setInitialLoading(false)
      // Reset stats to show empty state
      setStats({
        workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
        builds: { total: 0, succeeded: 0, failed: 0 },
        pullRequests: { total: 0, active: 0, idle: 0 }
      })
      setRecentActivity([])
      setLoadingStates({
        workItems: false,
        builds: false,
        pullRequests: false,
        logs: false
      })
    }
  }

  if (initialLoading && error) {
    return <LoadingSpinner />
  }

  if (error && initialLoading) {
    return <ErrorMessage message={error} onRetry={loadDashboardData} />
  }

  return (
    <div className="space-y-6">
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .progress-bar {
          transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .status-dot {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Overview</h1>
            <p className="text-gray-600 text-sm mt-0.5">Your development workflow at a glance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={Object.values(loadingStates).some(loading => loading)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${Object.values(loadingStates).some(loading => loading) ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
        {/* Work Items */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          {loadingStates.workItems ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                  Sprint
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{stats.workItems.total}</div>
                <div className="text-sm text-gray-600">Work Items</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">{stats.workItems.total > 0 ? Math.round((stats.workItems.completed / stats.workItems.total) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div 
                    className="progress-bar bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${stats.workItems.total > 0 ? (stats.workItems.completed / stats.workItems.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Builds */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          {loadingStates.builds ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <GitBranch className={`w-5 h-5 ${stats.builds.failed > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  stats.builds.failed > 0 ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                }`}>
                  {stats.builds.failed > 0 ? 'Issues' : 'Healthy'}
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900 mb-0.5">
                  {stats.builds.total > 0 ? `${Math.round((stats.builds.succeeded / stats.builds.total) * 100)}%` : '0%'}
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{stats.builds.succeeded} passed</span>
                  <span className="text-gray-500">{stats.builds.failed} failed</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div 
                    className={`progress-bar h-1.5 rounded-full ${stats.builds.failed > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${stats.builds.total > 0 ? (stats.builds.succeeded / stats.builds.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pull Requests */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          {loadingStates.pullRequests ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <GitPullRequest className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{stats.pullRequests.total}</div>
                <div className="text-sm text-gray-600">Pull Requests</div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{stats.pullRequests.active} active</span>
                <span>{stats.pullRequests.idle} idle</span>
              </div>
            </>
          )}
        </div>

        {/* System */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Zap className={`w-5 h-5 ${isConnected ? 'text-emerald-600' : 'text-red-600'}`} />
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isConnected ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
            }`}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900 mb-0.5">
              {isConnected ? formatUptime(liveUptime) : '—'}
            </div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
          <div className="text-xs text-gray-500">
            {isConnected ? 'All systems operational' : 'Connection lost'}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-5 gap-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
        {/* Alerts */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Attention Required
              </h2>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div className="p-5">
            {(loadingStates.workItems || loadingStates.builds || loadingStates.pullRequests) ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="shimmer w-8 h-8 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-3 rounded w-3/4"></div>
                      <div className="shimmer h-2 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats.workItems.overdue > 0 && (
                  <Link to="/work-items" className="group flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-red-900 text-sm">{stats.workItems.overdue} overdue items</div>
                      <div className="text-xs text-red-700">Need immediate attention</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                {stats.builds.failed > 0 && (
                  <Link to="/pipelines" className="group flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-red-900 text-sm">{stats.builds.failed} build failures</div>
                      <div className="text-xs text-red-700">Check pipeline logs</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                {stats.pullRequests.idle > 0 && (
                  <Link to="/pull-requests?filter=idle" className="group flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <GitPullRequest className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-amber-900 text-sm">{stats.pullRequests.idle} stale PRs</div>
                      <div className="text-xs text-amber-700">No activity for 48h+</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                {stats.workItems.overdue === 0 && stats.builds.failed === 0 && stats.pullRequests.idle === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-medium text-emerald-900 text-sm">Everything looks good</div>
                      <div className="text-xs text-emerald-700">No issues detected</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Recent Activity
            </h2>
          </div>
          <div className="p-5">
            {loadingStates.logs ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="shimmer w-1.5 h-1.5 rounded-full mt-2"></div>
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-3 rounded w-full"></div>
                      <div className="shimmer h-2 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.slice(0, 4).map((activity, index) => (
                  <div key={index} className="flex gap-3 group">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 leading-relaxed group-hover:text-gray-700 transition-colors">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
