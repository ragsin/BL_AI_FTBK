import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StudentDetails, Assignment, AssignmentStatus, CurriculumItem, CurriculumStatus, SessionStatus, Session, CurriculumProgress, User, Program, Enrollment, EnrollmentStatus } from '../../types';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, PencilSquareIcon, CheckCircleIcon, CalendarIcon, ScaleIcon } from '../../components/icons/Icons';
import { getUsers } from '../../api/userApi';
import { getPrograms, getCurriculumProgress, saveCurriculumProgress } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getAssignments, saveAssignments, getSessions } from '../../api/sessionApi';
import { logAction } from '../../api/auditApi';
import AssignmentFormModal from '../../components/AssignmentFormModal';
import { useToast } from '../../contexts/ToastContext';

type SortConfig = { key: keyof StudentDetails; direction: 'ascending' | 'descending'; } | null;

const gradeToNumeric = (grade?: string): number | null => {
    if (!grade) return null;
    const trimmedGrade = grade.trim();
    if (trimmedGrade.endsWith('%')) {
        return parseFloat(trimmedGrade.replace('%', ''));
    }
    const gradeMap: { [key: string]: number } = {
        'A+': 98, 'A': 95, 'A-': 92, 'B+': 88, 'B': 85, 'B-': 82,
        'C+': 78, 'C': 75, 'C-': 72, 'D+': 68, 'D': 65, 'D-': 62, 'F': 50,
    };
    return gradeMap[trimmedGrade.toUpperCase()] || null;
};

const StatusBadge: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
    const statusColors: Record<AssignmentStatus, string> = {
        [AssignmentStatus.GRADED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [AssignmentStatus.PENDING_GRADING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        [AssignmentStatus.SUBMITTED_LATE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [AssignmentStatus.NOT_SUBMITTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status.replace('_', ' ')}</span>;
};


// --- INTERACTIVE CURRICULUM COMPONENT ---

const statusInfo: Record<CurriculumStatus, { bg: string, text: string, ring: string, icon: React.ElementType, options: CurriculumStatus[] }> = {
    [CurriculumStatus.COMPLETED]: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-300', icon: CheckCircleIcon, options: [CurriculumStatus.IN_PROGRESS, CurriculumStatus.LOCKED] },
    [CurriculumStatus.IN_PROGRESS]: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-300', icon: () => <span className="font-bold">...</span>, options: [CurriculumStatus.COMPLETED, CurriculumStatus.LOCKED] },
    [CurriculumStatus.LOCKED]: { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-500 dark:text-gray-400', ring: 'ring-gray-300', icon: () => <span className="font-bold">🔒</span>, options: [CurriculumStatus.IN_PROGRESS, CurriculumStatus.COMPLETED] },
};

const updateStructure = (structure: CurriculumItem[], itemId: string, newStatus: CurriculumStatus): CurriculumItem[] => {
    let itemFound = false;

    // Helper to recursively update children
    const updateChildren = (items: CurriculumItem[], status: CurriculumStatus): CurriculumItem[] => {
        return items.map(item => ({
            ...item,
            status: status,
            children: item.children ? updateChildren(item.children, status) : []
        }));
    };

    // Main recursive function to find and update the item
    const update = (items: CurriculumItem[]): CurriculumItem[] => {
        return items.map(item => {
            if (item.id === itemId) {
                itemFound = true;
                return {
                    ...item,
                    status: newStatus,
                    children: newStatus === CurriculumStatus.COMPLETED && item.children ? updateChildren(item.children, CurriculumStatus.COMPLETED) : item.children
                };
            }
            if (item.children) {
                return { ...item, children: update(item.children) };
            }
            return item;
        });
    };
    
    let newStructure = update(structure);
    if (!itemFound) return structure;

    // Helper to update parent statuses based on children
    const updateParents = (items: CurriculumItem[]): CurriculumItem[] => {
        return items.map(parent => {
            if (!parent.children || parent.children.length === 0) return parent;

            const updatedChildren = updateParents(parent.children);
            const allChildrenCompleted = updatedChildren.every(c => c.status === CurriculumStatus.COMPLETED);
            const anyChildInProgress = updatedChildren.some(c => c.status === CurriculumStatus.IN_PROGRESS);

            let newParentStatus = parent.status;
            if (allChildrenCompleted) {
                newParentStatus = CurriculumStatus.COMPLETED;
            } else if (anyChildInProgress || updatedChildren.some(c => c.status === CurriculumStatus.COMPLETED)) {
                newParentStatus = CurriculumStatus.IN_PROGRESS;
            } else { // All children are locked
                 newParentStatus = CurriculumStatus.LOCKED;
            }
            
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
                     <div className={`flex-shrink-0 h-8 w-8 rounded-full ${statusInfo[item.status].ring} ring-1 flex items-center justify-center font-bold text-lg ${statusInfo[item.status].text}`}>
                        <Icon className="h-6 w-6"/>
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white">{item.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.children?.length || 0} topics</p>
                    </div>
                </div>
                {isEditing ? (
                    <select
                        value={item.status}
                        onChange={(e) => onStatusChange(item.id, e.target.value as CurriculumStatus)}
                        className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 py-1 px-2"
                    >
                        <option value={item.status}>{item.status}</option>
                        {statusInfo[item.status].options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                            <select
                                value={topic.status}
                                onChange={(e) => onStatusChange(topic.id, e.target.value as CurriculumStatus)}
                                className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 py-1 px-2"
                            >
                                <option value={topic.status}>{topic.status}</option>
                                {statusInfo[topic.status].options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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


const StudentPortfolio: React.FC<{ student: StudentDetails; studentAssignments: Assignment[]; studentSessions: Session[] }> = ({ student, studentAssignments, studentSessions }) => {
    const { addToast } = useToast();
    const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgress | null>(null);
    
    useEffect(() => {
        getCurriculumProgress().then(progress => setCurriculumProgress(progress[student.enrollmentId]));
    }, [student.enrollmentId]);
    
    const [isJourneyOpen, setIsJourneyOpen] = useState(true);

    const [isEditingCurriculum, setIsEditingCurriculum] = useState(false);
    const [draftCurriculum, setDraftCurriculum] = useState<CurriculumProgress | null>(null);

    useEffect(() => {
        setDraftCurriculum(curriculumProgress ? JSON.parse(JSON.stringify(curriculumProgress)) : null);
    }, [curriculumProgress]);

    const { percentage } = useMemo(() => {
        const source = isEditingCurriculum ? draftCurriculum : curriculumProgress;
        let total = 0, completed = 0;
        const traverse = (items: CurriculumItem[]) => {
            items.forEach(item => {
                total++;
                if (item.status === CurriculumStatus.COMPLETED) completed++;
                if (item.children) traverse(item.children);
            });
        };
        if (source?.structure) traverse(source.structure);
        return { percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [curriculumProgress, draftCurriculum, isEditingCurriculum]);
    
    const { attendanceRate, averageGrade } = useMemo(() => {
        const completedSessions = studentSessions.filter(s => s.status === SessionStatus.COMPLETED).length;
        const absentSessions = studentSessions.filter(s => s.status === SessionStatus.ABSENT).length;
        const totalAccountable = completedSessions + absentSessions;
        const attendanceRate = totalAccountable > 0 ? Math.round((completedSessions / totalAccountable) * 100) : 100;

        const graded = studentAssignments.filter(a => a.grade);
        let totalScore = 0, count = 0;
        graded.forEach(a => {
            const score = gradeToNumeric(a.grade);
            if (score !== null) { totalScore += score; count++; }
        });
        const averageGrade = count > 0 ? Math.round(totalScore / count) : 0;
        
        return { attendanceRate, averageGrade };
    }, [studentSessions, studentAssignments]);

    const handleCurriculumUpdate = async (newStructure: CurriculumItem[]) => {
        const allProgress = await getCurriculumProgress();
        const updatedProgress = { ...(allProgress[student.enrollmentId] || { enrollmentId: student.enrollmentId, programTitle: student.programTitle }), structure: newStructure };
        allProgress[student.enrollmentId] = updatedProgress;
        await saveCurriculumProgress(allProgress);
        setCurriculumProgress(updatedProgress);
    };

    const handleStartEditing = () => {
        setDraftCurriculum(curriculumProgress ? JSON.parse(JSON.stringify(curriculumProgress)) : null);
        setIsEditingCurriculum(true);
    };

    const handleSaveChanges = () => {
        if (draftCurriculum) {
            handleCurriculumUpdate(draftCurriculum.structure);
            addToast('Curriculum progress updated!');
        }
        setIsEditingCurriculum(false);
    };

    const handleCancelEdit = () => {
        setDraftCurriculum(curriculumProgress ? JSON.parse(JSON.stringify(curriculumProgress)) : null);
        setIsEditingCurriculum(false);
    };

    const handleDraftUpdate = (itemId: string, newStatus: CurriculumStatus) => {
        if (draftCurriculum) {
            const newStructure = updateStructure(draftCurriculum.structure, itemId, newStatus);
            setDraftCurriculum({ ...draftCurriculum, structure: newStructure });
        }
    };

    const recentSummaries = useMemo(() => {
        return studentSessions
            .filter(s => s.parentSummary && (s.status === SessionStatus.COMPLETED || s.status === SessionStatus.ABSENT))
            .sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime())
            .slice(0, 3);
    }, [studentSessions]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Performance Snapshot</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-inner flex items-center space-x-3">
                        <div className="bg-primary-100 dark:bg-primary-900/50 p-2 rounded-full"><CalendarIcon className="h-5 w-5 text-primary-500" /></div>
                        <div><p className="text-xs text-gray-500">Attendance</p><p className="font-bold text-lg">{attendanceRate}%</p></div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-inner flex items-center space-x-3">
                        <div className="bg-primary-100 dark:bg-primary-900/50 p-2 rounded-full"><ScaleIcon className="h-5 w-5 text-primary-500" /></div>
                        <div><p className="text-xs text-gray-500">Avg. Grade</p><p className="font-bold text-lg">{averageGrade}%</p></div>
                    </div>
                </div>
                 {curriculumProgress && (
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">Learning Journey</h4>
                             {!isEditingCurriculum ? (
                                <button onClick={handleStartEditing} className="px-3 py-1 text-xs font-semibold text-white bg-primary-500 rounded-full hover:bg-primary-600">Edit Progress</button>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <button onClick={handleCancelEdit} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300">Cancel</button>
                                    <button onClick={handleSaveChanges} className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded-full hover:bg-green-600">Save Changes</button>
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-inner">
                            <div className="cursor-pointer group" onClick={() => setIsJourneyOpen(!isJourneyOpen)}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Program Progress</span>
                                    <div className="flex items-center space-x-2"><span className="text-sm font-bold text-primary-600 dark:text-primary-400">{percentage}%</span><ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isJourneyOpen ? 'rotate-180' : ''}`} /></div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div className="bg-primary-500 h-2.5 rounded-full transition-all duration-500" style={{width: `${percentage}%`}}></div></div>
                            </div>
                             {isJourneyOpen && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 max-h-80 overflow-y-auto pr-2">
                                    {(isEditingCurriculum ? draftCurriculum : curriculumProgress)?.structure.map(chapter => (
                                        <InteractiveCurriculumNode key={chapter.id} item={chapter} onStatusChange={handleDraftUpdate} isEditing={isEditingCurriculum} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                 )}
            </div>
            <div>
                 <h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Recent Session Summaries</h4>
                 <div className="space-y-3">
                     {recentSummaries.length > 0 ? recentSummaries.map(summary => (
                        <div key={summary.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-inner">
                            <div className="flex justify-between items-baseline mb-1">
                                <p className="font-bold text-sm text-gray-800 dark:text-white">{summary.title}</p>
                                <p className="text-xs text-gray-500">{new Date(summary.start).toLocaleDateString()}</p>
                            </div>
                            <blockquote className="text-sm border-l-2 border-primary-300 pl-2 italic text-gray-600 dark:text-gray-300">
                                {summary.parentSummary}
                            </blockquote>
                        </div>
                    )) : <p className="text-sm text-gray-500 italic">No recent summaries from the teacher.</p>}
                 </div>
            </div>
        </div>
    );
};


const MyStudentsPage: React.FC = () => {
    const { user: teacher } = useAuth();
    const { addToast } = useToast();
    const [myStudents, setMyStudents] = useState<StudentDetails[]>([]);
    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', direction: 'ascending' });
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [currentStudent, setCurrentStudent] = useState<StudentDetails | null>(null);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'grade'>('add');

    useEffect(() => {
        const fetchData = async () => {
            if (!teacher) { setIsLoading(false); return; }
            setIsLoading(true);
            const [users, programs, enrollments, assignments, sessions] = await Promise.all([getUsers(), getPrograms(), getEnrollments(), getAssignments(), getSessions()]);
            const myEnrollments = enrollments.filter(e => e.teacherId === teacher.id);
            const myStudentIds = new Set(myEnrollments.map(e => e.studentId));
            const studentDetails: StudentDetails[] = users
                .filter(u => myStudentIds.has(u.id))
                .map(student => {
                    const enrollment = myEnrollments.find(e => e.studentId === student.id); // Assuming one active enrollment per student for simplicity
                    const program = programs.find(p => p.id === enrollment?.programId);
                    return { ...student, programTitle: program?.title || 'N/A', creditsRemaining: enrollment?.creditsRemaining || 0, enrollmentId: enrollment?.id || '', enrollmentStatus: enrollment?.status || EnrollmentStatus.CANCELLED, programId: program?.id || '' };
                });
            setMyStudents(studentDetails);
            setAllAssignments(assignments);
            setAllSessions(sessions);
            setIsLoading(false);
        };
        fetchData();
    }, [teacher]);

    const filteredStudents = useMemo(() => {
        let filtered = myStudents.filter(student => `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [myStudents, searchTerm, sortConfig]);

    const requestSort = (key: keyof StudentDetails) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof StudentDetails) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    const handleOpenAssignmentModal = (student: StudentDetails, assignment: Assignment | null, mode: 'add' | 'edit' | 'grade') => {
        setCurrentStudent(student);
        setSelectedAssignment(assignment);
        setModalMode(mode);
        setIsModalOpen(true);
    };

    const handleSaveAssignment = async (assignmentData: Assignment) => {
        let newAssignments;
        const currentAssignments = await getAssignments();
        if (modalMode === 'add') {
            newAssignments = [assignmentData, ...currentAssignments];
            addToast(`Assignment "${assignmentData.title}" created!`);
            if (teacher) {
                await logAction(teacher, 'ASSIGNMENT_CREATED', 'Assignment', assignmentData.id, { title: assignmentData.title, studentId: assignmentData.studentId });
            }
        } else {
            newAssignments = currentAssignments.map(a => a.id === assignmentData.id ? assignmentData : a);
            addToast(`Assignment "${assignmentData.title}" updated!`);
            if(modalMode === 'grade' && teacher) {
                await logAction(teacher, 'ASSIGNMENT_GRADED', 'Assignment', assignmentData.id, { grade: assignmentData.grade, studentId: assignmentData.studentId });
            }
        }
        await saveAssignments(newAssignments);
        setAllAssignments(newAssignments);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Students</h1>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage your students' assignments and track their progress.</p>
                    </div>
                    <div className="w-full md:w-1/3">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                        </div>
                    </div>
                </div>
            </div>
            
             <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50"><tr>
                        <th className="px-6 py-3 w-12"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => requestSort('lastName')}><div className="flex items-center">Name{getSortIcon('lastName')}</div></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => requestSort('programTitle')}><div className="flex items-center">Program{getSortIcon('programTitle')}</div></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => requestSort('creditsRemaining')}><div className="flex items-center">Credits{getSortIcon('creditsRemaining')}</div></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {isLoading ? (<tr><td colSpan={5} className="text-center p-8">Loading students...</td></tr>) : filteredStudents.map(student => (
                             <React.Fragment key={student.id}>
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4"><button onClick={() => setExpandedStudentId(expandedStudentId === student.id ? null : student.id)}><ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedStudentId === student.id ? 'rotate-180' : ''}`} /></button></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><img className="h-10 w-10 rounded-full" src={student.avatar} alt="" /><div className="ml-4"><div className="text-sm font-medium text-gray-900 dark:text-white">{student.firstName} {student.lastName}</div><div className="text-sm text-gray-500">{student.email}</div></div></div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{student.programTitle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-semibold">{student.creditsRemaining}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><button onClick={() => handleOpenAssignmentModal(student, null, 'add')} className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800"><PlusIcon className="h-4 w-4 mr-1"/>New Assignment</button></td>
                                </tr>
                                {expandedStudentId === student.id && (
                                    <tr><td colSpan={5} className="p-4 bg-gray-50 dark:bg-gray-900/50">
                                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                                            <StudentPortfolio student={student} studentAssignments={allAssignments.filter(a => a.studentId === student.id)} studentSessions={allSessions.filter(s => s.studentId === student.id)} />
                                            <div className="mt-4 border-t pt-4 dark:border-gray-700"><h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Assignments</h4><div className="space-y-2">
                                                {allAssignments.filter(a => a.studentId === student.id).map(assignment => (
                                                    <div key={assignment.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700/50 rounded-md">
                                                        <div><p className="font-semibold text-sm">{assignment.title}</p><p className="text-xs text-gray-500">Due: {assignment.dueDate}</p></div>
                                                        <div className="flex items-center space-x-4"><StatusBadge status={assignment.status} /><button onClick={() => handleOpenAssignmentModal(student, assignment, 'grade')}><PencilSquareIcon className="h-5 w-5 text-primary-600 hover:text-primary-800"/></button></div>
                                                    </div>
                                                ))}
                                            </div></div>
                                        </div>
                                    </td></tr>
                                )}
                             </React.Fragment>
                        ))}
                    </tbody>
                </table>
             </div>
             {isModalOpen && currentStudent && <AssignmentFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveAssignment} mode={modalMode} student={currentStudent} assignment={selectedAssignment} />}
        </div>
    );
};

export default MyStudentsPage;