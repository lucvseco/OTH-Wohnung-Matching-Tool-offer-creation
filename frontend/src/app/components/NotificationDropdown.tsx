import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { Bell } from 'lucide-react';

export function NotificationDropdown() {
  const { user } = useAuth();
  const { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = user ? getUserNotifications(user.id) : [];
  const unreadCount = user ? getUnreadCount(user.id) : 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationLink = (notification: typeof notifications[0]) => {
    switch (notification.type) {
      case 'application':
        return `/applications/${notification.offerId}`;
      case 'approval':
      case 'offer':
        return '/chats';
      case 'decline':
      case 'final-decline':
        return '/my-applications';
      default:
        return '/';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application':
        return '📨';
      case 'approval':
        return '✅';
      case 'decline':
      case 'final-decline':
        return '❌';
      case 'offer':
        return '🎉';
      default:
        return '🔔';
    }
  };

  return (
      <div className="relative" ref={dropdownRef}>
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Bell size={24} />
          {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
          )}
        </button>

        {isOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[500px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No notifications yet
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <Link
                            key={notification.id}
                            to={getNotificationLink(notification)}
                            onClick={async () => {
                              if (!notification.isRead) {
                                await handleNotificationClick(notification.id);
                              }
                              setIsOpen(false);
                            }}
                            className={`block p-4 border-b hover:bg-gray-50 transition-colors ${
                                !notification.isRead ? 'bg-blue-50/60 font-medium' : ''
                            }`}
                        >
                          <div className="flex gap-3">
                            <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 mb-1">{notification.title}</p>
                              <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.createdAt
                                    ? new Date(notification.createdAt).toLocaleString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                    : 'recently'}
                              </p>
                            </div>
                            {!notification.isRead && (
                                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                            )}
                          </div>
                        </Link>
                    ))
                )}
              </div>
            </div>
        )}
      </div>
  );
}