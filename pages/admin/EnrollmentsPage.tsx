import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Enrollment, EnrollmentStatus, User, Role, Program, ProgramStatus, CreditTransaction } from '../../types';
import { SearchIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, BanknotesIcon, ExclamationTriangleIcon, InformationCircleIcon, XIcon, ClipboardListIcon } from '../../components/icons/Icons';
import EnrollmentFormModal from '../../components/EnrollmentFormModal';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import CreditHistoryModal from '../../components/CreditHistoryModal';
import { getEnrollments, saveEnrollments, getCreditTransactions, saveCreditTransactions } from '../../api/enrollmentApi';
import { getUsers } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import { logAction } from '../../api/auditApi';
import EmptyState from '../../components/EmptyState';
import SkeletonLoader from '../../components/SkeletonLoader';
import Pagination from '../../components/Pagination';

type SortConfig = {
    key: keyof Enrollment | 'studentName' | 'programTitle' | 'teacherName';
    direction: 'ascending' | 'descending';
} | null;

const StatusBadge: React.FC<{ status: EnrollmentStatus }> = ({ status }) => {
    const statusColors: Record<EnrollmentStatus, string> = {
        [EnrollmentStatus.ACTIVE]: 'bg-success-100 text-success-800',
        [EnrollmentStatus.COMPLETED]: 'bg-info-100 text-info-800',
        [EnrollmentStatus.CANCELLED]: 'bg-danger-100 text-danger-800',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>
};

const EnrollmentsPage: React.FC = () => {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<EnrollmentStatus | 'all'>('all');
    const [programFilter, setProgramFilter] = useState<string>('all');
    const [teacherFilter, setTeacherFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dateEnrolled', direction: 'descending' });
    const { addToast } = useToast();
    const { user: adminUser } = useAuth();
    const { settings } = useSettings();
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);

    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const location = useLocation();
    const navigate = useNavigate();
    const lowCreditEnrollmentIds: string[] | undefined = location.state?.lowCreditEnrollmentIds;
    
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allPrograms, setAllPrograms] = useState<Program[]>([]);
    
    const students = useMemo(() => allUsers.filter(u => u.role === Role.STUDENT), [allUsers]);
    const teachers = useMemo(() => allUsers.filter(u => u.role === Role.TEACHER), [allUsers]);
    const programs = useMemo(() => allPrograms.filter(p => p.status === ProgramStatus.ACTIVE), [allPrograms]);

    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [allUsers]);
    const programMap = useMemo(() => new Map(allPrograms.map(p => [p.id, p.title])), [allPrograms]);
    
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [enrollmentsData, transactionsData, usersData, programsData] = await Promise.all([
                getEnrollments(),
                getCreditTransactions(),
                getUsers(),
                getPrograms(),
            ]);
            setEnrollments(enrollmentsData);
            setCreditTransactions(transactionsData);
            setAllUsers(usersData);
            setAllPrograms(programsData);
        } catch (error) {
            console.error("Failed to fetch enrollment data", error);
            addToast("Failed to load data.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, programFilter, teacherFilter, lowCreditEnrollmentIds]);

    const filteredEnrollments = useMemo(() => {
        let baseEnrollments = enrollments;

        if (lowCreditEnrollmentIds) {
            const idSet = new Set(lowCreditEnrollmentIds);
            baseEnrollments = enrollments.filter(e => idSet.has(e.id));
        }

        let filtered = baseEnrollments.map(e => ({
            ...e,
            studentName: userMap.get(e.studentId) || 'N/A',
            programTitle: programMap.get(e.programId) || 'N/A',
            teacherName: userMap.get(e.teacherId) || 'N/A',
        })).filter(e =>
            (e.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || e.programTitle.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'all' || e.status === statusFilter) &&
            (programFilter === 'all' || e.programId === programFilter) &&
            (teacherFilter === 'all' || e.teacherId === teacherFilter)
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const key = sortConfig.key as keyof typeof a;
                if (a[key] < b[key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[key] > b[key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [enrollments, searchTerm, statusFilter, programFilter, teacherFilter, sortConfig, userMap, programMap, lowCreditEnrollmentIds]);
    
    const totalPages = Math.ceil(filteredEnrollments.length / itemsPerPage);
    const paginatedEnrollments = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredEnrollments.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredEnrollments, currentPage, itemsPerPage]);

    const requestSort = (key: keyof Enrollment | 'studentName' | 'programTitle' | 'teacherName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Enrollment | 'studentName' | 'programTitle' | 'teacherName') => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        }
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: keyof Enrollment | 'studentName' | 'programTitle' | 'teacherName'; children: React.ReactNode; }> = ({ sortKey, children }) => (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <span className="ml-1">{getSortIcon(sortKey)}</span>
            </div>
        </th>
    );

    const handleOpenModal = (enrollment: Enrollment | null = null) => {
        setEditingEnrollment(enrollment);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEnrollment(null);
    };

    const handleSaveEnrollment = async (enrollmentToSave: Enrollment) => {
        const isEditing = !!editingEnrollment;
        const currentEnrollments = await getEnrollments();
        let newEnrollments;

        if (isEditing && editingEnrollment) {
            const originalEnrollment = currentEnrollments.find(e => e.id === editingEnrollment.id);
            newEnrollments = currentEnrollments.map(e => (e.id === enrollmentToSave.id ? enrollmentToSave : e));
            logAction(adminUser, 'ENROLLMENT_UPDATED', 'Enrollment', enrollmentToSave.id, { previousState: originalEnrollment, changes: enrollmentToSave });
        } else {
            newEnrollments = [enrollmentToSave, ...currentEnrollments];
            logAction(adminUser, 'ENROLLMENT_CREATED', 'Enrollment', enrollmentToSave.id, { enrollment: enrollmentToSave });
        }

        await saveEnrollments(newEnrollments);
        fetchData(); // Refetch to update UI
        addToast(`Enrollment ${isEditing ? 'updated' : 'created'} successfully!`);
        handleCloseModal();
    };


    const handleOpenCreditModal = (enrollment: Enrollment) => {
        setSelectedEnrollment(enrollment);
        setIsCreditModalOpen(true);
    };

    const handleCloseCreditModal = () => {
        setSelectedEnrollment(null);
        setIsCreditModalOpen(false);
    };

    const handleSaveCreditAdjustment = async (adjustment: { change: number; reason: string }) => {
        if (!selectedEnrollment || !adminUser) return;
        
        const newTransaction: CreditTransaction = {
            id: `ct-${Date.now()}`,
            enrollmentId: selectedEnrollment.id,
            ...adjustment,
            date: new Date().toISOString(),
            adminName: `${adminUser.firstName} ${adminUser.lastName}`,
        };

        await saveCreditTransactions([...creditTransactions, newTransaction]);

        const currentEnrollments = await getEnrollments();
        const newEnrollments = currentEnrollments.map(e => 
            e.id === selectedEnrollment.id 
            ? { ...e, creditsRemaining: e.creditsRemaining + adjustment.change } 
            : e
        );
        await saveEnrollments(newEnrollments);
        fetchData(); // Refetch
        addToast(`Credits for ${userMap.get(selectedEnrollment.studentId)} adjusted successfully.`);
        logAction(adminUser, 'CREDITS_ADJUSTED', 'Enrollment', selectedEnrollment.id, { change: adjustment.change, reason: adjustment.reason });
        handleCloseCreditModal();
    };

    const handleClearFilter = () => {
        navigate('/admin/enrollments', { replace: true, state: {} });
    };
    
    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                <SkeletonLoader rows={10} />
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 mb-4">
                     <div className="w-full md:w-1/3">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students or programs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                     <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as EnrollmentStatus | 'all')}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(EnrollmentStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                         <select
                            value={programFilter}
                            onChange={(e) => setProgramFilter(e.target.value)}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Programs</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                        <select
                            value={teacherFilter}
                            onChange={(e) => setTeacherFilter(e.target.value)}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Teachers</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                        </select>
                        <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            New Enrollment
                        </button>
                    </div>
                </div>
                
                {lowCreditEnrollmentIds && (
                    <div className="bg-info-100 dark:bg-info-800/30 text-info-800 dark:text-info-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <InformationCircleIcon className="h-5 w-5 mr-2"/>
                            <p className="text-sm font-medium">Showing enrollments with low credits.</p>
                        </div>
                        <button onClick={handleClearFilter} className="flex items-center text-sm font-semibold hover:underline">
                            <XIcon className="h-4 w-4 mr-1" />
                            Clear Filter
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <SortableHeader sortKey="studentName">Student</SortableHeader>
                                <SortableHeader sortKey="programTitle">Program</SortableHeader>
                                <SortableHeader sortKey="teacherName">Teacher</SortableHeader>
                                <SortableHeader sortKey="creditsRemaining">Credits</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <SortableHeader sortKey="dateEnrolled">Date Enrolled</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedEnrollments.length > 0 ? paginatedEnrollments.map(e => (
                                <tr key={e.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{e.studentName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{e.programTitle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{e.teacherName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center font-semibold">
                                        <div className="flex items-center justify-center">
                                            {e.status === EnrollmentStatus.ACTIVE && e.creditsRemaining <= settings.salesLowCreditAlerts.threshold && (
                                                <span title="Low credits alert">
                                                    <ExclamationTriangleIcon className="h-4 w-4 text-warning-500 mr-1.5" />
                                                </span>
                                            )}
                                            {e.creditsRemaining}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={e.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{e.dateEnrolled}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => handleOpenModal(e)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="Edit Enrollment"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => handleOpenCreditModal(e)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300" title="Manage Credits"><BanknotesIcon className="h-5 w-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7}>
                                        <EmptyState 
                                            icon={ClipboardListIcon}
                                            title="No enrollments found"
                                            message="Try adjusting your search or filter criteria to find what you're looking for."
                                            action={{ text: "Create Enrollment", onClick: () => handleOpenModal() }}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                     <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredEnrollments.length}
                        itemsPerPage={itemsPerPage}
                    />
                )}
            </div>
            <EnrollmentFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveEnrollment}
                enrollment={editingEnrollment}
                students={students}
                teachers={teachers}
                programs={programs}
            />
            {selectedEnrollment && (
                <CreditHistoryModal
                    isOpen={isCreditModalOpen}
                    onClose={handleCloseCreditModal}
                    onSave={handleSaveCreditAdjustment}
                    enrollment={selectedEnrollment}
                    transactions={creditTransactions.filter(t => t.enrollmentId === selectedEnrollment.id)}
                    userMap={userMap}
                    programMap={programMap}
                />
            )}
        </>
    );
};

export default EnrollmentsPage;