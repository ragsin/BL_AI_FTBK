import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Session, Assignment, AssignmentStatus, EnrollmentStatus, SessionStatus, CurriculumItem, CurriculumStatus, Conversation, User, Program } from '../../types';
import { CalendarIcon, ClipboardDocumentCheckIcon, BookOpenIcon, BanknotesIcon, ExclamationTriangleIcon, ChatBubbleIcon, ArrowRightIcon } from '../../components/icons/Icons';
import { useSettings } from '../../contexts/SettingsContext';
import { Link, useNavigate } from 'react-router-dom';
import { useParentPortal } from '../../contexts/ParentPortalContext';
import ParentPageHeader from '../../components/ParentPageHeader';

import { getSessions, getAssignments } from '../../api/sessionApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getCurriculumProgress, getPrograms } from '../../api/programApi';
import { getConversations } from '../../api/communicationApi';
import { getUsers } from '../../api/userApi';

const calculateCurriculumProgress = (structure: CurriculumItem[] | undefined) => {
    let total = 0, completed = 0;
    const traverse = (items: CurriculumItem[]) => {
        items.forEach(item => {
            total++;
            if (item.status === CurriculumStatus.COMPLETED) completed++;
            if (item.children) traverse(item.children);
        });
    };
    if (structure) traverse(structure);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
};

const ParentDashboardPage: React.FC = () => {
    const { user: parent } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const { selectedChild, children } = useParentPortal();

    const [isLoading, setIsLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>({ upcomingEvents: [], recentSummaries: [], progressPercentage: 0, creditsRemaining: 0, unreadConversations: [] });

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedChild || !parent) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);

            const [allSessions, allAssignments, allEnrollments, allProgress, allConversations, allUsers] = await Promise.all([
                getSessions(), getAssignments(), getEnrollments(), getCurriculumProgress(), getConversations(), getUsers()
            ]);
            const userMap = new Map(allUsers.map(u => [u.id, u]));

            const upcomingSessions = allSessions
                .filter(s => s.studentId === selectedChild.id && new Date(s.start) > new Date() && s.status === SessionStatus.SCHEDULED)
                .map(s => ({ type: 'session' as const, date: new Date(s.start), title: s.title, id: s.id, data: s }));

            const upcomingAssignments = allAssignments
                .filter(a => a.studentId === selectedChild.id && a.status === AssignmentStatus.NOT_SUBMITTED && new Date(a.dueDate) > new Date())
                .map(a => ({ type: 'assignment' as const, date: new Date(a.dueDate), title: a.title, id: a.id, data: a }));
            
            const upcomingEvents = [...upcomingSessions, ...upcomingAssignments].sort((a,b) => a.date.getTime() - b.date.getTime()).slice(0,3);
            
            const recentSummaries = allSessions
                .filter(s => s.studentId === selectedChild.id && s.status === SessionStatus.COMPLETED && s.parentSummary)
                .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
                .slice(0, 3);

            const activeEnrollment = allEnrollments.find(e => e.studentId === selectedChild.id && e.status === EnrollmentStatus.ACTIVE);
            let progressPercentage = 0;
            let creditsRemaining = 0;
            if (activeEnrollment) {
                creditsRemaining = activeEnrollment.creditsRemaining;
                const curriculum = allProgress[activeEnrollment.id];
                if (curriculum) progressPercentage = calculateCurriculumProgress(curriculum.structure);
            }
            
            const parentConversations = allConversations.filter(c => c.participantIds.includes(parent.id));
            const unreadConversations = parentConversations.filter(c => {
                 const convoTeachers = c.participantIds.filter(id => id !== parent.id).map(id => userMap.get(id)).filter(u => u?.role === 'Teacher');
                 const childEnrollments = allEnrollments.filter(e => e.studentId === selectedChild.id);
                 const childTeacherIds = new Set(childEnrollments.map(e => e.teacherId));
                 return convoTeachers.some(t => t && childTeacherIds.has(t.id)) && (c.unreadCount[parent.id] || 0) > 0;
            }).slice(0,3);

            setDashboardData({ upcomingEvents, recentSummaries, progressPercentage, creditsRemaining, unreadConversations, userMap });
            setIsLoading(false);
        };
        fetchData();
    }, [selectedChild, parent]);
    
    const { upcomingEvents, recentSummaries, progressPercentage, creditsRemaining, unreadConversations, userMap } = dashboardData;
    const isLowOnCredits = creditsRemaining !== undefined && settings.parentLowCreditAlerts.enabled && creditsRemaining <= settings.parentLowCreditAlerts.threshold;

    const isJoinable = (session: Session) => {
        const now = new Date().getTime();
        const startTime = new Date(session.start).getTime();
        const joinableAfter = startTime - (settings.sessionJoinWindow.joinBufferMinutesBefore * 60 * 1000);
        const joinableBefore = startTime + (settings.sessionJoinWindow.joinBufferMinutesAfter * 60 * 1000);
        return session.status === SessionStatus.SCHEDULED && now >= joinableAfter && now <= joinableBefore;
    };
    
    if (children.length === 0) {
        return <ParentPageHeader title="Dashboard" />;
    }

    if (!selectedChild) {
        return (
            <div className="space-y-6">
                <ParentPageHeader title="Dashboard" />
                <div className="text-center p-8">
                    <p>Please select a child to view their dashboard.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <ParentPageHeader title="Dashboard" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">What's Next</h3>
                        <div className="space-y-4">
                            {upcomingEvents.length > 0 ? upcomingEvents.map((event: any) => (
                                <div key={`${event.type}-${event.id}`} className="flex items-center justify-between">
                                    <div className="flex items-start space-x-3">
                                        <div className={`p-2 rounded-full ${event.type === 'session' ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                                            {event.type === 'session' ? <CalendarIcon className="h-5 w-5 text-primary-600 dark:text-primary-300" /> : <ClipboardDocumentCheckIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{event.title}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {event.type === 'session' ? 'Session on' : 'Due on'} {event.date.toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    {event.type === 'session' && isJoinable(event.data) && event.data.sessionUrl && (
                                        <button
                                            onClick={() => window.open(event.data.sessionUrl, '_blank')}
                                            className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-green-600 transition-colors"
                                        >
                                            Join Session
                                        </button>
                                    )}
                                </div>
                            )) : <p className="text-sm text-gray-500">No upcoming sessions or assignments.</p>}
                        </div>
                        <Link to="/parent/schedule" className="mt-4 inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
                            View Full Schedule <ArrowRightIcon className="h-4 w-4 ml-1" />
                        </Link>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Session Summaries</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                             {recentSummaries.length > 0 ? recentSummaries.map((summary: Session) => (
                                <div key={summary.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <p className="font-bold text-sm text-gray-800 dark:text-white">{summary.title}</p>
                                        <p className="text-xs text-gray-500">{new Date(summary.start).toLocaleDateString()}</p>
                                    </div>
                                    <blockquote className="text-sm border-l-2 border-primary-300 pl-2 italic text-gray-600 dark:text-gray-300">
                                        {summary.parentSummary}
                                    </blockquote>
                                </div>
                            )) : <p className="text-sm text-gray-500">No recent summaries from teachers.</p>}
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center mb-3"><BookOpenIcon className="h-5 w-5 mr-2" /> Progress Snapshot</h3>
                         <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700"><div className="bg-primary-500 h-4 rounded-full" style={{ width: `${progressPercentage}%` }}></div></div>
                            <span className="ml-4 text-lg font-bold text-primary-600 dark:text-primary-400">{progressPercentage}%</span>
                        </div>
                    </div>
                    
                    <div className={`p-4 rounded-xl shadow-md flex items-center space-x-4 ${isLowOnCredits ? 'bg-warning-100 dark:bg-warning-800/20' : 'bg-white dark:bg-gray-800'}`}>
                        <div className={`p-3 rounded-full ${isLowOnCredits ? 'bg-warning-100' : 'bg-primary-100 dark:bg-primary-900/50'}`}>
                            {isLowOnCredits ? <ExclamationTriangleIcon className="h-6 w-6 text-warning-500" /> : <BanknotesIcon className="h-6 w-6 text-primary-500" />}
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${isLowOnCredits ? 'text-warning-800 dark:text-warning-200' : 'text-gray-500 dark:text-gray-400'}`}>Credit Status</p>
                            <p className={`text-2xl font-bold ${isLowOnCredits ? 'text-warning-800 dark:text-warning-100' : 'text-gray-800 dark:text-white'}`}>{creditsRemaining} Credits</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center"><ChatBubbleIcon className="h-5 w-5 mr-2" /> Recent Messages</h3>
                        <div className="space-y-3">
                            {unreadConversations.length > 0 ? unreadConversations.map((convo: Conversation) => {
                                if (!parent || !userMap) return null;
                                const teacher = userMap.get(convo.participantIds.find((id: string) => id !== parent.id));
                                if (!teacher) return null;
                                return (
                                    <div key={convo.id} onClick={() => navigate('/parent/messages')} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <div className="flex items-center space-x-3"><img src={teacher.avatar} alt={teacher.firstName} className="h-8 w-8 rounded-full" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{teacher.firstName} {teacher.lastName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{convo.lastMessageSnippet}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-sm text-gray-500">No new messages.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboardPage;