import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment, AssignmentStatus, User, CurriculumItem, ResourceLink, Program } from '../../types';
import { SearchIcon, ChevronDownIcon, ArrowUpTrayIcon, EyeIcon, ChatBubbleIcon, LinkIcon } from '../../components/icons/Icons';
import { getAssignments, saveAssignments } from '../../api/sessionApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getUsers, addExperiencePoints } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import SubmissionModal from '../../components/SubmissionModal';
import MessageModal from '../../components/MessageModal';
import { useToast } from '../../contexts/ToastContext';

type SortConfig = { key: keyof Assignment; direction: 'ascending' | 'descending'; } | null;

const StatusBadge: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
    const statusColors: Record<AssignmentStatus, string> = {
        [AssignmentStatus.GRADED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [AssignmentStatus.PENDING_GRADING]: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
        [AssignmentStatus.SUBMITTED_LATE]: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
        [AssignmentStatus.NOT_SUBMITTED]: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
    };
    return <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[status]}`}>{status.replace('_', ' ')}</span>;
};

const findCurriculumItem = (items: CurriculumItem[], id: string): CurriculumItem | null => {
    for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
            const found = findCurriculumItem(item.children, id);
            if (found) return found;
        }
    }
    return null;
};

const StudentAssignmentsPage: React.FC = () => {
    const { user: student } = useAuth();
    const { addToast } = useToast();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
    const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
    
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [teacherToMessage, setTeacherToMessage] = useState<User | null>(null);
    const [messagePrefill, setMessagePrefill] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const [assignmentsData, programsData, usersData, enrollmentsData] = await Promise.all([
                getAssignments(), getPrograms(), getUsers(), getEnrollments()
            ]);
            setAssignments(assignmentsData);
            setPrograms(programsData);
            setUsers(usersData);
            setEnrollments(enrollmentsData);
        };
        fetchData();
    }, []);

    const assignmentsWithDetails = useMemo(() => {
        if (!student) return [];
        const studentIds = [student.id, ...(student.childrenIds || [])];
        const myAssignments = assignments.filter(a => studentIds.includes(a.studentId));

        return myAssignments.map(assignment => {
            const program = programs.find(p => p.id === assignment.programId);
            let resources: ResourceLink[] = [];
            if (program?.structure && assignment.curriculumItemId) {
                const item = findCurriculumItem(program.structure, assignment.curriculumItemId);
                if (item) {
                    resources = item.studentResources || [];
                }
            }
            return { ...assignment, resources };
        });
    }, [student, assignments, programs]);

    const filteredAssignments = useMemo(() => {
        let filtered = assignmentsWithDetails.filter(assignment =>
            (assignment.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'all' || assignment.status === statusFilter)
        );
        return filtered.sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [assignmentsWithDetails, searchTerm, statusFilter]);
    
    const toggleExpand = (assignmentId: string) => {
        setExpandedAssignments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(assignmentId)) newSet.delete(assignmentId);
            else newSet.add(assignmentId);
            return newSet;
        });
    };

    const handleOpenSubmissionModal = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setIsSubmissionModalOpen(true);
    };
  
    const handleOpenMessageModal = (assignment: Assignment) => {
        const enrollment = enrollments.find(e => e.id === assignment.enrollmentId);
        if (enrollment) {
            const teacher = users.find(u => u.id === enrollment.teacherId);
            if (teacher) {
                setSelectedAssignment(assignment);
                setTeacherToMessage(teacher);
                setMessagePrefill(`I have a question about the quest: "${assignment.title}"`);
                setIsMessageModalOpen(true);
            } else {
                addToast('Could not find teacher for this assignment.', 'error');
            }
        } else {
            addToast('Could not find enrollment for this assignment.', 'error');
        }
    };

    const handleConfirmSubmission = async (submissionContent: string) => {
        if (!selectedAssignment) return;
        const isLate = new Date() > new Date(selectedAssignment.dueDate);
        const updatedAssignment: Assignment = {
            ...selectedAssignment,
            status: isLate ? AssignmentStatus.SUBMITTED_LATE : AssignmentStatus.PENDING_GRADING,
            submittedAt: new Date().toISOString(),
            submissionContent: submissionContent,
        };

        if (!isLate && student) {
            await addExperiencePoints(student.id, 25);
            addToast('Quest submitted on time! +25 XP awarded!', 'success');
        } else {
            addToast('Quest submitted successfully!');
        }

        const allAssignments = await getAssignments();
        const newAssignments = allAssignments.map(a => a.id === updatedAssignment.id ? updatedAssignment : a);
        await saveAssignments(newAssignments);
        setAssignments(newAssignments);
        setIsSubmissionModalOpen(false);
        setSelectedAssignment(null);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">My Quests</h1>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Here are all your assignments. Complete them to earn XP!</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 mb-4">
                        <div className="w-full md:w-1/3">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input type="text" placeholder="Search quests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            </div>
                        </div>
                        <div className="w-full md:w-auto flex items-center space-x-2">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | 'all')} className="text-sm bg-slate-100 dark:bg-slate-700 border-2 border-transparent rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 py-2 px-3">
                                <option value="all">All Statuses</option>
                                {Object.values(AssignmentStatus).map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredAssignments.map(assignment => {
                            const isExpanded = expandedAssignments.has(assignment.id);
                            const hasDetails = assignment.instructions || assignment.url || (assignment.resources && assignment.resources.length > 0);

                            return (
                                <div key={assignment.id} className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 transition-colors">
                                    <div className={`p-4 ${hasDetails ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''}`} onClick={() => hasDetails && toggleExpand(assignment.id)}>
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                            <div className="flex items-center">
                                                {hasDetails && <ChevronDownIcon className={`h-5 w-5 mr-2 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                                                <div>
                                                    <p className="font-extrabold text-lg text-slate-800 dark:text-white">{assignment.title}</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Due: {assignment.dueDate}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:mt-0 flex items-center gap-4">
                                                <StatusBadge status={assignment.status} />
                                                {assignment.grade && <span className="font-bold text-lg text-sky-600 dark:text-sky-400">Grade: {assignment.grade}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded && hasDetails && (
                                        <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-4">
                                            {assignment.instructions && <div><h4 className="text-sm font-bold uppercase text-slate-500">Instructions</h4><p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{assignment.instructions}</p></div>}
                                            {(assignment.url || (assignment.resources && assignment.resources.length > 0)) && (
                                                <div>
                                                    <h4 className="text-sm font-bold uppercase text-slate-500">Resources & Links</h4>
                                                    <div className="mt-1 space-y-1">
                                                        {assignment.url && <a href={assignment.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sky-500 hover:underline"><LinkIcon className="h-4 w-4" /><span>Link for this Quest</span></a>}
                                                        {assignment.resources.map(res => <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sky-500 hover:underline"><LinkIcon className="h-4 w-4" /><span>{res.title}</span></a>)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            {assignment.status === AssignmentStatus.NOT_SUBMITTED ? (
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenSubmissionModal(assignment); }} className="flex items-center text-sky-600 dark:text-sky-400 hover:underline font-bold text-sm"><ArrowUpTrayIcon className="h-5 w-5 mr-1" />Submit Quest</button>
                                            ) : (
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenSubmissionModal(assignment); }} className="flex items-center text-slate-600 dark:text-slate-300 hover:underline font-bold text-sm"><EyeIcon className="h-5 w-5 mr-1" />View Details</button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenMessageModal(assignment); }} title="Ask a question" className="text-slate-500 hover:text-sky-500"><ChatBubbleIcon className="h-5 w-5" /></button>
                                        </div>
                                        {assignment.feedback && <p className="text-xs italic text-slate-500 dark:text-slate-400">Teacher has left feedback!</p>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            <SubmissionModal isOpen={isSubmissionModalOpen} onClose={() => setIsSubmissionModalOpen(false)} onConfirm={handleConfirmSubmission} assignment={selectedAssignment} resources={selectedAssignment ? filteredAssignments.find(a => a.id === selectedAssignment.id)?.resources : []} />
            {student && teacherToMessage && <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} studentUser={student} recipientUser={teacherToMessage} initialText={messagePrefill} />}
        </>
    );
};

export default StudentAssignmentsPage;