import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bell, Search, ExternalLink, Clock, ChevronDown, GitBranch, Package, User, Rocket } from 'lucide-react';
import { CopyButton } from '../components/ui/shadcn-io/copy-button';
import { useAuth } from '@/contexts/AuthContext';

const NotificationHistory = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = user._id || user.id;
      console.log('Fetching notifications for user:', userId, 'tab:', activeTab);
      
      const params = new URLSearchParams({ userId, limit: 50 });
      if (activeTab !== 'all') {
        params.append('type', activeTab); // Only fetch for active tab
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
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
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

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All {counts.total || ''}</TabsTrigger>
          <TabsTrigger value="build">Builds {counts.build || ''}</TabsTrigger>
          <TabsTrigger value="release">Releases {counts.release || ''}</TabsTrigger>
          <TabsTrigger value="work-item">Work Items {counts['work-item'] || ''}</TabsTrigger>
          <TabsTrigger value="pull-request">PRs {counts['pull-request'] || ''}</TabsTrigger>
          <TabsTrigger value="overdue">Overdue {counts.overdue || ''}</TabsTrigger>
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
                  <AccordionTrigger className="hover:no-underline px-6 py-4 [&[data-state=open]]:border-b">
                    <div className="flex items-center gap-4 w-full text-left">
                      <div className="flex items-center gap-2">
                        <Badge variant={notification.subType === 'failed' ? 'destructive' : notification.subType === 'succeeded' ? 'default' : 'secondary'}>
                          {notification.type}
                        </Badge>
                        {notification.subType && (
                          <Badge variant="outline" className="capitalize">
                            {notification.subType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-1 truncate">{notification.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-6 pb-4 pt-4">
                    <div className="space-y-4">
                      {/* Type-specific metadata */}
                      {notification.metadata && (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm bg-muted/30 p-4 rounded-md">
                          {/* Build-specific */}
                          {notification.type === 'build' && (
                            <>
                              {notification.metadata.buildNumber && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Build Number</p>
                                  <p className="font-medium">#{notification.metadata.buildNumber}</p>
                                </div>
                              )}
                              {notification.metadata.repository && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Repository</p>
                                  <p className="font-medium">{notification.metadata.repository}</p>
                                </div>
                              )}
                              {notification.metadata.branch && (
                                <div className="flex items-start gap-2">
                                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Branch</p>
                                    <p className="font-medium">{notification.metadata.branch}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.commit && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Commit</p>
                                  <p className="font-mono text-xs">{notification.metadata.commit}</p>
                                </div>
                              )}
                              {notification.metadata.requestedBy && (
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Requested By</p>
                                    <p className="font-medium">{notification.metadata.requestedBy}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.duration && (
                                <div className="flex items-start gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-medium">{notification.metadata.duration}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Release-specific */}
                          {notification.type === 'release' && (
                            <>
                              {notification.metadata.releaseDefinitionName && (
                                <div className="flex items-start gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pipeline</p>
                                    <p className="font-medium">{notification.metadata.releaseDefinitionName}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.releaseName && (
                                <div className="flex items-start gap-2">
                                  <Rocket className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Release</p>
                                    <p className="font-medium">{notification.metadata.releaseName}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.environmentName && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Environment</p>
                                  <p className="font-medium">{notification.metadata.environmentName}</p>
                                </div>
                              )}
                              {notification.metadata.deployedBy && (
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Deployed By</p>
                                    <p className="font-medium">{notification.metadata.deployedBy}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.duration && (
                                <div className="flex items-start gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Duration</p>
                                    <p className="font-medium">{notification.metadata.duration}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Work Item-specific */}
                          {notification.type === 'work-item' && (
                            <>
                              {notification.metadata.workItemId && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Work Item ID</p>
                                  <p className="font-medium">#{notification.metadata.workItemId}</p>
                                </div>
                              )}
                              {notification.metadata.workItemType && typeof notification.metadata.workItemType !== 'object' && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Type</p>
                                  <p className="font-medium">{notification.metadata.workItemType}</p>
                                </div>
                              )}
                              {notification.metadata.state && typeof notification.metadata.state !== 'object' && (
                                <div>
                                  <p className="text-xs text-muted-foreground">State</p>
                                  <p className="font-medium">{notification.metadata.state}</p>
                                </div>
                              )}
                              {notification.metadata.assignedTo && typeof notification.metadata.assignedTo !== 'object' && (
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Assigned To</p>
                                    <p className="font-medium">{notification.metadata.assignedTo}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Pull Request-specific */}
                          {notification.type === 'pull-request' && (
                            <>
                              {notification.metadata.pullRequestId && (
                                <div>
                                  <p className="text-xs text-muted-foreground">PR ID</p>
                                  <p className="font-medium">#{notification.metadata.pullRequestId}</p>
                                </div>
                              )}
                              {notification.metadata.repository && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Repository</p>
                                  <p className="font-medium">{notification.metadata.repository}</p>
                                </div>
                              )}
                              {notification.metadata.sourceBranch && (
                                <div className="flex items-start gap-2">
                                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Source</p>
                                    <p className="font-medium">{notification.metadata.sourceBranch}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.targetBranch && (
                                <div className="flex items-start gap-2">
                                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Target</p>
                                    <p className="font-medium">{notification.metadata.targetBranch}</p>
                                  </div>
                                </div>
                              )}
                              {notification.metadata.createdBy && (
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Created By</p>
                                    <p className="font-medium">{notification.metadata.createdBy}</p>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Overdue/Idle PR - just show count */}
                          {(notification.type === 'overdue' || notification.type === 'idle-pr') && (
                            <>
                              {notification.metadata.count && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Count</p>
                                  <p className="font-medium text-lg">{notification.metadata.count} items</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Azure DevOps Link */}
                      {notification.metadata?.url && (
                        <div className="flex items-center gap-2">
                          <a 
                            href={notification.metadata.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline px-4 py-2 bg-primary/5 rounded-md hover:bg-primary/10 transition-colors"
                          >
                            View in Azure DevOps
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <CopyButton content={notification.metadata.url} variant="outline" />
                        </div>
                      )}
                      
                      {/* Channel Status */}
                      {notification.channels && notification.channels.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationHistory;
