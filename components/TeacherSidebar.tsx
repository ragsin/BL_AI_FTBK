import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChartPieIcon, CalendarIcon, UsersIcon, BeakerIcon, UserCircleIcon, ArrowLeftOnRectangleIcon, ArchiveBoxIcon, SparklesIcon, AcademicCapIcon, ChatBubbleIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon } from './icons/Icons';
import { useSettings } from '../contexts/SettingsContext';
import { useSidebar } from '../contexts/SidebarContext';
import { getConversations } from '../api/communicationApi';
import { getEnrollments } from '../api/enrollmentApi';
import { getAssignments, getSessions } from '../api/sessionApi';
import { AssignmentStatus, SessionStatus } from '../types';

const TeacherSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { isSidebarOpen } = useSidebar();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [assignmentsToGradeCount, setAssignmentsToGradeCount] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);

  const navLinkClasses = 'flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors';
  const activeClasses = 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm';
  const inactiveClasses = 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

  const sidebarClasses = `
    w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col
    fixed md:relative md:translate-x-0 inset-y-0 left-0 z-30
    transition-transform duration-300 ease-in-out
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        // Unread messages count
        const conversations = await getConversations();
        const myConversations = conversations.filter(c => c.participantIds.includes(user.id));
        const totalUnread = myConversations.reduce((acc, c) => acc + (c.unreadCount[user.id] || 0), 0);
        setUnreadMessages(totalUnread);

        // Assignments to grade count
        const enrollments = await getEnrollments();
        const assignments = await getAssignments();
        const myStudentIds = new Set(enrollments.filter(e => e.teacherId === user.id).map(e => e.studentId));
        const count = assignments.filter(a => myStudentIds.has(a.studentId) && (a.status === AssignmentStatus.PENDING_GRADING || a.status === AssignmentStatus.SUBMITTED_LATE)).length;
        setAssignmentsToGradeCount(count);

        // At-Risk count
        if (settings.studentAtRisk.enabled) {
            const sessions = await getSessions();
            const periodDaysAgo = new Date();
            periodDaysAgo.setDate(periodDaysAgo.getDate() - settings.studentAtRisk.missedSessions.periodDays);
            
            const studentAbsenceCount = sessions
                .filter(s => s.status === SessionStatus.ABSENT && new Date(s.start) >= periodDaysAgo && s.studentId && myStudentIds.has(s.studentId))
                .reduce((acc, session) => {
                    if (session.studentId) {
                        acc[session.studentId] = (acc[session.studentId] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);

            const atRiskStudentIds = Object.keys(studentAbsenceCount)
                .filter(studentId => studentAbsenceCount[studentId] >= settings.studentAtRisk.missedSessions.count);
            
            setAtRiskCount(atRiskStudentIds.length);
        }
      };
      fetchData();
    }
  }, [user, settings.studentAtRisk]);

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
        <NavLink to="/teacher/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`} end>
          <ChartPieIcon className="h-5 w-5 mr-3" />
          Dashboard
        </NavLink>
        <NavLink to="/teacher/schedule" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <CalendarIcon className="h-5 w-5 mr-3" />
          My Schedule
        </NavLink>
        <NavLink to="/teacher/students" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <UsersIcon className="h-5 w-5 mr-3" />
          My Students
        </NavLink>
        <NavLink to="/teacher/grading" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ClipboardDocumentCheckIcon className="h-5 w-5 mr-3" />
          Grading Queue
          {assignmentsToGradeCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{assignmentsToGradeCount}</span>
          )}
        </NavLink>
        <NavLink to="/teacher/at-risk" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ExclamationTriangleIcon className="h-5 w-5 mr-3" />
          At-Risk Students
          {atRiskCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{atRiskCount}</span>
          )}
        </NavLink>
         <NavLink to="/teacher/messages" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ChatBubbleIcon className="h-5 w-5 mr-3" />
          Messages
          {unreadMessages > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{unreadMessages}</span>
          )}
        </NavLink>
        <NavLink to="/teacher/programs" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <AcademicCapIcon className="h-5 w-5 mr-3" />
          Programs
        </NavLink>
        <NavLink to="/teacher/assets" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <ArchiveBoxIcon className="h-5 w-5 mr-3" />
          My Assets
        </NavLink>
        <NavLink to="/teacher/availability" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeClasses : inactiveClasses}`}>
          <SparklesIcon className="h-5 w-5 mr-3" />
          My Availability
        </NavLink>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {user && (
             <div className="flex items-center justify-between">
                <Link to="/teacher/profile" className="flex-grow p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
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

export default TeacherSidebar;