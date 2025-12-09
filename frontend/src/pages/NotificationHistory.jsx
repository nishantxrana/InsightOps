import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Bell, Search, ExternalLink, Clock, ChevronDown, GitBranch, Package, User, Rocket, Hash, GitCommit, FileText, CheckCircle, AlertCircle, FolderTree, Download } from 'lucide-react';
import { CopyButton } from '../components/ui/shadcn-io/copy-button';
import { useAuth } from '@/contexts/AuthContext';
import { exportNotificationToCSV } from '@/utils/csvExport';

const NotificationHistory = () => {
  const { user } = useAuth();
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

  console.log('NotificationHistory component rendered, user:', user);

  useEffect(() => {
    const userId = user?._id || user?.id;
    console.log('useEffect triggered, userId:', userId);
    if (userId) {
      fetchNotifications();
      fetchCounts();
    } else {
      console.log('No user ID, setting loading to false');
      setLoading(false);
    }
  }, [user, activeTab]); // Refetch when tab changes

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
      const userId = user._id || user.id;
      const currentPage = loadMore ? page + 1 : 0;
      console.log('Fetching notifications for user:', userId, 'tab:', activeTab, 'page:', currentPage);
      
      const limit = 20;
      const params = new URLSearchParams({ userId, limit, skip: currentPage * limit });
      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched notifications:', data.length, 'items for tab:', activeTab);
      
      if (loadMore) {
        setNotifications(prev => [...prev, ...data]);
        setPage(currentPage);
      } else {
        setNotifications(data);
      }
      
      setHasMore(data.length === limit);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const userId = user._id || user.id;
      console.log('Fetching counts for user:', userId);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notifications/counts?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched counts:', data);
      setCounts(data);
    } catch (error) {
      console.error('Failed to fetch counts:', error);
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notification History
          </h1>
          <p className="text-muted-foreground mt-1">Last 7 days of notifications</p>
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
              <SelectItem value="overdue">Overdue Work Items {counts.overdue ? `(${counts.overdue})` : ''}</SelectItem>
              <SelectItem value="idle-pr">Idle PRs {counts['idle-pr'] ? `(${counts['idle-pr']})` : ''}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Desktop: Tabs */}
        <TabsList className="hidden sm:inline-flex">
          <TabsTrigger value="all">All {counts.total || ''}</TabsTrigger>
          <TabsTrigger value="build">Builds {counts.build || ''}</TabsTrigger>
          <TabsTrigger value="release">Releases {counts.release || ''}</TabsTrigger>
          <TabsTrigger value="work-item">Work Items {counts['work-item'] || ''}</TabsTrigger>
          <TabsTrigger value="pull-request">PRs {counts['pull-request'] || ''}</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Work Items {counts.overdue || ''}</TabsTrigger>
          <TabsTrigger value="idle-pr">Idle PRs {counts['idle-pr'] || ''}</TabsTrigger>
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
            <div className="text-center py-8 text-muted-foreground">No notifications found</div>
          ) : (
            <Accordion type="single" collapsible className="space-y-3">
              {filteredNotifications.map((notification) => (
                <AccordionItem key={notification._id} value={notification._id} className="border rounded-lg overflow-hidden">
                  <AccordionTrigger className="hover:no-underline px-3 sm:px-6 py-3 sm:py-4 [&[data-state=open]]:border-b grid grid-cols-[1fr_auto] gap-2 items-center">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:min-w-[240px] shrink-0">
                        <Badge variant="secondary" className="text-xs rounded-full">
                          {notification.type}
                        </Badge>
                        {notification.subType && (
                          <Badge 
                            variant={notification.subType === 'failed' ? 'destructive' : 'outline'} 
                            className={`capitalize text-xs rounded-full ${notification.subType === 'succeeded' ? 'bg-green-100 text-green-800 border-green-100 dark:bg-green-900 dark:text-green-100 dark:border-green-900' : ''}`}
                          >
                            {notification.subType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base mb-1 truncate">{notification.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{new Date(notification.createdAt).toLocaleString()}</span>
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
              ))}
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
