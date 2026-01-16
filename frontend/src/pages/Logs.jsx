import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, RefreshCw, AlertTriangle, Info, XCircle, AlertCircle, CheckCircle } from 'lucide-react'
import { apiService } from '../api/apiService'
import { useHealth } from '../contexts/HealthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { Checkbox } from '../components/ui/checkbox'
import { format, formatDistanceToNow } from 'date-fns'

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
      setError(err.userMessage || 'Failed to load logs. Please try again.')
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
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200'
      case 'warn':
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200'
      case 'info':
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200'
      case 'debug':
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground'
      default:
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground'
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Logs</h1>
              {/* Quick health indicator */}
              {!loading && logs.length > 0 && (
                logs.filter(log => log.level === 'error').length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    {logs.filter(log => log.level === 'error').length} error{logs.filter(log => log.level === 'error').length !== 1 ? 's' : ''}
                  </span>
                ) : logs.filter(log => log.level === 'warn').length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {logs.filter(log => log.level === 'warn').length} warning{logs.filter(log => log.level === 'warn').length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Clean
                  </span>
                )
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {!loading && logs.length > 0 
                ? `${logs.length} log entries • Last ${logs.length > 0 ? formatDistanceToNow(new Date(logs[0]?.timestamp || Date.now())) : ''}`
                : 'Real-time application logs and webhook activity'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <label 
                htmlFor="auto-refresh"
                className="text-sm text-foreground cursor-pointer"
              >
                Auto-refresh
              </label>
            </div>
            <button
              onClick={handleSync}
              disabled={loading}
              className="group flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 disabled:opacity-60 transition-all duration-200"
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
        <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
              <div className="h-8 bg-muted animate-pulse rounded w-12"></div>
              <div className="h-2 bg-muted animate-pulse rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold text-foreground">{logs.length}</div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Total
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Total Logs</div>
              </div>
            </>
          )}
        </div>

        {/* Errors - ALARMING when > 0 */}
        {(() => {
          const errorCount = logs.filter(log => log.level === 'error').length;
          return (
          <div className={`card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border shadow-sm ${
            errorCount > 0 
              ? 'border-red-300 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900' 
              : 'border-border dark:border-[#1a1a1a]'
          }`}>
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                <div className="h-8 bg-muted animate-pulse rounded w-12"></div>
                <div className="h-2 bg-muted animate-pulse rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <XCircle className={`h-5 w-5 ${errorCount > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                      <div className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {errorCount}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      errorCount > 0 
                        ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50' 
                        : 'text-muted-foreground bg-muted'
                    }`}>
                      {errorCount > 0 ? 'Critical' : 'Clear'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                {errorCount > 0 && (
                  <button 
                    onClick={() => setLevelFilter('error')}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                  >
                    → Show errors only
                  </button>
                )}
              </>
            )}
          </div>
          );
        })()}

        {/* Warnings */}
        {(() => {
          const warnCount = logs.filter(log => log.level === 'warn').length;
          return (
          <div className={`card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border shadow-sm ${
            warnCount > 0 
              ? 'border-amber-200 dark:border-amber-900' 
              : 'border-border dark:border-[#1a1a1a]'
          }`}>
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                <div className="h-8 bg-muted animate-pulse rounded w-12"></div>
                <div className="h-2 bg-muted animate-pulse rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${warnCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <div className={`text-2xl font-bold ${warnCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        {warnCount}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      warnCount > 0 
                        ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50' 
                        : 'text-muted-foreground bg-muted'
                    }`}>
                      {warnCount > 0 ? 'Warning' : 'Clear'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                {warnCount > 0 && (
                  <button 
                    onClick={() => setLevelFilter('warn')}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    → Show warnings only
                  </button>
                )}
              </>
            )}
          </div>
          );
        })()}

        {/* Info */}
        <div className="card-hover bg-card dark:bg-[#111111] p-5 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
              <div className="h-8 bg-muted animate-pulse rounded w-12"></div>
              <div className="h-2 bg-muted animate-pulse rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {logs.filter(log => log.level === 'info').length}
                  </div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
                    Info
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Info Logs</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
        <div className="flex flex-col gap-4">
          {/* Search and main controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search logs by message or service..."
                  className="w-full pl-10 pr-4 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground"
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
                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
          
          {/* Quick filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Quick filter:</span>
            <button
              onClick={() => setLevelFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                levelFilter === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setLevelFilter('error')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                levelFilter === 'error' 
                  ? 'bg-red-500 text-white' 
                  : logs.filter(l => l.level === 'error').length > 0
                    ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <XCircle className="h-3 w-3" />
              Errors ({logs.filter(l => l.level === 'error').length})
            </button>
            <button
              onClick={() => setLevelFilter('warn')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                levelFilter === 'warn' 
                  ? 'bg-amber-500 text-white' 
                  : logs.filter(l => l.level === 'warn').length > 0
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              Warnings ({logs.filter(l => l.level === 'warn').length})
            </button>
            <button
              onClick={() => setLevelFilter('info')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                levelFilter === 'info' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Info className="h-3 w-3" />
              Info ({logs.filter(l => l.level === 'info').length})
            </button>
            
            {/* Active filter indicator */}
            {(levelFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => { setLevelFilter('all'); setSearchTerm(''); }}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card dark:bg-[#111111] rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border dark:divide-[#1a1a1a]">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="bg-card dark:bg-[#111111] divide-y divide-border dark:divide-[#1a1a1a]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => {
                  const isError = log.level === 'error';
                  const isWarn = log.level === 'warn';
                  
                  // Get human-readable time
                  const getTimeAgo = () => {
                    try {
                      return formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });
                    } catch {
                      return format(new Date(log.timestamp), 'MMM dd, HH:mm:ss');
                    }
                  };
                  
                  return (
                  <tr 
                    key={index} 
                    className={`hover:bg-muted/50 transition-colors ${
                      isError 
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-l-2 border-l-red-500' 
                        : isWarn 
                          ? 'bg-amber-50/30 dark:bg-amber-950/10 border-l-2 border-l-amber-500' 
                          : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <span className={`font-medium ${isError ? 'text-red-700 dark:text-red-300' : isWarn ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                          {getTimeAgo()}
                        </span>
                        <span className="text-xs text-muted-foreground" title={new Date(log.timestamp).toLocaleString()}>
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`${getLevelBadgeClass(log.level)} ${isError ? 'ring-1 ring-red-300 dark:ring-red-700' : ''}`}>
                        {isError && <XCircle className="h-3 w-3 mr-1" />}
                        {isWarn && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {log.level === 'info' && <Info className="h-3 w-3 mr-1" />}
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.service || 'system'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div 
                        className={`max-w-lg truncate ${isError ? 'text-red-800 dark:text-red-200 font-medium' : isWarn ? 'text-amber-800 dark:text-amber-200' : 'text-foreground'}`} 
                        title={log.message}
                      >
                        {log.message}
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      {levelFilter === 'error' ? (
                        <>
                          <CheckCircle className="h-12 w-12 text-emerald-500/30 mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-1">No errors found</h3>
                          <p className="text-muted-foreground text-sm">All systems running smoothly</p>
                        </>
                      ) : searchTerm || levelFilter !== 'all' ? (
                        <>
                          <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-1">No matching logs</h3>
                          <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                          <button 
                            onClick={() => { setSearchTerm(''); setLevelFilter('all'); }}
                            className="mt-4 text-sm text-primary hover:underline"
                          >
                            Clear filters
                          </button>
                        </>
                      ) : (
                        <>
                          <Info className="h-12 w-12 text-muted-foreground/30 mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-1">No logs available</h3>
                          <p className="text-muted-foreground text-sm">Logs will appear here as events occur</p>
                        </>
                      )}
                    </div>
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
