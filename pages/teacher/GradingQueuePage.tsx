import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Assignment, AssignmentStatus, StudentDetails, User, Enrollment } from '../../types';
import { ClipboardDocumentCheckIcon, PencilSquareIcon } from '../../components/icons/Icons';
import { getAssignments, saveAssignments } from '../../api/sessionApi';
import { getUsers } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { logAction } from '../../api/auditApi';
import AssignmentFormModal from '../../components/AssignmentFormModal';
import { useToast } from '../../contexts/ToastContext';
import EmptyState from '../../components/EmptyState';

const StatusBadge: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
    const statusColors: Record<AssignmentStatus, string> = {
        [AssignmentStatus.GRADED]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [AssignmentStatus.PENDING_GRADING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        [AssignmentStatus.SUBMITTED_LATE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [AssignmentStatus.NOT_SUBMITTED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>;
};

const GradingQueuePage: React.FC = () => {
    const { user: teacher } = useAuth();
    const { addToast } = useToast();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [currentStudent, setCurrentStudent] = useState<StudentDetails | null>(null);
    
    const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
    const [programMap, setProgramMap] = useState<Map<string, string>>(new Map());
    const [enrollmentMap, setEnrollmentMap] = useState<Map<string, Enrollment>>(new Map());
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [users, programs, enrollments, assignmentsData] = await Promise.all([
                getUsers(), getPrograms(), getEnrollments(), getAssignments()
            ]);
            setUserMap(new Map(users.map(u => [u.id, u])));
            setProgramMap(new Map(programs.map(p => [p.id, p.title])));
            setEnrollmentMap(new Map(enrollments.map(e => [e.id, e])));
            setAssignments(assignmentsData);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const assignmentsToGrade = useMemo(() => {
        if (!teacher) return [];

        const enrollments = Array.from(enrollmentMap.values());
        const myStudentIds = new Set(enrollments.filter(e => e.teacherId === teacher.id).map(e => e.studentId));

        return assignments
            .filter(a => myStudentIds.has(a.studentId) && (a.status === AssignmentStatus.PENDING_GRADING || a.status === AssignmentStatus.SUBMITTED_LATE))
            .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()); // Oldest first
    }, [teacher, assignments, enrollmentMap]);

    const handleOpenModal = (assignment: Assignment) => {
        const studentUser = userMap.get(assignment.studentId);
        const enrollment = enrollmentMap.get(assignment.enrollmentId);
        
        if (studentUser && enrollment) {
            const studentDetails: StudentDetails = {
                ...studentUser,
                programTitle: programMap.get(enrollment.programId) || 'N/A',
                creditsRemaining: enrollment.creditsRemaining,
                enrollmentId: enrollment.id,
                enrollmentStatus: enrollment.status,
                programId: enrollment.programId,
            };
            setCurrentStudent(studentDetails);
            setSelectedAssignment(assignment);
            setIsModalOpen(true);
        } else {
            addToast('Could not find student or enrollment details.', 'error');
        }
    };

    const handleSaveAssignment = async (assignmentData: Assignment) => {
        const currentAssignments = await getAssignments();
        const newAssignments = currentAssignments.map(a => a.id === assignmentData.id ? assignmentData : a);
        await saveAssignments(newAssignments);
        setAssignments(newAssignments);
        addToast(`Assignment graded successfully!`);
        await logAction(teacher, 'ASSIGNMENT_GRADED', 'Assignment', assignmentData.id, { grade: assignmentData.grade, studentId: assignmentData.studentId });
        setIsModalOpen(false);
    };

    return (
        <>
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Grading Queue</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Review and grade all submitted assignments from your students.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Assignment</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Program</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Submitted</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="text-center p-8">Loading...</td></tr>
                                ) : assignmentsToGrade.length === 0 ? (
                                    <tr>
                                        <td colSpan={6}>
                                            <EmptyState
                                                icon={ClipboardDocumentCheckIcon}
                                                title="All Caught Up!"
                                                message="There are no assignments waiting for your review."
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    assignmentsToGrade.map(assignment => {
                                        const student = userMap.get(assignment.studentId);
                                        const program = programMap.get(assignment.programId);
                                        return (
                                            <tr key={assignment.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{student ? `${student.firstName} ${student.lastName}` : '...'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{assignment.title}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{program || '...'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(assignment.submittedAt).toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={assignment.status} /></td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button onClick={() => handleOpenModal(assignment)} className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800">
                                                        <PencilSquareIcon className="h-4 w-4 mr-1"/> Grade Now
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {isModalOpen && currentStudent && (
                 <AssignmentFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveAssignment}
                    mode="grade"
                    student={currentStudent}
                    assignment={selectedAssignment}
                />
            )}
        </>
    );
};

export default GradingQueuePage;