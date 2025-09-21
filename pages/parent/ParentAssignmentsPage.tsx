import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment, AssignmentStatus, User, CurriculumItem, ResourceLink, Program } from '../../types';
// FIX: Added missing ChevronUpIcon import.
import { SearchIcon, ChevronDownIcon, ArrowUpTrayIcon, EyeIcon, ChatBubbleIcon, LinkIcon, ChevronUpIcon } from '../../components/icons/Icons';
import { getAssignments, saveAssignments } from '../../api/sessionApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getUsers } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import SubmissionModal from '../../components/SubmissionModal';
import MessageModal from '../../components/MessageModal';
import { useToast } from '../../contexts/ToastContext';
// FIX: Import useParentPortal to access child context.
import { useParentPortal } from '../../contexts/ParentPortalContext';
// FIX: Import ParentPageHeader component.
import ParentPageHeader from '../../components/ParentPageHeader';

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

const ParentAssignmentsPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'descending' });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const { selectedChildId, children } = useParentPortal();
    const { addToast } = useToast();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [assignmentsData, programsData] = await Promise.all([
                getAssignments(),
                getPrograms(),
            ]);
            setAssignments(assignmentsData);
            setPrograms(programsData);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const childAssignments = useMemo(() => {
        if (!selectedChildId) return [];
        const childAssignmentsRaw = assignments.filter(a => a.studentId === selectedChildId);

        return childAssignmentsRaw.map(assignment => {
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
    }, [selectedChildId, assignments, programs]);

    const filteredAssignments = useMemo(() => {
        let filtered = childAssignments.filter(assignment =>
            (assignment.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'all' || assignment.status === statusFilter)
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [childAssignments, searchTerm, statusFilter, sortConfig]);

    const requestSort = (key: keyof Assignment) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig?.key === key && sortConfig?.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Assignment) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };
    
    const toggleRow = (assignmentId: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(assignmentId)) newSet.delete(assignmentId);
        else newSet.add(assignmentId);
        setExpandedRows(newSet);
    };

    const handleOpenSubmissionModal = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setIsSubmissionModalOpen(true);
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
        const allAssignments = await getAssignments();
        const newAssignments = allAssignments.map(a => a.id === updatedAssignment.id ? updatedAssignment : a);
        await saveAssignments(newAssignments);
        setAssignments(newAssignments);
        addToast('Assignment submitted successfully!');
        setIsSubmissionModalOpen(false);
        setSelectedAssignment(null);
    };

    const SortableHeader: React.FC<{ sortKey: keyof Assignment; children: React.ReactNode }> = ({ sortKey, children }) => (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">{children}<span className="ml-1">{getSortIcon(sortKey)}</span></div>
        </th>
    );

    if (children.length === 0) {
        return <ParentPageHeader title="Assignments" />;
    }

    return (
        <>
            <div className="space-y-6">
                <ParentPageHeader title="Assignments" />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 mb-4">
                        <div className="w-full md:w-1/3">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input type="text" placeholder="Search assignments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                        </div>
                        <div className="w-full md:w-auto flex items-center space-x-2">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | 'all')} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                                <option value="all">All Statuses</option>
                                {Object.values(AssignmentStatus).map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 w-12"></th>
                                    <SortableHeader sortKey="title">Assignment</SortableHeader>
                                    <SortableHeader sortKey="dueDate">Due Date</SortableHeader>
                                    <SortableHeader sortKey="status">Status</SortableHeader>
                                    <SortableHeader sortKey="grade">Grade</SortableHeader>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredAssignments.map(assignment => (
                                    <React.Fragment key={assignment.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4">
                                                {(assignment.feedback || assignment.instructions || assignment.url || (assignment.resources && assignment.resources.length > 0)) && (
                                                    <button onClick={() => toggleRow(assignment.id)}><ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedRows.has(assignment.id) ? 'rotate-180' : ''}`} /></button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{assignment.title}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{assignment.dueDate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={assignment.status} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white text-center">{assignment.grade || '--'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {assignment.status === AssignmentStatus.NOT_SUBMITTED ? (
                                                    <button onClick={() => handleOpenSubmissionModal(assignment)} className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800">
                                                        <ArrowUpTrayIcon className="h-4 w-4 mr-1"/> Submit
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleOpenSubmissionModal(assignment)} className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-800">
                                                        <EyeIcon className="h-4 w-4 mr-1"/> View Details
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedRows.has(assignment.id) && (
                                            <tr>
                                                <td colSpan={6} className="p-0">
                                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 space-y-4">
                                                        {assignment.instructions && <div><h4 className="text-xs font-bold uppercase text-gray-500">Instructions</h4><p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p></div>}
                                                        {(assignment.url || (assignment.resources && assignment.resources.length > 0)) && (
                                                            <div>
                                                                <h4 className="text-xs font-bold uppercase text-gray-500">Resources & Links</h4>
                                                                <div className="mt-1 space-y-1">
                                                                    {assignment.url && (
                                                                        <a href={assignment.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-blue-500 hover:underline">
                                                                            <LinkIcon className="h-4 w-4" />
                                                                            <span>View Assignment Resource</span>
                                                                        </a>
                                                                    )}
                                                                    {assignment.resources.map(res => (
                                                                        <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-blue-500 hover:underline">
                                                                            <LinkIcon className="h-4 w-4" />
                                                                            <span>{res.title}</span>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {assignment.feedback && <div><h4 className="text-xs font-bold uppercase text-gray-500">Teacher Feedback</h4><p className="text-sm whitespace-pre-wrap">{assignment.feedback}</p></div>}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <SubmissionModal
                isOpen={isSubmissionModalOpen}
                onClose={() => setIsSubmissionModalOpen(false)}
                onConfirm={handleConfirmSubmission}
                assignment={selectedAssignment}
                resources={selectedAssignment ? childAssignments.find(a => a.id === selectedAssignment.id)?.resources : []}
                modalTitleOverride={selectedAssignment?.status === AssignmentStatus.NOT_SUBMITTED ? 'Submit Assignment' : 'View Submission Details'}
                submitButtonTextOverride="Submit Assignment"
            />
        </>
    );
};

export default ParentAssignmentsPage;