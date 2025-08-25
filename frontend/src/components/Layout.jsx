import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  CheckSquare, 
  GitBranch, 
  GitPullRequest, 
  FileText, 
  Settings,
  Menu,
  X,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import { useHealth } from '../contexts/HealthContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Work Items', href: '/work-items', icon: CheckSquare },
  { name: 'Pipelines', href: '/pipelines', icon: GitBranch },
  { name: 'Pull Requests', href: '/pull-requests', icon: GitPullRequest },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage, default to false if not found
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const { isConnected, isChecking, checkConnection } = useHealth()
  const location = useLocation()

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={clsx(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-azure-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">DevOps Agent</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-azure-100 text-azure-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon
                    className={clsx(
                      'mr-3 h-5 w-5',
                      isActive ? 'text-azure-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={clsx(
        'hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out z-30',
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      )}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 shadow-sm">
          <div className={clsx(
            'flex h-16 items-center transition-all duration-300',
            sidebarCollapsed ? 'justify-center px-2' : 'px-4'
          )}>
            <Activity className="h-8 w-8 text-azure-600 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="ml-2 text-lg font-semibold text-gray-900 whitespace-nowrap overflow-hidden">
                DevOps Agent
              </span>
            )}
          </div>

          <nav className={clsx(
            'flex-1 space-y-1 py-4 transition-all duration-300 border-t border-gray-200',
            sidebarCollapsed ? 'px-2' : 'px-2'
          )}>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <div key={item.name} className="relative group">
                  <Link
                    to={item.href}
                    className={clsx(
                      'flex items-center text-sm font-medium rounded-md transition-all duration-200 relative',
                      sidebarCollapsed ? 'px-2 py-3 justify-center' : 'px-2 py-2',
                      isActive
                        ? 'bg-azure-100 text-azure-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'h-5 w-5 flex-shrink-0 transition-all duration-200',
                        sidebarCollapsed ? 'mr-0' : 'mr-3',
                        isActive ? 'text-azure-500' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {!sidebarCollapsed && (
                      <span className="whitespace-nowrap overflow-hidden">{item.name}</span>
                    )}
                  </Link>
                  
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 top-1/2 transform -translate-y-1/2">
                      {item.name}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Toggle control at bottom */}
          <div className="border-t border-gray-200">
            <div
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={clsx(
                'flex items-center cursor-pointer transition-all duration-200 hover:bg-gray-50 py-3',
                sidebarCollapsed ? 'justify-center px-2' : 'justify-end px-4'
              )}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="text-gray-400 hover:text-gray-600 transition-colors duration-200 text-sm font-mono select-none">
                {sidebarCollapsed ? '>>>' : '<<<'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={clsx(
        'transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center space-x-2">
                <div className={clsx(
                  'status-dot',
                  isChecking ? 'status-dot-warning' : isConnected ? 'status-dot-success' : 'status-dot-error'
                )}></div>
                <span className="text-sm text-gray-600">
                  {isChecking ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <button
                  onClick={checkConnection}
                  disabled={isChecking}
                  className={clsx(
                    'p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors',
                    isChecking && 'animate-spin'
                  )}
                  title="Refresh connection status"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
