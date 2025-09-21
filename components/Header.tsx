import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon, BellIcon, SearchIcon, CheckCircleIcon, MenuIcon, ArrowRightIcon, GiftIcon } from './icons/Icons';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { Notification } from '../types';
import { useSidebar } from '../contexts/SidebarContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationsForUser, getNotifications, saveNotifications } from '../api/communicationApi';
import { useChangelog } from '../contexts/ChangelogContext';

// Helper for relative time formatting
const timeSince = (date: Date): string => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 0) return 'in the future';
    if (seconds < 60) return `${seconds}s ago`;
    
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `${Math.floor(seconds)}s ago`;
};


const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const { openChangelog, hasNewUpdate } = useChangelog();
  
  useEffect(() => {
    if (user) {
        const fetchNotifications = async () => {
            const userNotifications = await getNotificationsForUser(user.id);
            if (userNotifications) {
                setNotifications(userNotifications);
            }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll for new notifications every 30 seconds
        return () => clearInterval(interval);
    }
  }, [user]);

  const notificationsRef = useOutsideClick(() => {
    setNotificationsOpen(false);
  });
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    const newNotifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(newNotifications);
    // Persist change to all notifications in storage
    const allNotifs = await getNotifications();
    const updatedAllNotifs = allNotifs.map(n => n.id === id ? { ...n, read: true } : n);
    await saveNotifications(updatedAllNotifs);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const newNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(newNotifications);
    // Persist change
    const allNotifs = await getNotifications();
    const updatedAllNotifs = allNotifs.map(n => n.userId === user.id ? { ...n, read: true } : n);
    await saveNotifications(updatedAllNotifs);
  };

  const pageTitle = usePageTitle();
  
  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-white dark:bg-gray-900">
        <div className="flex items-center">
            <button
                onClick={toggleSidebar}
                className="md:hidden mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Toggle sidebar"
            >
                <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white hidden sm:block">{pageTitle}</h1>
        </div>

        <div className="flex items-center space-x-4">
            <button id="theme-toggle" onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Toggle theme">
                {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
            </button>

            <button onClick={openChangelog} className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="What's New">
                <GiftIcon className="h-6 w-6" />
                {hasNewUpdate && (
                    <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full"></span>
                )}
            </button>

            <div id="notifications-bell" className="relative" ref={notificationsRef}>
                <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Notifications">
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>
                    )}
                </button>
                {notificationsOpen && (
                     <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-20">
                        <div className="p-3 flex justify-between items-center border-b dark:border-gray-700">
                            <h3 className="text-md font-semibold text-gray-800 dark:text-white">Notifications</h3>
                            <button onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="text-xs text-primary-500 hover:underline disabled:text-gray-400 disabled:no-underline">Mark all as read</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="text-center text-sm text-gray-500 p-4">No new notifications.</p>
                            ) : notifications.map(n => (
                                <div key={n.id} className={`p-3 flex items-start space-x-3 border-b dark:border-gray-700 last:border-b-0 ${!n.read ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                                    <img src={n.actor.avatar} alt={n.actor.name} className="h-10 w-10 rounded-full flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-semibold">{n.actor.name}</span> {n.message}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{timeSince(new Date(n.timestamp))}</p>
                                        {n.link && (
                                            <Link 
                                                to={n.link} 
                                                onClick={() => setNotificationsOpen(false)} 
                                                className="mt-1 inline-flex items-center text-xs font-bold text-primary-600 hover:underline"
                                            >
                                                View Details <ArrowRightIcon className="h-3 w-3 ml-1" />
                                            </Link>
                                        )}
                                    </div>
                                    {!n.read && (
                                        <button onClick={() => handleMarkAsRead(n.id)} className="p-1" title="Mark as read">
                                            <CheckCircleIcon className="h-5 w-5 text-gray-400 hover:text-green-500" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </header>
  );
};

export default Header;