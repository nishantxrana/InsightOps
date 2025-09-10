import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { apiService } from '../api/apiService'
import { useHealth } from '../contexts/HealthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { format } from 'date-fns'

export default function Logs() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { checkConnection } = useHealth()

  useEffect(() => {
    loadLogs()
  }, [])

  const handleSync = async () => {
    await Promise.all([
      checkConnection(),
      loadLogs()
    ])
  }

  useEffect(() => {
    let interval
    if (autoRefresh) {
      interval = setInterval(loadLogs, 5000) // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, levelFilter])

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getLogs({ limit: 100 })
      setLogs(data.logs || [])
    } catch (err) {
      setError('Failed to load logs')
      console.error('Logs error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = logs

    // Filter by level
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.service?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLogs(filtered)
  }

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'error':
        return 'badge badge-error'
      case 'warn':
        return 'badge badge-warning'
      case 'info':
        return 'badge badge-info'
      case 'debug':
        return 'badge bg-gray-100 text-gray-800'
      default:
        return 'badge bg-gray-100 text-gray-800'
    }
  }

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Service', 'Message'],
      ...filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.service || '',
        log.message
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `devops-agent-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading && logs.length === 0) {
    return <LoadingSpinner />
  }

  if (error && logs.length === 0) {
    return <ErrorMessage message={error} onRetry={loadLogs} />
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
      `}</style>
      
      {/* Header with Refresh Button - Always visible */}
      <div className="animate-slide-up">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Logs</h1>
            <p className="text-gray-600 text-sm mt-0.5">Real-time application logs and webhook activity</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={handleSync}
              disabled={loading}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-60 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                    Total
                  </span>
                </div>
                <div className="text-sm text-gray-600">Total Logs</div>
              </div>
            </>
          )}
        </div>

        {/* Errors */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold text-red-600">
                    {logs.filter(log => log.level === 'error').length}
                  </div>
                  <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    Critical
                  </span>
                </div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </>
          )}
        </div>

        {/* Warnings */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold text-yellow-600">
                    {logs.filter(log => log.level === 'warn').length}
                  </div>
                  <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                    Warning
                  </span>
                </div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className="card-hover bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <div className="shimmer h-4 rounded w-16"></div>
              <div className="shimmer h-8 rounded w-12"></div>
              <div className="shimmer h-2 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold text-blue-600">
                    {logs.filter(log => log.level === 'info').length}
                  </div>
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    Info
                  </span>
                </div>
                <div className="text-sm text-gray-600">Info Logs</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getLevelBadgeClass(log.level)}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.service || 'system'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md truncate" title={log.message}>
                        {log.message}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || levelFilter !== 'all' ? 'No logs match your filters' : 'No logs available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
