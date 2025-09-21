import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChartPieIcon, BeakerIcon, ArrowLeftOnRectangleIcon, BanknotesIcon, CalendarIcon, ClipboardDocumentListIcon, ArrowTrendingUpIcon, ChatBubbleIcon, DocumentReportIcon } from './icons/Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useSidebar } from '../contexts/SidebarContext';

const ParentSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { isSidebarOpen } = useSidebar();
  const navLinkClasses = 'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors';
  const activeClasses = 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm';
  const inactiveClasses = 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

  const sidebarClasses = `
    w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col
    fixed md:relative md:translate-x-0 inset-y-0 left-0 z-30
    transition-transform duration-300 ease-in-out
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <aside className={sidebarClasses}>
      <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 dark:border-gray-700">
         <div className="flex items-center space-x-3">
            {settings.companyLogoUrl ? (
                <img src={settings.companyLogoUrl} alt={`${settings.companyName} Logo`} className="h-8 w-auto max-h-8" />
            ) : (
                <BeakerIcon className="h-6 w-6 text-gray-800 dark:text-white" />
            )}
            <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">{settings.companyName}</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/parent/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`} end>
          <ChartPieIcon className="h-5 w-5 mr-3" />
          Dashboard
        </NavLink>
        <NavLink to="/parent/schedule" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <CalendarIcon className="h-5 w-5 mr-3" />
          Schedule
        </NavLink>
        <NavLink to="/parent/assignments" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ClipboardDocumentListIcon className="h-5 w-5 mr-3" />
          Assignments
        </NavLink>
        <NavLink to="/parent/journey" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ArrowTrendingUpIcon className="h-5 w-5 mr-3" />
          Learning Journey
        </NavLink>
        <NavLink to="/parent/reports" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <DocumentReportIcon className="h-5 w-5 mr-3" />
            Progress Reports
        </NavLink>
        <NavLink to="/parent/credits" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <BanknotesIcon className="h-5 w-5 mr-3" />
          Credit History
        </NavLink>
        <NavLink to="/parent/messages" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ChatBubbleIcon className="h-5 w-5 mr-3" />
          Messages
        </NavLink>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {user && (
            <div className="flex items-center justify-between">
                <Link to="/parent/profile" className="flex-grow p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex items-center space-x-3">
                        <img className="h-10 w-10 rounded-full" src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                </Link>
                <button onClick={logout} title="Logout" className="flex-shrink-0 ml-2 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
            </div>
          )}
      </div>
    </aside>
  );
};

export default ParentSidebar;