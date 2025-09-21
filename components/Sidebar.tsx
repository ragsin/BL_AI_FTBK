


import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ChartPieIcon, UsersIcon, AcademicCapIcon, CalendarIcon, CogIcon, BeakerIcon, ClipboardListIcon, ArchiveBoxIcon, ArrowLeftOnRectangleIcon, UserCircleIcon, DocumentReportIcon, BanknotesIcon, MegaphoneIcon } from './icons/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useSidebar } from '../contexts/SidebarContext';

const Sidebar: React.FC = () => {
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
    <aside id="main-sidebar" className={sidebarClasses}>
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
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavLink id="nav-dashboard" to="/admin/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ChartPieIcon className="h-5 w-5 mr-3" />
          Dashboard
        </NavLink>
        <NavLink id="nav-users" to="/admin/users" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <UsersIcon className="h-5 w-5 mr-3" />
          Users
        </NavLink>
        <NavLink id="nav-programs" to="/admin/programs" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <AcademicCapIcon className="h-5 w-5 mr-3" />
          Programs
        </NavLink>
        <NavLink id="nav-enrollments" to="/admin/enrollments" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ClipboardListIcon className="h-5 w-5 mr-3" />
          Enrollments
        </NavLink>
        <NavLink id="nav-schedule" to="/admin/schedule" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <CalendarIcon className="h-5 w-5 mr-3" />
          Schedule
        </NavLink>
        <NavLink id="nav-communication" to="/admin/communication" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <MegaphoneIcon className="h-5 w-5 mr-3" />
          Communications
        </NavLink>
        <NavLink id="nav-revenue" to="/admin/revenue" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <BanknotesIcon className="h-5 w-5 mr-3" />
          Revenue
        </NavLink>
        <NavLink id="nav-assets" to="/admin/assets" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ArchiveBoxIcon className="h-5 w-5 mr-3" />
          Assets
        </NavLink>
        <NavLink id="nav-reports" to="/admin/reports" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <DocumentReportIcon className="h-5 w-5 mr-3" />
          Reports
        </NavLink>
        <NavLink id="nav-audit-log" to="/admin/audit-log" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ClipboardListIcon className="h-5 w-5 mr-3" />
          Audit Log
        </NavLink>
        <NavLink id="nav-settings" to="/admin/settings" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <CogIcon className="h-5 w-5 mr-3" />
          Settings
        </NavLink>
      </nav>
      <div id="user-profile-widget" className="p-4 border-t border-gray-200 dark:border-gray-700">
          {user && (
            <div className="flex items-center justify-between">
                <Link to="/admin/profile" className="flex-grow p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex items-center space-x-3">
                        <img className="h-10 w-10 rounded-full" src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                </Link>
                <button onClick={logout} title="Logout" aria-label="Logout" className="flex-shrink-0 ml-2 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                </button>
            </div>
          )}
      </div>
    </aside>
  );
};

export default Sidebar;