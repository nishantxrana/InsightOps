import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Bell, Search, ExternalLink, Clock, ChevronDown, GitBranch, Package, User, Rocket, Hash, GitCommit, FileText, CheckCircle, AlertCircle, FolderTree, Download, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CopyButton } from '../components/ui/shadcn-io/copy-button';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { exportNotificationToCSV } from '@/utils/csvExport';

const NotificationHistory = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (userId && currentOrganization?._id) {
      fetchNotifications();
      fetchCounts();
    } else {
      setLoading(false);
    }
  }, [user, activeTab, currentOrganization]); // Refetch when tab or org changes

  const getHeaders = () => {
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    };
    if (currentOrganization?._id) {
      headers['X-Organization-ID'] = currentOrganization._id;
    }
    return headers;
  };

  const fetchNotifications = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(0);
        setNotifications([]);
      }
      setError(null);
      const currentPage = loadMore ? page + 1 : 0;
      
      const limit = 20;
      const params = new URLSearchParams({ limit, skip: currentPage * limit });
      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }
      
      const response = await fetch(`/api/notifications?${params}`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (loadMore) {
        setNotifications(prev => [...prev, ...data]);
        setPage(currentPage);
      } else {
        setNotifications(data);
      }
      
      setHasMore(data.length === limit);
    } catch (error) {
      const userMessage = error.userMessage || error.message || 'Failed to load notifications. Please try again.';
      setError(userMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const response = await fetch(`/api/notifications/counts`, {
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCounts(data);
    } catch {
      // Counts are non-critical, fail silently
      setCounts({});
    }
  };

  const filteredNotifications = notifications
    .filter(n =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
            </h1>
            {/* Quick health indicator */}
            {!loading && (
              (counts.overdue || 0) + (counts['idle-pr'] || 0) > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {(counts.overdue || 0) + (counts['idle-pr'] || 0)} need attention
                </span>
              ) : counts.build > 0 && notifications.some(n => n.type === 'build' && n.subType === 'failed') ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Has failures
                </span>
              ) : counts.total > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  All clear
                </span>
              ) : null
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {!loading && counts.total > 0 
              ? `${counts.total} notification${counts.total !== 1 ? 's' : ''} from the last 7 days`
              : 'Last 7 days of notifications'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Mobile: Dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select notification type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {counts.total ? `(${counts.total})` : ''}</SelectItem>
              <SelectItem value="build">Builds {counts.build ? `(${counts.build})` : ''}</SelectItem>
              <SelectItem value="release">Releases {counts.release ? `(${counts.release})` : ''}</SelectItem>
              <SelectItem value="work-item">Work Items {counts['work-item'] ? `(${counts['work-item']})` : ''}</SelectItem>
              <SelectItem value="pull-request">PRs {counts['pull-request'] ? `(${counts['pull-request']})` : ''}</SelectItem>
              <SelectItem value="overdue" className={counts.overdue > 0 ? 'text-red-600 font-medium' : ''}>
                ⚠️ Overdue Work Items {counts.overdue ? `(${counts.overdue})` : ''}
              </SelectItem>
              <SelectItem value="idle-pr" className={counts['idle-pr'] > 0 ? 'text-amber-600 font-medium' : ''}>
                ⏰ Stale PRs {counts['idle-pr'] ? `(${counts['idle-pr']})` : ''}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Desktop: Tabs */}
        <TabsList className="hidden sm:inline-flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All {counts.total ? <span className="ml-1 text-xs opacity-70">({counts.total})</span> : ''}
          </TabsTrigger>
          <TabsTrigger value="build" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Builds {counts.build ? <span className="ml-1 text-xs opacity-70">({counts.build})</span> : ''}
          </TabsTrigger>
          <TabsTrigger value="release" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Releases {counts.release ? <span className="ml-1 text-xs opacity-70">({counts.release})</span> : ''}
          </TabsTrigger>
          <TabsTrigger value="work-item" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Work Items {counts['work-item'] ? <span className="ml-1 text-xs opacity-70">({counts['work-item']})</span> : ''}
          </TabsTrigger>
          <TabsTrigger value="pull-request" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            PRs {counts['pull-request'] ? <span className="ml-1 text-xs opacity-70">({counts['pull-request']})</span> : ''}
          </TabsTrigger>
          {/* Critical categories with visual emphasis */}
          <TabsTrigger 
            value="overdue" 
            className={`data-[state=active]:bg-red-500 data-[state=active]:text-white ${
              counts.overdue > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''
            }`}
          >
            ⚠️ Overdue {counts.overdue ? <span className={`ml-1 text-xs ${counts.overdue > 0 ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-1.5 rounded-full' : 'opacity-70'}`}>({counts.overdue})</span> : ''}
          </TabsTrigger>
          <TabsTrigger 
            value="idle-pr" 
            className={`data-[state=active]:bg-amber-500 data-[state=active]:text-white ${
              counts['idle-pr'] > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''
            }`}
          >
            ⏰ Stale PRs {counts['idle-pr'] ? <span className={`ml-1 text-xs ${counts['idle-pr'] > 0 ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 rounded-full' : 'opacity-70'}`}>({counts['idle-pr']})</span> : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error: {error}
              <br />
              <button 
                onClick={fetchNotifications} 
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? 'No matching notifications' : 'All clear!'}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : activeTab === 'all' 
                    ? 'No notifications in the last 7 days. Check back later.'
                    : `No ${activeTab.replace('-', ' ')} notifications found.`
                }
              </p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-3">
              {filteredNotifications.map((notification) => {
                // Determine severity
                const isCritical = notification.type === 'overdue' || 
                                   notification.type === 'idle-pr' || 
                                   notification.subType === 'failed' ||
                                   notification.subType === 'rejected';
                const isWarning = notification.type === 'work-item' && notification.subType === 'updated';
                const isSuccess = notification.subType === 'succeeded' || notification.subType === 'completed';
                const isUnread = !notification.read;
                
                // Get type icon
                const getTypeIcon = () => {
                  if (notification.subType === 'failed' || notification.subType === 'rejected') {
                    return <XCircle className="h-4 w-4 text-red-500" />;
                  }
                  if (notification.type === 'overdue' || notification.type === 'idle-pr') {
                    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
                  }
                  if (isSuccess) {
                    return <CheckCircle className="h-4 w-4 text-green-500" />;
                  }
                  return <Bell className="h-4 w-4 text-muted-foreground" />;
                };
                
                // Get human-readable time
                const getTimeAgo = () => {
                  try {
                    return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
                  } catch {
                    return new Date(notification.createdAt).toLocaleString();
                  }
                };
                
                return (
                <AccordionItem 
                  key={notification._id} 
                  value={notification._id} 
                  className={`border rounded-lg overflow-hidden ${
                    isCritical 
                      ? 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/10' 
                      : isWarning 
                        ? 'border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10' 
                        : isUnread 
                          ? 'border-l-4 border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                          : ''
                  }`}
                >
                  <AccordionTrigger className="hover:no-underline px-3 sm:px-6 py-3 sm:py-4 [&[data-state=open]]:border-b grid grid-cols-[1fr_auto] gap-2 items-center">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:min-w-[280px] shrink-0">
                        {/* Type icon based on severity */}
                        {getTypeIcon()}
                        
                        {/* Type badge */}
                        <Badge 
                          variant="secondary" 
                          className={`text-xs rounded-full ${
                            notification.type === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                            notification.type === 'idle-pr' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' :
                            ''
                          }`}
                        >
                          {notification.type === 'work-item' ? 'work item' : 
                           notification.type === 'pull-request' ? 'PR' :
                           notification.type === 'idle-pr' ? 'stale PR' :
                           notification.type}
                        </Badge>
                        
                        {/* SubType badge with severity styling */}
                        {notification.subType && (
                          <Badge 
                            variant={notification.subType === 'failed' || notification.subType === 'rejected' ? 'destructive' : 'outline'} 
                            className={`capitalize text-xs rounded-full ${
                              notification.subType === 'succeeded' || notification.subType === 'completed' 
                                ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800' 
                                : notification.subType === 'failed' || notification.subType === 'rejected'
                                  ? 'ring-1 ring-red-300 dark:ring-red-800'
                                  : ''
                            }`}
                          >
                            {notification.subType === 'failed' ? '⚠️ failed' : notification.subType}
                          </Badge>
                        )}
                        
                        {/* Unread indicator */}
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Unread"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-sm sm:text-base mb-1 truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate" title={new Date(notification.createdAt).toLocaleString()}>
                            {getTimeAgo()}
                          </span>
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-3 sm:px-6 pb-4 pt-4">
                    <div className="space-y-4 overflow-hidden w-full">{/* Type-specific metadata */}
                      {notification.metadata && (notification.type === 'build' || notification.type === 'release') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 text-sm bg-muted/30 p-3 sm:p-4 rounded-md overflow-hidden">
                          {/* Build-specific */}
                          {notification.type === 'build' && (
                            <>
                              {notification.metadata.buildNumber && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Build Number</p>
                                    <p className="font-medium break-words">#{notification.metadata.buildNumber}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.repository && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Repository</p>
                                    <p className="font-medium break-words">{notification.metadata.repository}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.branch && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Branch</p>
                                    <p className="font-medium break-words">{notification.metadata.branch}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.commit && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <GitCommit className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Commit</p>
                                    <p className="font-mono break-all">{notification.metadata.commit}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.commitMessage && (
                                <div className="col-span-full">
                                  <p className="text-xs text-muted-foreground mb-1">Commit Message</p>
                                  <p className="text-sm italic text-muted-foreground line-clamp-2">{notification.metadata.commitMessage}</p>
                                </div>
                              )}
                              {notification.metadata.reason && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Rocket className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Trigger</p>
                                    <p className="font-medium text-xs capitalize break-words">{notification.metadata.reason.replace(/([A-Z])/g, ' $1').trim()}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.requestedBy && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Requested By</p>
                                    <p className="font-medium break-all">{notification.metadata.requestedBy}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.duration && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-medium break-words">{notification.metadata.duration}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Release-specific */}
                          {notification.type === 'release' && (
                            <>
                              {notification.metadata.releaseDefinitionName && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pipeline</p>
                                    <p className="font-medium break-all">{notification.metadata.releaseDefinitionName}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.releaseName && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Rocket className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Release</p>
                                    <p className="font-medium break-all">{notification.metadata.releaseName}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.environmentName && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Rocket className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Environment</p>
                                    <p className="font-medium break-all">{notification.metadata.environmentName}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.deployedBy && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Deployed By</p>
                                    <p className="font-medium break-all">{notification.metadata.deployedBy}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.duration && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-medium break-all">{notification.metadata.duration}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Failed Tasks for Release */}
                      {notification.type === 'release' && notification.metadata?.failedTasks && notification.metadata.failedTasks.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                            <span>Failed Tasks ({notification.metadata.failedTasks.length})</span>
                          </div>
                          <div className="space-y-2">
                            {notification.metadata.failedTasks.map((task, idx) => (
                              <div key={idx} className="border border-destructive/20 rounded-md p-3 bg-destructive/5">
                                <div className="flex items-start gap-2 mb-2">
                                  <Badge variant="destructive" className="text-xs">Failed</Badge>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{task.taskName}</p>
                                    <p className="text-xs text-muted-foreground">{task.environmentName}</p>
                                  </div>
                                </div>
                                {task.logContent && (
                                  <div className="mt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Error Logs:</p>
                                    <pre className="text-xs bg-background border rounded p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                                      {task.logContent}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Work Item-specific */}
                      {notification.type === 'work-item' && notification.metadata && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 text-sm bg-muted/30 p-3 sm:p-4 rounded-md overflow-hidden">
                          {notification.metadata.workItemId && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Work Item ID</p>
                                    <p className="font-medium break-all">#{notification.metadata.workItemId}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.workItemType && typeof notification.metadata.workItemType !== 'object' && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Type</p>
                                    <p className="font-medium break-all">{notification.metadata.workItemType}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.state && typeof notification.metadata.state !== 'object' && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">State</p>
                                    <p className="font-medium break-all">{notification.metadata.state}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.assignedTo && typeof notification.metadata.assignedTo !== 'object' && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Assigned To</p>
                                    <p className="font-medium break-all">{notification.metadata.assignedTo}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.priority && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Priority</p>
                                    <p className="font-medium break-all">{notification.metadata.priority === 1 ? 'Critical' : notification.metadata.priority === 2 ? 'High' : notification.metadata.priority === 3 ? 'Medium' : 'Low'}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.areaPath && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <FolderTree className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Area</p>
                                    <p className="font-medium truncate">{notification.metadata.areaPath.split('\\').pop()}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.iterationPath && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Iteration</p>
                                    <p className="font-medium truncate">{notification.metadata.iterationPath.split('\\').pop()}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.createdBy && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Created By</p>
                                    <p className="font-medium break-all">{notification.metadata.createdBy}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.tags && (
                                <div className="col-span-full">
                                  <p className="text-xs text-muted-foreground mb-1">Tags</p>
                                  <div className="flex flex-wrap gap-1">
                                    {notification.metadata.tags.split(';').filter(t => t.trim()).map((tag, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">{tag.trim()}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      
                      {/* Work Item Changes */}
                      {notification.type === 'work-item' && notification.subType === 'updated' && notification.metadata?.changes && notification.metadata.changes.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Changes Made:</div>
                          <div className="space-y-1">
                            {notification.metadata.changes.map((change, idx) => (
                              <div key={idx} className="text-xs bg-muted/50 p-2 rounded">
                                <p className="font-medium mb-1">{change.field}:</p>
                                <p className="text-muted-foreground line-through break-words" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
                                  From: {change.oldValue || 'None'}
                                </p>
                                <p className="text-primary font-medium break-words" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
                                  To: {change.newValue || 'None'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                          
                          {/* Pull Request-specific */}
                          {notification.type === 'pull-request' && notification.metadata && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 text-sm bg-muted/30 p-3 sm:p-4 rounded-md overflow-hidden">
                              {notification.metadata.pullRequestId && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">PR ID</p>
                                    <p className="font-medium break-all">#{notification.metadata.pullRequestId}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.repository && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Repository</p>
                                    <p className="font-medium break-all">{notification.metadata.repository}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.sourceBranch && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Source</p>
                                    <p className="font-medium break-all">{notification.metadata.sourceBranch}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.targetBranch && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Target</p>
                                    <p className="font-medium break-all">{notification.metadata.targetBranch}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.createdBy && (
                                <div className="flex items-start gap-2 min-w-0">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Created By</p>
                                    <p className="font-medium break-all">{notification.metadata.createdBy}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      
                      {/* Overdue - detailed list */}
                      {notification.type === 'overdue' && notification.metadata.items && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <span className="text-destructive">{notification.metadata.count} Overdue Items</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => exportNotificationToCSV(notification)}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Export CSV
                                </Button>
                              </div>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {notification.metadata.items.map((item, idx) => (
                                  <div key={idx} className="border rounded-md p-3 bg-background hover:bg-muted/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium text-sm truncate">#{item.id}</span>
                                        <Badge variant="outline" className="text-xs flex-shrink-0">{item.type}</Badge>
                                      </div>
                                      {item.daysPastDue > 0 && (
                                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                                          {item.daysPastDue}d overdue
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium mb-2 line-clamp-2">{item.title}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      {item.assignedTo && (
                                        <div className="flex items-center gap-1.5">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">{item.assignedTo}</span>
                                        </div>
                                      )}
                                      {item.priority && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-muted-foreground">Priority: {item.priority === 1 ? 'Critical' : item.priority === 2 ? 'High' : item.priority === 3 ? 'Medium' : 'Low'}</span>
                                        </div>
                                      )}
                                      {item.state && (
                                        <div className="flex items-center gap-1.5">
                                          <CheckCircle className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">{item.state}</span>
                                        </div>
                                      )}
                                      {item.dueDate && (
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                                        </div>
                                      )}
                                    </div>
                                    {item.url && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <a 
                                          href={item.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                          View Item <ExternalLink className="h-3 w-3" />
                                        </a>
                                        <CopyButton content={item.url} variant="ghost" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Idle PR - just show count */}
                          {notification.type === 'idle-pr' && notification.metadata.pullRequests && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <span className="text-orange-600">{notification.metadata.count} Idle Pull Requests</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => exportNotificationToCSV(notification)}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Export CSV
                                </Button>
                              </div>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {notification.metadata.pullRequests.map((pr, idx) => (
                                  <div key={idx} className="border rounded-md p-3 bg-background hover:bg-muted/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium text-sm truncate">#{pr.id}</span>
                                      </div>
                                      {pr.idleDays > 0 && (
                                        <Badge variant="outline" className="text-xs flex-shrink-0 border-orange-600 text-orange-600">
                                          {pr.idleDays}d idle
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm font-medium mb-2 line-clamp-2">{pr.title}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                                      {pr.repository && (
                                        <div className="flex items-center gap-1.5">
                                          <Package className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">{pr.repository}</span>
                                        </div>
                                      )}
                                      {pr.createdBy && (
                                        <div className="flex items-center gap-1.5">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">{pr.createdBy}</span>
                                        </div>
                                      )}
                                      {pr.sourceBranch && (
                                        <div className="flex items-center gap-1.5">
                                          <GitBranch className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">{pr.sourceBranch} → {pr.targetBranch}</span>
                                        </div>
                                      )}
                                      {pr.createdDate && (
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">Created: {new Date(pr.createdDate).toLocaleDateString()}</span>
                                        </div>
                                      )}
                                    </div>
                                    {pr.url && (
                                      <div className="flex items-center gap-2">
                                        <a 
                                          href={pr.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                          View PR <ExternalLink className="h-3 w-3" />
                                        </a>
                                        <CopyButton content={pr.url} variant="ghost" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      
                      {/* Azure DevOps Link */}
                      {notification.metadata?.url && (
                        <div className="flex items-center gap-2">
                          <a 
                            href={notification.metadata.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline px-4 py-2 bg-primary/5 rounded-md hover:bg-primary/10 transition-colors flex-1"
                          >
                            View in Azure DevOps
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <CopyButton content={notification.metadata.url} variant="outline" />
                        </div>
                      )}
                      
                      {/* Channel Status */}
                      {notification.channels && notification.channels.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Delivery:</span>
                          {notification.channels.map((channel, idx) => (
                            <Badge 
                              key={idx} 
                              variant={channel.status === 'sent' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {channel.platform}: {channel.status}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                );
              })}
            </Accordion>
          )}
          
          {/* Load More Button */}
          {!loading && !error && filteredNotifications.length > 0 && hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchNotifications(true)}
                disabled={loadingMore}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationHistory;
