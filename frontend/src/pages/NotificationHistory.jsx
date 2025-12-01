import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Star, Search, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NotificationHistory = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
      fetchCounts();
    }
  }, [user, activeTab]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ userId: user._id, limit: 50 });
      if (activeTab !== 'all') params.append('type', activeTab);
      
      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const response = await fetch(`/api/notifications/counts?userId=${user._id}`);
      const data = await response.json();
      setCounts(data);
    } catch (error) {
      console.error('Failed to fetch counts:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const toggleStar = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeColor = (type) => {
    const colors = {
      build: 'bg-blue-500',
      release: 'bg-purple-500',
      'work-item': 'bg-green-500',
      'pull-request': 'bg-orange-500',
      overdue: 'bg-red-500',
      'idle-pr': 'bg-yellow-500'
    };
    return colors[type] || 'bg-gray-500';
  };

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
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No notifications found</div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`border rounded-lg p-4 ${!notification.read ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTypeColor(notification.type)}>
                        {notification.type}
                      </Badge>
                      {notification.subType && (
                        <Badge variant="outline">{notification.subType}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-semibold mb-1">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    {notification.aiSummary && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer text-blue-600">AI Analysis</summary>
                        <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                          {notification.aiSummary}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleStar(notification._id)}
                      className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        notification.starred ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                    >
                      <Star className="h-4 w-4" fill={notification.starred ? 'currentColor' : 'none'} />
                    </button>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-green-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationHistory;
