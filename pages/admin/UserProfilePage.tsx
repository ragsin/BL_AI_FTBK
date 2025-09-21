import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Enrollment, Session, Role, Assignment, AssignmentStatus, CurriculumProgress, CurriculumItem, CurriculumStatus, EnrollmentStatus, Program, SessionType, CreditTransaction, AvailabilitySlot, Unavailability, ProgramStatus, SessionStatus } from '../../types';
import { ArrowLeftIcon, UserCircleIcon, AcademicCapIcon, CalendarIcon, BanknotesIcon, ClipboardDocumentCheckIcon, BookOpenIcon, CheckCircleIcon, ChevronRightIcon, UsersIcon, PencilSquareIcon, ScaleIcon, ClockIcon, EyeIcon, ExclamationTriangleIcon } from '../../components/icons/Icons';
import SessionFormModal from '../../components/SessionFormModal';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

import { getEnrollments, saveEnrollments, getCreditTransactions, saveCreditTransactions } from '../../api/enrollmentApi';
import { getSessions, saveSessions, getAssignments, saveAssignments } from '../../api/sessionApi';
import { getUsers, getAvailability, getUnavailability } from '../../api/userApi';
import { getPrograms, getCurriculumProgress, saveCurriculumProgress } from '../../api/programApi';
import SkeletonLoader from '../../components/SkeletonLoader';

interface ProfileData {
    user: User;
    allUsers: User[];
    allPrograms: Program[];
    allEnrollments: Enrollment[];
    allSessions: Session[];
    allAvailability: AvailabilitySlot[];
    allUnavailability: Unavailability[];
    userEnrollments: Enrollment[];
    credits: number;
    assignedStudents: User[];
    programsTaught: Program[];
    attendanceRate: number;
    absentSessions: number;
    sessionsThisMonth: number;
    completionRate: number;
    availability: AvailabilitySlot[];
    unavailability: Unavailability[];
    assignmentsToGrade: Assignment[];
    atRiskStudents: { student: User, absences: number }[];
    children: User[];
    totalFamilyCredits: number;
}


const StatusBadge: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
    const statusColors: Record<AssignmentStatus, string> = {
        [AssignmentStatus.GRADED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [AssignmentStatus.PENDING_GRADING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        [AssignmentStatus.SUBMITTED_LATE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [AssignmentStatus.NOT_SUBMITTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>;
};

// --- INTERACTIVE CURRICULUM COMPONENT ---
const statusInfo: Record<CurriculumStatus, { bg: string, text: string, ring: string, icon: React.ElementType, options: CurriculumStatus[] }> = {
    [CurriculumStatus.COMPLETED]: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-300', icon: CheckCircleIcon, options: [CurriculumStatus.IN_PROGRESS, CurriculumStatus.LOCKED] },
    [CurriculumStatus.IN_PROGRESS]: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-300', icon: () => <span className="font-bold">...</span>, options: [CurriculumStatus.COMPLETED, CurriculumStatus.LOCKED] },
    [CurriculumStatus.LOCKED]: { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-500 dark:text-gray-400', ring: 'ring-gray-300', icon: () => <span className="font-bold">🔒</span>, options: [CurriculumStatus.IN_PROGRESS, CurriculumStatus.COMPLETED] },
};

const updateStructure = (structure: CurriculumItem[], itemId: string, newStatus: CurriculumStatus): CurriculumItem[] => {
    let itemFound = false;
    const updateChildren = (items: CurriculumItem[], status: CurriculumStatus): CurriculumItem[] => {
        return items.map(item => ({ ...item, status: status, children: item.children ? updateChildren(item.children, status) : [] }));
    };
    const update = (items: CurriculumItem[]): CurriculumItem[] => {
        return items.map(item => {
            if (item.id === itemId) {
                itemFound = true;
                return { ...item, status: newStatus, children: newStatus === CurriculumStatus.COMPLETED && item.children ? updateChildren(item.children, CurriculumStatus.COMPLETED) : item.children };
            }
            if (item.children) return { ...item, children: update(item.children) };
            return item;
        });
    };
    let newStructure = update(structure);
    if (!itemFound) return structure;
    const updateParents = (items: CurriculumItem[]): CurriculumItem[] => {
        return items.map(parent => {
            if (!parent.children || parent.children.length === 0) return parent;
            const updatedChildren = updateParents(parent.children);
            const allChildrenCompleted = updatedChildren.every(c => c.status === CurriculumStatus.COMPLETED);
            const anyChildInProgress = updatedChildren.some(c => c.status === CurriculumStatus.IN_PROGRESS);
            let newParentStatus = parent.status;
            if (allChildrenCompleted) newParentStatus = CurriculumStatus.COMPLETED;
            else if (anyChildInProgress || updatedChildren.some(c => c.status === CurriculumStatus.COMPLETED)) newParentStatus = CurriculumStatus.IN_PROGRESS;
            else newParentStatus = CurriculumStatus.LOCKED;
            return { ...parent, status: newParentStatus, children: updatedChildren };
        });
    };
    return updateParents(newStructure);
};

const InteractiveCurriculumNode: React.FC<{ item: CurriculumItem; onStatusChange: (itemId: string, newStatus: CurriculumStatus) => void; isEditing: boolean; }> = ({ item, onStatusChange, isEditing }) => {
    const { icon: Icon } = statusInfo[item.status];
    return (
    <div>
        <div className="flex items-center p-3 rounded-t-lg bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center space-x-3 flex-grow">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full ${statusInfo[item.status].ring} ring-1 flex items-center justify-center font-bold text-lg ${statusInfo[item.status].text}`}><Icon className="h-6 w-6"/></div>
                <div><p className="font-bold text-gray-800 dark:text-white">{item.title}</p><p className="text-xs text-gray-500 dark:text-gray-400">{item.children?.length || 0} topics</p></div>
            </div>
            {isEditing ? (
                <select value={item.status} onChange={(e) => onStatusChange(item.id, e.target.value as CurriculumStatus)} className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 py-1 px-2">
                    <option value={item.status}>{item.status}</option>{statusInfo[item.status].options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo[item.status].bg} ${statusInfo[item.status].text}`}>{item.status}</span>
            )}
        </div>
        <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-600 ml-4 space-y-2 py-2 rounded-b-lg bg-gray-100 dark:bg-gray-800">
            {item.children?.length ? item.children.map(topic => (
                <div key={topic.id} className={`flex items-center justify-between p-2 rounded-lg ${statusInfo[topic.status].bg}`}>
                    <p className={`font-semibold text-sm ${statusInfo[topic.status].text}`}>{topic.title}</p>
                    {isEditing ? (
                        <select value={topic.status} onChange={(e) => onStatusChange(topic.id, e.target.value as CurriculumStatus)} className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 py-1 px-2">
                            <option value={topic.status}>{topic.status}</option>{statusInfo[topic.status].options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo[topic.status].bg} ${statusInfo[topic.status].text}`}>{topic.status}</span>
                    )}
                </div>
            )) : <p className="text-xs text-gray-500 italic pl-2">No topics in this chapter.</p>}
        </div>
    </div>
    );
};
// --- END INTERACTIVE CURRICULUM COMPONENT ---

const AdminEnrollmentItem: React.FC<{ enrollment: Enrollment; isEditable: boolean; onCurriculumUpdate: (enrollmentId: string, structure: CurriculumItem[]) => void; programMap: Map<string, string>; userMap: Map<string, string>; }> = ({ enrollment, isEditable, onCurriculumUpdate, programMap, userMap }) => {
    const [curriculum, setCurriculum] = useState<CurriculumProgress | null>(null);
    
    useEffect(() => {
        const fetchProgress = async () => {
            const allProgress = await getCurriculumProgress();
            setCurriculum(allProgress[enrollment.id]);
        };
        fetchProgress();
    }, [enrollment.id]);

    const [isEditingCurriculum, setIsEditingCurriculum] = useState(false);
    const [draftStructure, setDraftStructure] = useState<CurriculumItem[]>([]);
    const [isJourneyOpen, setIsJourneyOpen] = useState(false);
    const { addToast } = useToast();
    
    useEffect(() => {
        setDraftStructure(curriculum ? JSON.parse(JSON.stringify(curriculum.structure)) : []);
    }, [curriculum]);

    const handleStartEditing = () => setIsEditingCurriculum(true);
    const handleSaveChanges = () => { onCurriculumUpdate(enrollment.id, draftStructure); addToast('Curriculum progress updated!'); setIsEditingCurriculum(false); };
    const handleCancelEdit = () => { setDraftStructure(curriculum ? JSON.parse(JSON.stringify(curriculum.structure)) : []); setIsEditingCurriculum(false); };
    const handleDraftUpdate = (itemId: string, newStatus: CurriculumStatus) => {
        setDraftStructure(prev => updateStructure(prev, itemId, newStatus));
    };
    
    const { percentage } = useMemo(() => {
        const source = isEditingCurriculum ? draftStructure : curriculum?.structure;
        let total = 0, completed = 0;
        const traverse = (items: CurriculumItem[]) => {
            items.forEach(item => {
                total++;
                if (item.status === CurriculumStatus.COMPLETED) completed++;
                if (item.children) traverse(item.children);
            });
        };
        if (source) traverse(source);
        return { percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [curriculum, draftStructure, isEditingCurriculum]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{programMap.get(enrollment.programId)}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Teacher: <Link to={`/admin/users/${enrollment.teacherId}`} className="text-primary-600 hover:underline ml-1">{userMap.get(enrollment.teacherId)}</Link></p>
                </div>
                <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${enrollment.status === EnrollmentStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{enrollment.status}</span>
                    <span className="text-sm font-semibold">{enrollment.creditsRemaining} Credits</span>
                </div>
            </div>
            {curriculum && (
                 <div className="mt-4 space-y-2">
                    <div className="cursor-pointer group" onClick={() => setIsJourneyOpen(!isJourneyOpen)}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Learning Journey</span>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{percentage}%</span>
                                <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform ${isJourneyOpen ? 'rotate-90' : ''}`} />
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                    {isJourneyOpen && (
                        <div className="pt-4 space-y-4">
                            <div className="flex justify-end items-center mb-2">
                                {isEditable && !isEditingCurriculum && (
                                    <button onClick={handleStartEditing} className="px-3 py-1 text-xs font-semibold text-white bg-primary-500 rounded-full hover:bg-primary-600">Edit Progress</button>
                                )}
                                {isEditable && isEditingCurriculum && (
                                    <div className="flex items-center space-x-2">
                                        <button onClick={handleCancelEdit} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300">Cancel</button>
                                        <button onClick={handleSaveChanges} className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-full hover:bg-green-600">Save Changes</button>
                                    </div>
                                )}
                            </div>
                            {draftStructure.length > 0 ? (
                                draftStructure.map(chapter => (
                                    <InteractiveCurriculumNode key={chapter.id} item={chapter} onStatusChange={handleDraftUpdate} isEditing={isEditingCurriculum} />
                                ))
                            ) : <p className="text-gray-500 text-center text-sm">No curriculum structure defined for this program.</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const UserProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { addToast } = useToast();
    const { user: currentUser, impersonate } = useAuth();
    const { settings, formatCurrency } = useSettings();
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);

    const fetchData = async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }

        const [allUsers, allPrograms, allEnrollments, allSessions, allAssignments, allAvailability, allUnavailability, allCurriculumProgress] = await Promise.all([
            getUsers(), getPrograms(), getEnrollments(), getSessions(), getAssignments(), getAvailability(), getUnavailability(), getCurriculumProgress()
        ]);

        const user = allUsers.find(u => u.id === userId);
        if (!user) {
            setIsLoading(false);
            return;
        }

        const baseData: any = { user, allUsers, allPrograms, allEnrollments, allSessions, allAvailability, allUnavailability, userEnrollments: [], credits: 0, assignedStudents: [], programsTaught: [], attendanceRate: 0, absentSessions: 0, sessionsThisMonth: 0, completionRate: 0, availability: [], unavailability: [], assignmentsToGrade: [], atRiskStudents: [], children: [], totalFamilyCredits: 0 };
        
        if (user.role === Role.STUDENT) {
            baseData.userEnrollments = allEnrollments.filter(e => e.studentId === userId);
            const studentSessions = allSessions.filter(s => s.studentId === userId);
            
            const activeEnrollments = baseData.userEnrollments.filter((e: Enrollment) => e.status === EnrollmentStatus.ACTIVE);
            baseData.credits = activeEnrollments.reduce((total: number, e: Enrollment) => total + e.creditsRemaining, 0);

            const completedSessions = studentSessions.filter(s => s.status === SessionStatus.COMPLETED).length;
            const absentSessions = studentSessions.filter(s => s.status === SessionStatus.ABSENT).length;
            const totalAccountableSessions = completedSessions + absentSessions;
            baseData.attendanceRate = totalAccountableSessions > 0 ? Math.round((completedSessions / totalAccountableSessions) * 100) : 100;
            baseData.absentSessions = absentSessions;

        } else if (user.role === Role.TEACHER) {
            const teacherSessions = allSessions.filter(s => s.teacherId === userId);
            const teacherEnrollments = allEnrollments.filter((e: Enrollment) => e.teacherId === userId && e.status === EnrollmentStatus.ACTIVE);
            const activeStudentIds = new Set(teacherEnrollments.map(e => e.studentId));
            baseData.assignedStudents = allUsers.filter(u => activeStudentIds.has(u.id));
            const programIdsTaught = [...new Set(teacherEnrollments.map(e => e.programId))];
            baseData.programsTaught = allPrograms.filter(p => programIdsTaught.includes(p.id));
            
            const now = new Date();
            baseData.sessionsThisMonth = teacherSessions.filter(s => s.status === SessionStatus.COMPLETED && new Date(s.start).getMonth() === now.getMonth() && new Date(s.start).getFullYear() === now.getFullYear()).length;
            const completedTeacherSessions = teacherSessions.filter(s => s.status === SessionStatus.COMPLETED).length;
            const absentTeacherSessions = teacherSessions.filter(s => s.status === SessionStatus.ABSENT).length;
            const totalAccountableTeacherSessions = completedTeacherSessions + absentTeacherSessions;
            baseData.completionRate = totalAccountableTeacherSessions > 0 ? Math.round((completedTeacherSessions / totalAccountableTeacherSessions) * 100) : 100;

            baseData.availability = allAvailability.filter(a => a.teacherId === userId);
            baseData.unavailability = allUnavailability.filter(u => u.teacherId === userId && new Date(u.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            baseData.assignmentsToGrade = allAssignments.filter(a => activeStudentIds.has(a.studentId) && (a.status === AssignmentStatus.PENDING_GRADING || a.status === AssignmentStatus.SUBMITTED_LATE));
            
            if (settings.studentAtRisk.enabled) {
                const periodDaysAgo = new Date();
                periodDaysAgo.setDate(periodDaysAgo.getDate() - settings.studentAtRisk.missedSessions.periodDays);
                const studentAbsenceCount = allSessions.filter(s => s.status === SessionStatus.ABSENT && new Date(s.start) >= periodDaysAgo && activeStudentIds.has(s.studentId!)).reduce((acc, session) => {
                    if (session.studentId) acc[session.studentId] = (acc[session.studentId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                baseData.atRiskStudents = Object.entries(studentAbsenceCount).filter(([_, count]) => count >= settings.studentAtRisk.missedSessions.count).map(([studentId, absences]) => ({
                    student: allUsers.find(u => u.id === studentId),
                    absences
                }));
            }

        } else if (user.role === Role.PARENT) {
            baseData.children = allUsers.filter(u => user.childrenIds?.includes(u.id));
            const childIds = new Set(user.childrenIds || []);
            const childActiveEnrollments = allEnrollments.filter(e => childIds.has(e.studentId) && e.status === EnrollmentStatus.ACTIVE);
            baseData.totalFamilyCredits = childActiveEnrollments.reduce((sum, e) => sum + e.creditsRemaining, 0);
        }
        
        setProfileData(baseData as ProfileData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [userId, settings.studentAtRisk]);

    const userMap = useMemo(() => new Map(profileData?.allUsers.map((u: User) => [u.id, `${u.firstName} ${u.lastName}`]) || []), [profileData]);
    const programMap = useMemo(() => new Map(profileData?.allPrograms.map((p: Program) => [p.id, p.title]) || []), [profileData]);


    const [expandedChildId, setExpandedChildId] = useState<string | null>(null);

    const handleCurriculumUpdate = async (enrollmentId: string, newStructure: CurriculumItem[]) => {
        if (!profileData) return;
        const allProgress = await getCurriculumProgress();
        const programTitle = programMap.get(profileData.allEnrollments.find((e: Enrollment) => e.id === enrollmentId)?.programId || '') || '';
        const updatedProgress = { ...(allProgress[enrollmentId] || { enrollmentId, programTitle: '' }), enrollmentId, programTitle, structure: newStructure };
        const newAllProgress = { ...allProgress, [enrollmentId]: updatedProgress };
        await saveCurriculumProgress(newAllProgress as Record<string, CurriculumProgress>);
        fetchData();
    };

    const handleSaveSession = async (sessionData: Session) => {
        if (!profileData) return;
        const newSession = { ...sessionData, id: `s-${Date.now()}` };
        await saveSessions([...profileData.allSessions, newSession]);
        addToast(`Session scheduled successfully!`);
        setIsSessionModalOpen(false);
        fetchData();
    };

    const handleCancelSession = async (sessionToCancel: Session) => {
        if (!profileData) return;
        const enrollment = profileData.allEnrollments.find((e: Enrollment) => e.studentId === sessionToCancel.studentId && e.programId === sessionToCancel.programId);
        if (enrollment) {
            const newEnrollments = profileData.allEnrollments.map((e: Enrollment) => e.id === enrollment.id ? { ...e, creditsRemaining: e.creditsRemaining + 1 } : e);
            await saveEnrollments(newEnrollments);
        }
        const updatedSessions = profileData.allSessions.map((s: Session) => s.id === sessionToCancel.id ? { ...s, status: SessionStatus.CANCELLED } : s);
        await saveSessions(updatedSessions);
        addToast('Session cancelled and credit refunded.');
        setIsSessionModalOpen(false);
        fetchData();
    };

    if (isLoading) {
        return <SkeletonLoader type="dashboard" />;
    }

    if (!profileData || !profileData.user) {
        return <div className="text-center p-8">User not found. It may have been moved, edited, or deleted.</div>;
    }

    const { user } = profileData;
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const availabilityByDay = profileData.availability.reduce((acc: Record<number, string[]>, slot: AvailabilitySlot) => {
        (acc[slot.dayOfWeek] = acc[slot.dayOfWeek] || []).push(`${slot.startTime} - ${slot.endTime}`);
        return acc;
    }, {});


    const InfoCard: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode, noPadding?: boolean }> = ({ icon: Icon, title, children, noPadding = false }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
                <Icon className="h-6 w-6 text-primary-500" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
            </div>
            <div className={noPadding ? '' : 'p-4'}>{children}</div>
        </div>
    );

    const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; subtext?: string }> = ({ title, value, icon: Icon, subtext }) => (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-center space-x-4">
            <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-lg">
                <Icon className="h-6 w-6 text-primary-500" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
                {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
            </div>
        </div>
    );

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                        <Link to="/admin/users" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Go back to users"><ArrowLeftIcon className="h-6 w-6" /></Link>
                        <div className="flex flex-col sm:flex-row items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-4">
                            <img className="h-20 w-20 rounded-full" src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                            <div>
                                <div className="flex items-center space-x-3">
                                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{user.firstName} {user.lastName}</h1>
                                    <button onClick={() => impersonate(user)} disabled={currentUser?.id === user.id} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" title={`Impersonate ${user.firstName}`}><EyeIcon className="h-6 w-6" /></button>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">{user.role}</p>
                            </div>
                        </div>
                    </div>
                     {user.role === Role.STUDENT && (
                        <button onClick={() => setIsSessionModalOpen(true)} className="flex items-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"><CalendarIcon className="h-5 w-5 mr-2" />Schedule Session</button>
                    )}
                </div>

                {user.role === Role.STUDENT && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <InfoCard icon={UserCircleIcon} title="Student Details">
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Email</dt><dd className="text-gray-900 dark:text-white truncate">{user.email}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Phone</dt><dd className="text-gray-900 dark:text-white">{user.phone || 'N/A'}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Grade</dt><dd className="text-gray-900 dark:text-white">{user.grade}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Timezone</dt><dd className="text-gray-900 dark:text-white">{user.timezone}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Parent</dt><dd className="text-gray-900 dark:text-white">{user.parentId ? (<Link to={`/admin/users/${user.parentId}`} className="text-primary-600 hover:underline">{userMap.get(user.parentId)}</Link>) : ('N/A')}</dd></div>
                                </dl>
                            </InfoCard>
                            <div className="grid grid-cols-2 gap-4">
                                <StatCard title="Credits" value={profileData.credits} icon={BanknotesIcon} />
                                <StatCard title="Attendance" value={`${profileData.attendanceRate}%`} icon={ClipboardDocumentCheckIcon} subtext={`${profileData.absentSessions} absences`} />
                            </div>
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                            {profileData.userEnrollments.map((enrollment: Enrollment) => (
                                <AdminEnrollmentItem key={enrollment.id} enrollment={enrollment} isEditable={true} onCurriculumUpdate={handleCurriculumUpdate} programMap={programMap} userMap={userMap} />
                            ))}
                        </div>
                    </div>
                )}

                 {user.role === Role.TEACHER && (
                    <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Active Students" value={profileData.assignedStudents.length} icon={UsersIcon} />
                            <StatCard title="Completion Rate" value={`${profileData.completionRate}%`} icon={ScaleIcon} />
                            <StatCard title="Sessions This Month" value={profileData.sessionsThisMonth} icon={CalendarIcon} />
                            <StatCard title="Avg. Grading Time" value="2.3 Days" icon={ClockIcon} />
                        </div>
                         <InfoCard icon={ClipboardDocumentCheckIcon} title="Action Center"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div><h4 className="font-semibold mb-2">Grading Queue ({profileData.assignmentsToGrade.length})</h4><div className="space-y-2 max-h-48 overflow-y-auto pr-2">{profileData.assignmentsToGrade.length > 0 ? profileData.assignmentsToGrade.map((a: Assignment) => (<div key={a.id} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm"><p className="font-medium">{a.title}</p><p className="text-xs text-gray-500">{userMap.get(a.studentId)} - Due: {a.dueDate}</p></div>)) : <p className="text-sm text-gray-400 italic">No assignments to grade.</p>}</div></div>
                            <div><h4 className="font-semibold mb-2 flex items-center"><ExclamationTriangleIcon className="h-5 w-5 mr-2 text-warning-500" /> At-Risk Students ({profileData.atRiskStudents.length})</h4><div className="space-y-2 max-h-48 overflow-y-auto pr-2">{profileData.atRiskStudents.length > 0 ? profileData.atRiskStudents.map((s: any) => (<div key={s.student.id} className="p-2 bg-warning-50 dark:bg-warning-800/20 rounded-md text-sm"><div className="flex justify-between"><p className="font-medium">{s.student.firstName} {s.student.lastName}</p><p className="font-bold text-warning-700 dark:text-warning-300">{s.absences} Absences</p></div></div>)) : <p className="text-sm text-gray-400 italic">No students are currently at-risk.</p>}</div></div>
                        </div></InfoCard>
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-6">
                                <InfoCard icon={UserCircleIcon} title="Teacher Details"><dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Email</dt><dd className="text-gray-900 dark:text-white truncate">{user.email}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Phone</dt><dd className="text-gray-900 dark:text-white">{user.phone || 'N/A'}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Timezone</dt><dd className="text-gray-900 dark:text-white">{user.timezone || 'N/A'}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Expertise</dt><dd className="text-gray-900 dark:text-white">{user.expertise || 'N/A'}</dd></div>
                                </dl></InfoCard>
                                <InfoCard icon={ClockIcon} title="Availability"><div className="space-y-3"><div><h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Weekly Hours</h4><div className="mt-2 space-y-1">{daysOfWeek.map((day, index) => (availabilityByDay[index] && (<div key={day} className="flex justify-between text-xs"><span className="font-bold">{day}:</span><span>{availabilityByDay[index].join(', ')}</span></div>)))}</div></div><div><h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Upcoming Unavailability</h4><div className="mt-2 space-y-1 text-xs">{profileData.unavailability.length > 0 ? profileData.unavailability.map((u: Unavailability) => (<div key={u.id}><strong>{u.date}:</strong> {u.notes}</div>)) : <p className="italic text-gray-400">No upcoming dates marked.</p>}</div></div></div></InfoCard>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                 <InfoCard icon={AcademicCapIcon} title="Assigned Students & Programs"><ul className="space-y-2 max-h-96 overflow-y-auto">{profileData.programsTaught.map((p: Program) => (<li key={p.id}><details className="group"><summary className="flex items-center justify-between cursor-pointer list-none"><span className="text-sm font-medium">{p.title}</span><ChevronRightIcon className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-90" /></summary><div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-600"><p className="text-xs font-semibold text-gray-500 mb-1">Students:</p><ul className="space-y-1">{profileData.assignedStudents.filter((s: User) => profileData.allEnrollments.some((e: Enrollment) => e.studentId === s.id && e.programId === p.id && e.teacherId === user.id)).map((s: User) => (<li key={s.id}><Link to={`/admin/users/${s.id}`} className="text-xs text-primary-600 hover:underline">{s.firstName} {s.lastName}</Link></li>))}</ul></div></details></li>))}</ul></InfoCard>
                            </div>
                        </div>
                    </div>
                 )}

                {user.role === Role.PARENT && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <InfoCard icon={UserCircleIcon} title="Parent Information">
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Email</dt><dd className="text-gray-900 dark:text-white truncate">{user.email}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Phone</dt><dd className="text-gray-900 dark:text-white">{user.phone || 'N/A'}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Timezone</dt><dd className="text-gray-900 dark:text-white">{user.timezone}</dd></div>
                                    <div className="flex justify-between"><dt className="font-medium text-gray-500">Total Credits</dt><dd className="font-bold text-gray-900 dark:text-white">{profileData.totalFamilyCredits}</dd></div>
                                </dl>
                            </InfoCard>
                             <InfoCard icon={BookOpenIcon} title="Notification Preferences">
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center justify-between"><span className="text-gray-700 dark:text-gray-300">Session Summaries</span><span className={`font-semibold ${user.notificationPreferences?.sessionSummaries ? 'text-green-600' : 'text-red-600'}`}>{user.notificationPreferences?.sessionSummaries ? 'Enabled' : 'Disabled'}</span></li>
                                    <li className="flex items-center justify-between"><span className="text-gray-700 dark:text-gray-300">Assignment Graded</span><span className={`font-semibold ${user.notificationPreferences?.assignmentGraded ? 'text-green-600' : 'text-red-600'}`}>{user.notificationPreferences?.assignmentGraded ? 'Enabled' : 'Disabled'}</span></li>
                                    <li className="flex items-center justify-between"><span className="text-gray-700 dark:text-gray-300">Low Credit Alerts</span><span className={`font-semibold ${user.notificationPreferences?.lowCreditAlerts ? 'text-green-600' : 'text-red-600'}`}>{user.notificationPreferences?.lowCreditAlerts ? 'Enabled' : 'Disabled'}</span></li>
                                </ul>
                            </InfoCard>
                        </div>
                        <InfoCard icon={UsersIcon} title="Family Management Hub" noPadding>
                            <div className="p-4 space-y-4">
                                {profileData.children.map((child: User) => {
                                    const childEnrollments = profileData.allEnrollments.filter((e: Enrollment) => e.studentId === child.id);
                                    const isExpanded = expandedChildId === child.id;
                                    return (
                                        <div key={child.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedChildId(isExpanded ? null : child.id)}>
                                                <div className="flex items-center space-x-3">
                                                    <img src={child.avatar} alt={child.firstName} className="h-10 w-10 rounded-full" />
                                                    <div>
                                                        <Link to={`/admin/users/${child.id}`} className="font-semibold text-gray-800 dark:text-white hover:underline">{child.firstName} {child.lastName}</Link>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{childEnrollments.filter((e: Enrollment) => e.status === 'Active').length} active programs</p>
                                                    </div>
                                                </div>
                                                <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </div>
                                            {isExpanded && (
                                                <div className="p-4 border-t border-gray-200 dark:border-gray-600 space-y-4">
                                                    {childEnrollments.length > 0 ? childEnrollments.map((enrollment: Enrollment) => (
                                                        <AdminEnrollmentItem key={enrollment.id} enrollment={enrollment} isEditable={false} onCurriculumUpdate={handleCurriculumUpdate} programMap={programMap} userMap={userMap} />
                                                    )) : <p className="text-sm text-center text-gray-500">No enrollments for this child.</p>}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </InfoCard>
                    </div>
                )}
            </div>
             {isSessionModalOpen && user.role === Role.STUDENT && (
                <SessionFormModal
                    isOpen={isSessionModalOpen}
                    onClose={() => setIsSessionModalOpen(false)}
                    onSave={async (sessionData, options) => await handleSaveSession(sessionData)}
                    onCancel={async (sessionToCancel, scope) => await handleCancelSession(sessionToCancel)}
                    session={null} sessions={profileData.allSessions} dateInfo={null} students={[user]}
                    teachers={profileData.allUsers.filter((u: User) => u.role === Role.TEACHER)} programs={profileData.allPrograms}
                    enrollments={profileData.allEnrollments} availability={profileData.allAvailability} unavailability={profileData.allUnavailability}
                    lockedStudentId={user.id}
                />
            )}
        </>
    );
};

export default UserProfilePage;