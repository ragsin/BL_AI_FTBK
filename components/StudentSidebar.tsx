import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChartPieIcon, CalendarIcon, ClipboardDocumentListIcon, ArrowTrendingUpIcon, BeakerIcon, ArrowLeftOnRectangleIcon, UserCircleIcon, StarIcon, FireIcon, MailIcon, TrophyIcon } from './icons/Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useSidebar } from '../contexts/SidebarContext';
import { getConversations } from '../api/communicationApi';

const StudentSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { isSidebarOpen } = useSidebar();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const navLinkClasses = 'flex items-center px-4 py-3 text-base font-bold rounded-xl transition-all duration-200';
  const activeClasses = 'bg-white/20 text-white shadow-lg scale-105';
  const inactiveClasses = 'text-white/70 hover:bg-white/10 hover:text-white';
  
  const sidebarClasses = `
    w-64 flex-shrink-0 bg-gradient-to-b from-sky-500 to-sky-600 dark:from-sky-700 dark:to-sky-800 flex flex-col
    fixed md:relative md:translate-x-0 inset-y-0 left-0 z-30
    transition-transform duration-300 ease-in-out
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  `;
  
  useEffect(() => {
    if (user) {
        const fetchUnread = async () => {
            const conversations = await getConversations();
            const myConversations = conversations.filter(c => c.participantIds.includes(user.id));
            const totalUnread = myConversations.reduce((acc, c) => acc + (c.unreadCount[user.id] || 0), 0);
            setUnreadMessages(totalUnread);
        };
        fetchUnread();
    }
  }, [user]);

  return (
    <aside className={sidebarClasses}>
      <div className="h-20 flex items-center justify-center px-4">
         <div className="flex items-center space-x-3">
            {settings.companyLogoUrl ? (
                <img src={settings.companyLogoUrl} alt={`${settings.companyName} Logo`} className="h-10 w-auto max-h-10" />
            ) : (
                <BeakerIcon className="h-8 w-8 text-white" />
            )}
            <span className="text-3xl font-extrabold tracking-tight text-white">{settings.companyName}</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-3">
        <NavLink to="/student/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`} end>
          <ChartPieIcon className="h-6 w-6 mr-3" />
          Adventure Hub
        </NavLink>
        <NavLink to="/student/schedule" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <CalendarIcon className="h-6 w-6 mr-3" />
          My Schedule
        </NavLink>
        <NavLink to="/student/assignments" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ClipboardDocumentListIcon className="h-6 w-6 mr-3" />
          My Quests
        </NavLink>
        <NavLink to="/student/journey" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ArrowTrendingUpIcon className="h-6 w-6 mr-3" />
          Journey Map
        </NavLink>
        <NavLink to="/student/leaderboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <TrophyIcon className="h-6 w-6 mr-3" />
          Leaderboard
        </NavLink>
        <NavLink to="/student/messages" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <MailIcon className="h-6 w-6 mr-3" />
            Messages
            {unreadMessages > 0 && (
                <span className="ml-auto inline-flex items-center justify-center h-6 w-6 text-xs font-bold text-white bg-pink-500 rounded-full">{unreadMessages}</span>
            )}
        </NavLink>
      </nav>
      <div className="p-4">
          {user && (
             <div className="flex items-center justify-between">
                <Link to="/student/profile" className="flex-grow p-2 rounded-lg hover:bg-white/10">
                    <div className="flex items-center space-x-3">
                        <img className="h-10 w-10 rounded-full" src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">{user.firstName} ${user.lastName}</p>
                        </div>
                    </div>
                </Link>
                <button onClick={logout} title="Logout" className="flex-shrink-0 ml-2 p-2 rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
            </div>
          )}
      </div>
    </aside>
  );
};

export default StudentSidebar;