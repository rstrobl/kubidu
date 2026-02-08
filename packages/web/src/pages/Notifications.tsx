import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotificationStore, Notification, NotificationCategory } from '../stores/notification.store';
import { formatDistanceToNow } from '../utils/date';

const categoryStyles: Record<NotificationCategory, { bg: string; text: string; icon: string }> = {
  DEPLOYMENT: { bg: 'bg-success-100', text: 'text-success-700', icon: '🚀' },
  BUILD: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🔧' },
  DOMAIN: { bg: 'bg-violet-100', text: 'text-violet-700', icon: '🌐' },
  SERVICE: { bg: 'bg-primary-100', text: 'text-primary-700', icon: '⚙️' },
  WORKSPACE: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '👥' },
};

function NotificationSkeleton() {
  return (
    <div className="px-4 py-4 flex items-start gap-4 animate-pulse">
      <div className="w-10 h-10 rounded-full skeleton" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-3/4" />
        <div className="skeleton h-3 w-20" />
      </div>
    </div>
  );
}

export function Notifications() {
  const navigate = useNavigate();
  const {
    notifications,
    isLoading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications({ unreadOnly: filter === 'unread' });
  }, [loadNotifications, filter]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/projects" className="hover:text-gray-700 transition-colors">
          Dashboard
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Notifications</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-2 text-gray-500">
              {unreadCount > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </span>
                </>
              ) : (
                'All caught up! 🎉'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="btn btn-sm btn-secondary"
              >
                Mark all read
              </button>
            )}
            <Link
              to="/settings/notifications"
              className="btn btn-sm btn-ghost"
              title="Notification settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            filter === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            filter === 'unread'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications list */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="empty-state-title">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="empty-state-description">
              {filter === 'unread'
                ? "You're all caught up! Check back later."
                : "When something happens in your projects, you'll see it here."}
            </p>
            {filter === 'unread' && notifications.length === 0 && (
              <button
                onClick={() => setFilter('all')}
                className="btn btn-secondary"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => {
              const style = categoryStyles[notification.category];
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4 ${
                    !notification.isRead ? 'bg-primary-50/40' : ''
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${style.bg} ${style.text}`}
                  >
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {notification.category.toLowerCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt))}
                    </p>
                  </div>
                  {notification.actionUrl && (
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
