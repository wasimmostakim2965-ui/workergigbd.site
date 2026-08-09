import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingSpinner } from '@/components/ui/EmptyState';
import { Notification } from '@/types';

const iconMap: Record<string, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-primary-600" />,
  success: <CheckCircle className="h-5 w-5 text-success-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning-600" />,
  error: <XCircle className="h-5 w-5 text-error-600" />,
};

const bgMap: Record<string, string> = {
  info: 'bg-primary-50',
  success: 'bg-success-50',
  warning: 'bg-warning-50',
  error: 'bg-error-50',
};

export function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!profile) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('notifications')
        .select('*').eq('user_id', profile.id)
        .order('created_at', { ascending: false }).limit(50);
      if (error) {
        console.error('Load notifications error:', error);
        setNotifications([]);
      } else {
        setNotifications((data as Notification[]) ?? []);
      }
    } catch (err) {
      console.error('Load notifications error:', err);
      setNotifications([]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    loadNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner size={40} className="py-20" />
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title="No notifications"
            description="You'll be notified about deposits, withdrawals, tasks, and more."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card key={notif.id} className={`p-4 ${!notif.is_read ? 'border-primary-200 bg-primary-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgMap[notif.type]}`}>
                  {iconMap[notif.type]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">{notif.title}</h3>
                    {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary-500" />}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{notif.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => deleteNotification(notif.id)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-error-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
