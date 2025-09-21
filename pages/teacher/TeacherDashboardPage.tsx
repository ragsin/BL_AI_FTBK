import React, { useMemo, useState, useEffect } from 'react';
import { User, Assignment, AssignmentStatus, Session, SessionStatus, Conversation, CancellationRequest, Program, Enrollment, EnrollmentStatus } from '../../types';
import { CalendarIcon, ClockIcon, ClipboardDocumentCheckIcon, UserGroupIcon, PencilSquareIcon, ChatBubbleIcon, ExclamationTriangleIcon } from '../../components/icons/Icons';
import { getUsers } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import { getSessions, getAssignments, getCancellationRequests } from '../../api/sessionApi';
import { getConversations } from '../../api/communicationApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import SkeletonLoader from '../../components/SkeletonLoader';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md flex items-center space-x-4">
    <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full">
      <Icon className="h-6 w-6 text-primary-500" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
);


const NextSessionCard: React.FC<{ session: Session | undefined, userMap: Map<string, User>, programMap: Map<string, Program> }> = ({ session, userMap, programMap }) => {
    const { settings } = useSettings();

    if (!session) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col justify-center items-center h-full">
                <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No Upcoming Sessions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your schedule is clear!</p>
            </div>
        )
    }
    
    const student = session.studentId ? userMap.get(session.studentId) : undefined;
    const program = programMap.get(session.programId);
    const startTime = new Date(session.start);

    const now = new Date().getTime();
    const sessionStartTime = startTime.getTime();
    const joinableAfter = sessionStartTime - (settings.sessionJoinWindow.joinBufferMinutesBefore * 60 * 1000);
    const joinableBefore = sessionStartTime + (settings.sessionJoinWindow.joinBufferMinutesAfter * 60 * 1000);
    const canStart = session.status === SessionStatus.SCHEDULED && now >= joinableAfter && now <= joinableBefore;


    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Next Session</h3>
            <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/50 p-4 rounded-lg">
                    <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 text-center">{startTime.toLocaleString('en-US', { day: '2-digit' })}</p>
                    <p className="text-sm font-medium text-primary-500 dark:text-primary-300 text-center">{startTime.toLocaleString('en-US', { month: 'short' })}</p>
                </div>
                <div>
                    <p className="text-md font-bold text-gray-900 dark:text-white">{program?.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">with {student ? `${student.firstName} ${student.lastName}` : ''}</p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                        <ClockIcon className="h-4 w-4 mr-1.5" />
                        <span>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>
            {canStart && session.sessionUrl && (
                <button
                    onClick={() => window.open(session.sessionUrl, '_blank')}
                    className="mt-4 w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
                >
                    Start Session
                </button>
            )}
        </div>
    );
};

const AtRiskStudentsCard: React.FC<{ students: { studentId: string; studentName: string; avatar?: string; absences: number }[] }> = ({ students }) => {
    const navigate = useNavigate();
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 mr-3 text-warning-500" />
                At-Risk Students ({students.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {students.length > 0 ? students.slice(0, 5).map(student => (
                    <div key={student.studentId} className="p-3 bg-warning-50 dark:bg-warning-800/20 rounded-lg flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <img src={student.avatar} alt={student.studentName} className="h-8 w-8 rounded-full" />
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{student.studentName}</p>
                                <p className="text-xs text-warning-700 dark:text-warning-300">{student.absences} recent absences</p>
                            </div>
                        </div>
                    </div>
                )) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No students are currently at-risk.</p>}
            </div>
             {students.length > 0 && (
                <button onClick={() => navigate('/teacher/at-risk')} className="mt-4 w-full text-sm font-semibold text-primary-600 hover:underline">
                    View All
                </button>
            )}
        </div>
    );
};

const CancellationRequestsCard: React.FC<{ requests: (CancellationRequest & { studentName?: string; sessionDate?: Date })[] }> = ({ requests }) => {
    const navigate = useNavigate();
    
    if (requests.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <CalendarIcon className="h-6 w-6 mr-3 text-info-500" />
                Pending Requests ({requests.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {requests.slice(0, 5).map(req => (
                    <div key={req.id} className="p-3 bg-info-50 dark:bg-info-800/20 rounded-lg">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{req.studentName}</p>
                        <p className="text-xs text-info-700 dark:text-info-300">Cancellation for {req.sessionDate?.toLocaleDateString()}</p>
                    </div>
                ))}
            </div>
             <button onClick={() => navigate('/teacher/schedule')} className="mt-4 w-full text-sm font-semibold text-primary-600 hover:underline">
                Review Requests
            </button>
        </div>
    );
};


const AssignmentsToGradeCard: React.FC<{ assignments: Assignment[], userMap: Map<string, User>, programMap: Map<string, Program> }> = ({ assignments, userMap, programMap }) => {
    const navigate = useNavigate();

    return (
        <div onClick={() => navigate('/teacher/grading')} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <ClipboardDocumentCheckIcon className="h-6 w-6 mr-3 text-primary-500" />
                Assignments to Grade ({assignments.length})
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {assignments.length > 0 ? assignments.map(assignment => {
                    const student = userMap.get(assignment.studentId);
                    const program = programMap.get(assignment.programId);
                    return (
                        <div key={assignment.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{assignment.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {student ? `${student.firstName} ${student.lastName}` : ''} - {program?.title}
                                {assignment.status === AssignmentStatus.SUBMITTED_LATE && <span className="ml-2 text-red-500 font-bold">LATE</span>}
                            </p>
                        </div>
                    )
                }) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">All caught up!</p>
                )}
            </div>
        </div>
    );
};

const SummariesNeededCard: React.FC<{ sessions: Session[], userMap: Map<string, User>, programMap: Map<string, Program> }> = ({ sessions, userMap, programMap }) => {
    const navigate = useNavigate();
    
    if (sessions.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <PencilSquareIcon className="h-6 w-6 mr-3 text-primary-500" />
                Complete Your Summaries
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                 {sessions.map(session => {
                    const student = session.studentId ? userMap.get(session.studentId) : undefined;
                    const program = programMap.get(session.programId);
                    const sessionDate = new Date(session.start).toLocaleDateString();
                    return (
                        <div key={session.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{program?.title || 'Session'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    with {student ? `${student.firstName} ${student.lastName}` : 'Student'} on {sessionDate}
                                </p>
                            </div>
                            <button onClick={() => navigate('/teacher/schedule')} className="px-3 py-1 text-xs font-semibold text-white bg-primary-500 rounded-full hover:bg-primary-600">
                                Add Summary
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};


const TeacherDashboardPage: React.FC = () => {
    const { user: teacher } = useAuth();
    const { settings } = useSettings();
    
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!teacher) {
                setIsLoading(false);
                return;
            };
            
            setIsLoading(true);
            
            const [allSessions, allAssignments, allEnrollments, allUsers, allCancellationRequests, allPrograms] = await Promise.all([
                getSessions(), getAssignments(), getEnrollments(), getUsers(), getCancellationRequests(), getPrograms()
            ]);

            const userMap = new Map(allUsers.map(u => [u.id, u]));
            const programMap = new Map(allPrograms.map(p => [p.id, p]));
            
            const myEnrollments = allEnrollments.filter(e => e.teacherId === teacher.id && e.status === EnrollmentStatus.ACTIVE);
            const myStudentIds = new Set(myEnrollments.map(e => e.studentId));
            
            const mySessions = allSessions.filter(s => s.teacherId === teacher.id);
            const mySessionIds = new Set(mySessions.map(s => s.id));

            const now = new Date();
            const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            // KPI Calculations
            const activeStudents = myStudentIds.size;
            const completedSessions = mySessions.filter(s => s.status === SessionStatus.COMPLETED).length;
            const absentSessions = mySessions.filter(s => s.status === SessionStatus.ABSENT).length;
            const totalAccountable = completedSessions + absentSessions;
            const completionRate = totalAccountable > 0 ? Math.round((completedSessions / totalAccountable) * 100) : 100;
            const upcomingSessionsCount = mySessions.filter(s => new Date(s.start) > now && new Date(s.start) <= oneWeekFromNow).length;

            // Card Data Calculations
            const nextSession = mySessions
                .filter(s => new Date(s.start) > now)
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

            const assignmentsToGrade = allAssignments.filter(a => 
                myStudentIds.has(a.studentId) && (a.status === AssignmentStatus.PENDING_GRADING || a.status === AssignmentStatus.SUBMITTED_LATE)
            );
            
            const sessionsNeedingSummary = mySessions
                .filter(s => {
                    const sessionDate = new Date(s.start);
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return s.status === SessionStatus.COMPLETED && !s.parentSummary && sessionDate > sevenDaysAgo;
                })
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            
            let atRiskStudents: { studentId: string; studentName: string; avatar?: string; absences: number }[] = [];
            if (settings.studentAtRisk.enabled) {
                const periodDaysAgo = new Date();
                periodDaysAgo.setDate(periodDaysAgo.getDate() - settings.studentAtRisk.missedSessions.periodDays);
                
                const studentAbsenceCount = allSessions
                    .filter(s => s.status === SessionStatus.ABSENT && new Date(s.start) >= periodDaysAgo && s.studentId && myStudentIds.has(s.studentId))
                    .reduce((acc, session) => {
                        if (session.studentId) acc[session.studentId] = (acc[session.studentId] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                atRiskStudents = Object.entries(studentAbsenceCount)
                    .filter(([_, count]) => count >= settings.studentAtRisk.missedSessions.count)
                    .map(([studentId, absences]) => {
                        const student = allUsers.find(u => u.id === studentId);
                        return { studentId, studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown', avatar: student?.avatar, absences };
                    });
            }
            
            const cancellationRequests = allCancellationRequests
                .filter(r => r.status === 'pending' && mySessionIds.has(r.sessionId))
                .map(req => {
                    const student = userMap.get(req.studentId);
                    const session = mySessions.find(s => s.id === req.sessionId);
                    return { ...req, studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown', sessionDate: session ? new Date(session.start) : undefined };
                });

            setDashboardData({ 
                nextSession, assignmentsToGrade, sessionsNeedingSummary, atRiskStudents, cancellationRequests, 
                userMap, programMap,
                kpis: { activeStudents, completionRate, upcomingSessionsCount }
            });
            setIsLoading(false);
        };
        fetchData();
    }, [teacher, settings.studentAtRisk]);

    if (isLoading || !dashboardData) {
        return <SkeletonLoader type="dashboard" />;
    }
    
    const { kpis, userMap, programMap } = dashboardData;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Teacher Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's an overview of your teaching activities.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Active Students" value={kpis.activeStudents} icon={UserGroupIcon} />
                <StatCard title="Avg. Completion Rate" value={`${kpis.completionRate}%`} icon={ClipboardDocumentCheckIcon} />
                <StatCard title="Upcoming Sessions (Week)" value={kpis.upcomingSessionsCount} icon={CalendarIcon} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                    <NextSessionCard session={dashboardData.nextSession} userMap={userMap} programMap={programMap} />
                    <AtRiskStudentsCard students={dashboardData.atRiskStudents} />
                    <CancellationRequestsCard requests={dashboardData.cancellationRequests} />
                </div>
                <div className="space-y-8">
                    <AssignmentsToGradeCard assignments={dashboardData.assignmentsToGrade} userMap={userMap} programMap={programMap} />
                    <SummariesNeededCard sessions={dashboardData.sessionsNeedingSummary} userMap={userMap} programMap={programMap} />
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboardPage;
