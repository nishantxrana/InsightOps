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
  Rocket
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
    releases: true,
    logs: true
  })
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    workItems: { total: 0, active: 0, completed: 0, overdue: 0 },
    builds: { total: 0, succeeded: 0, failed: 0 },
    pullRequests: { total: 0, active: 0, idle: 0 },
    releases: { total: 0, successRate: 0 }
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [liveUptime, setLiveUptime] = useState(0)
  const { isConnected, isChecking, healthData, checkConnection } = useHealth()

  // Live uptime counter that updates every second
  useEffect(() => {
    if (isConnected && healthData?.serverStartTime) {
      // Calculate current uptime based on server start time
      const currentUptime = Math.floor((Date.now() - healthData.serverStartTime) / 1000)
      setLiveUptime(currentUptime)
      
      const interval = setInterval(() => {
        const newUptime = Math.floor((Date.now() - healthData.serverStartTime) / 1000)
        setLiveUptime(newUptime)
      }, 1000)
      
      return () => clearInterval(interval)
    } else if (isConnected && healthData?.uptime) {
      // Fallback to process uptime if serverStartTime not available
      setLiveUptime(Math.floor(healthData.uptime))
      
      const interval = setInterval(() => {
        setLiveUptime(prev => prev + 1)
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [isConnected, healthData?.serverStartTime, healthData?.uptime])

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
        releases: true,
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

      const [builds, pullRequests, idlePRs, releases, logs] = await Promise.allSettled([
        apiService.getRecentBuilds(),
        apiService.getPullRequests(),
        apiService.getIdlePullRequests(),
        apiService.getReleaseStats(),
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

      if (releases.status === 'fulfilled') {
        const releaseData = releases.value.data || releases.value
        setStats(prev => ({
          ...prev,
          releases: {
            total: releaseData.totalReleases || 0,
            successRate: releaseData.successRate || 0
          }
        }))
      } else {
        setStats(prev => ({
          ...prev,
          releases: { total: 0, successRate: 0 }
        }))
      }
      setLoadingStates(prev => ({ ...prev, releases: false }))

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
        pullRequests: { total: 0, active: 0, idle: 0 },
        releases: { total: 0, successRate: 0 }
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
      <style>{`
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
          background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%);
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
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Overview</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Your development workflow at a glance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={Object.values(loadingStates).some(loading => loading)}
              className="group flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 disabled:opacity-60 transition-all duration-200"
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
        <Link to="/work-items" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.workItems ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Sprint
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">{stats.workItems.total}</div>
                  <div className="text-sm text-muted-foreground">Work Items</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">{stats.workItems.total > 0 ? Math.round((stats.workItems.completed / stats.workItems.total) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="progress-bar bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${stats.workItems.total > 0 ? (stats.workItems.completed / stats.workItems.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Builds */}
        <Link to="/pipelines" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.builds ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <GitBranch className={`w-5 h-5 ${stats.builds.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    stats.builds.failed > 0 ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50' : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                  }`}>
                    {stats.builds.failed > 0 ? 'Issues' : 'Healthy'}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">
                    {stats.builds.total > 0 ? `${Math.round((stats.builds.succeeded / stats.builds.total) * 100)}%` : '0%'}
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{stats.builds.succeeded} passed</span>
                    <span className="text-muted-foreground">{stats.builds.failed} failed</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className={`progress-bar h-1.5 rounded-full ${stats.builds.failed > 0 ? 'bg-red-500 dark:bg-red-400' : 'bg-emerald-500 dark:bg-emerald-400'}`}
                      style={{ width: `${stats.builds.total > 0 ? (stats.builds.succeeded / stats.builds.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Releases */}
        <Link to="/releases" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.releases ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Rocket className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-full">
                    Recent
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">{stats.releases?.total || 0}</div>
                  <div className="text-sm text-muted-foreground">Releases</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium text-foreground">{stats.releases?.successRate || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="progress-bar bg-orange-600 dark:bg-orange-500 h-1.5 rounded-full"
                      style={{ width: `${stats.releases?.successRate || 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Pull Requests */}
        <Link to="/pull-requests" className="block">
          <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm cursor-pointer">
            {loadingStates.pullRequests ? (
              <div className="space-y-3">
                <div className="shimmer h-4 rounded w-16"></div>
                <div className="shimmer h-8 rounded w-12"></div>
                <div className="shimmer h-2 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <GitPullRequest className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-foreground mb-0.5">{stats.pullRequests.total}</div>
                  <div className="text-sm text-muted-foreground">Pull Requests</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{stats.pullRequests.active} active</span>
                    <span className="text-muted-foreground">{stats.pullRequests.idle} idle</span>
                  </div>
                  <div className="h-1.5"></div>
                </div>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-5 gap-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
        {/* Alerts */}
        <div className="lg:col-span-3 bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Attention Required
              </h2>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                  <Link to="/work-items" className="group flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">{stats.workItems.overdue} overdue work items</div>
                      <div className="text-xs text-red-700 dark:text-red-300">Need immediate attention</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-400 dark:text-red-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                {stats.builds.failed > 0 && (
                  <Link to="/pipelines" className="group flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-red-900 dark:text-red-100 text-sm">{stats.builds.failed} build failures</div>
                      <div className="text-xs text-red-700 dark:text-red-300">Check pipeline logs</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-400 dark:text-red-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                {stats.pullRequests.idle > 0 && (
                  <Link to="/pull-requests?filter=idle" className="group flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                      <GitPullRequest className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-amber-900 dark:text-amber-100 text-sm">{stats.pullRequests.idle} overdue PRs</div>
                      <div className="text-xs text-amber-700 dark:text-amber-300">No activity for 48h+</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 dark:text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}
                {stats.workItems.overdue === 0 && stats.builds.failed === 0 && stats.pullRequests.idle === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-medium text-emerald-900 dark:text-emerald-100 text-sm">Everything looks good</div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-300">No issues detected</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />
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
                    <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed group-hover:text-muted-foreground transition-colors">
                        {activity.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
