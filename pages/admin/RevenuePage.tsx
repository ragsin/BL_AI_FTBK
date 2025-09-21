import React, { useState, useMemo, useEffect } from 'react';
import { RevenueTransaction, RevenueTransactionType, Enrollment, User, Program, Role, CreditTransaction, EnrollmentStatus } from '../../types';
import { SearchIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon, DocumentDownloadIcon, BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ScaleIcon } from '../../components/icons/Icons';
import RevenueFormModal from '../../components/RevenueFormModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoader from '../../components/SkeletonLoader';
import Pagination from '../../components/Pagination';
import { getUsers } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import { getEnrollments, saveEnrollments, getCreditTransactions, saveCreditTransactions } from '../../api/enrollmentApi';
import { getRevenueTransactions, saveRevenueTransactions } from '../../api/revenueApi';
import { logAction } from '../../api/auditApi';

type SortableKeys = keyof FormattedRevenueTransaction;
type SortConfig = { key: SortableKeys; direction: 'ascending' | 'descending'; } | null;

interface FormattedRevenueTransaction extends RevenueTransaction {
    studentName: string;
    programTitle: string;
    salesPersonName: string;
    convertedPrice: number;
}
const typeStyles = {
    [RevenueTransactionType.REVENUE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; }> = ({ title, value, icon: Icon }) => (
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

const RevenuePage: React.FC = () => {
    const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allPrograms, setAllPrograms] = useState<Program[]>([]);
    const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [editingTransaction, setEditingTransaction] = useState<RevenueTransaction | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<FormattedRevenueTransaction | null>(null);
    const { addToast } = useToast();
    const { settings, formatCurrency } = useSettings();
    const { user: adminUser } = useAuth();

    // Filters
    const [dateFilter, setDateFilter] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [salesPersonFilter, setSalesPersonFilter] = useState('all');
    const [programFilter, setProgramFilter] = useState('all');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const students = useMemo(() => allUsers.filter(u => u.role === Role.STUDENT), [allUsers]);
    const teachers = useMemo(() => allUsers.filter(u => u.role === Role.TEACHER), [allUsers]);
    const salesPeople = useMemo(() => allUsers.filter(u => u.role === Role.SALES || u.role === Role.ADMIN), [allUsers]);
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [allUsers]);
    const programMap = useMemo(() => new Map(allPrograms.map(p => [p.id, p.title])), [allPrograms]);
    const enrollmentMap = useMemo(() => new Map(allEnrollments.map(e => [e.id, e])), [allEnrollments]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [
                transactionsData,
                usersData,
                programsData,
                enrollmentsData,
            ] = await Promise.all([
                getRevenueTransactions(),
                getUsers(),
                getPrograms(),
                getEnrollments(),
            ]);
            setTransactions(transactionsData);
            setAllUsers(usersData);
            setAllPrograms(programsData);
            setAllEnrollments(enrollmentsData);
        } catch (error) {
            addToast('Failed to load revenue data.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFilter, customStartDate, customEndDate, salesPersonFilter, programFilter]);

    const fullTransactionData: FormattedRevenueTransaction[] = useMemo(() => {
        return transactions.map(t => {
            const enrollment = enrollmentMap.get(t.enrollmentId);
            const studentName = enrollment ? userMap.get(enrollment.studentId) ?? 'N/A' : 'N/A';
            const programTitle = enrollment ? programMap.get(enrollment.programId) ?? 'N/A' : 'N/A';
            const salesPersonName = userMap.get(t.salesPersonId) ?? 'N/A';
            const convertedPrice = t.currency !== settings.primaryCurrency && t.conversionRate ? t.price * t.conversionRate : t.price;
            return { ...t, studentName, programTitle, salesPersonName, convertedPrice };
        });
    }, [transactions, enrollmentMap, userMap, programMap, settings.primaryCurrency]);

    const filteredTransactions = useMemo(() => {
        let filtered = fullTransactionData.filter(t => {
            // Date Filter
            if (dateFilter !== 'all' || customStartDate || customEndDate) {
                const transactionDate = new Date(t.date);
                let start: Date | null = null;
                let end: Date | null = null;
                if (dateFilter === '7' || dateFilter === '30') {
                    end = new Date();
                    start = new Date();
                    start.setDate(end.getDate() - parseInt(dateFilter, 10));
                } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
                    start = new Date(customStartDate);
                    end = new Date(customEndDate);
                }
                if(start) start.setHours(0,0,0,0);
                if(end) end.setHours(23,59,59,999);

                if (start && transactionDate < start) return false;
                if (end && transactionDate > end) return false;
            }

            // Other filters
            const searchMatch = t.studentName.toLowerCase().includes(searchTerm.toLowerCase());
            const salesPersonMatch = salesPersonFilter === 'all' || t.salesPersonId === salesPersonFilter;
            const programMatch = programFilter === 'all' || (enrollmentMap.get(t.enrollmentId)?.programId === programFilter);

            return searchMatch && salesPersonMatch && programMatch;
        });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [fullTransactionData, searchTerm, sortConfig, dateFilter, customStartDate, customEndDate, salesPersonFilter, programFilter]);

    const { totalRevenue, transactionCount, averageSaleValue } = useMemo(() => {
        const revenue = filteredTransactions.reduce((sum, t) => sum + t.convertedPrice, 0);
        const count = filteredTransactions.length;
        return {
            totalRevenue: revenue,
            transactionCount: count,
            averageSaleValue: count > 0 ? revenue / count : 0,
        }
    }, [filteredTransactions]);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig?.key === key && sortConfig?.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; children: React.ReactNode; }> = ({ sortKey, children }) => (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">{children}<span className="ml-1">{getSortIcon(sortKey)}</span></div>
        </th>
    );

    const handleOpenModal = (transaction: RevenueTransaction | null = null) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleSaveTransaction = async (data: Omit<RevenueTransaction, 'id' | 'enrollmentId'> & { studentId: string; programId: string; teacherId: string }, isEditing: boolean, originalTransaction: RevenueTransaction | null) => {
        const currentTransactions = await getRevenueTransactions();
        if (isEditing && originalTransaction) {
            const updatedTransaction: RevenueTransaction = {
                ...originalTransaction,
                date: data.date,
                salesPersonId: data.salesPersonId,
                price: data.price,
                currency: data.currency,
                conversionRate: data.conversionRate,
                notes: data.notes,
            };
            const newTransactions = currentTransactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
            await saveRevenueTransactions(newTransactions);
            addToast(`Transaction updated successfully! No changes were made to enrollment credits.`);
        } else {
            const { studentId, programId, teacherId, credits, type, ...restOfData } = data;
            const currentEnrollments = await getEnrollments();
            const existingEnrollment = currentEnrollments.find(e => e.studentId === studentId && e.programId === programId && e.status === EnrollmentStatus.ACTIVE);
            
            if (existingEnrollment) {
                addToast('An active enrollment for this student and program already exists. Credit adjustments should be made on the Enrollments page.', 'error');
                return;
            }
            
            const newEnrollment: Enrollment = {
                id: `e-${Date.now()}`, studentId, programId, teacherId, status: EnrollmentStatus.ACTIVE,
                creditsRemaining: credits, dateEnrolled: new Date().toISOString().split('T')[0]
            };
            await saveEnrollments([...currentEnrollments, newEnrollment]);
            addToast(`New enrollment created for ${userMap.get(studentId)}.`, 'info');

            const creditTx: CreditTransaction = {
                id: `ct-${Date.now()}`, enrollmentId: newEnrollment.id, change: credits,
                reason: `New sale via Revenue entry`, date: new Date().toISOString(),
                adminName: userMap.get(data.salesPersonId) || 'System',
            };
            await saveCreditTransactions([...(await getCreditTransactions()), creditTx]);

            const finalTransaction: RevenueTransaction = {
                id: `rt-${Date.now()}`, enrollmentId: newEnrollment.id, credits, type: RevenueTransactionType.REVENUE, ...restOfData,
                price: data.price,
            };
            await saveRevenueTransactions([finalTransaction, ...currentTransactions]);
            addToast(`Transaction created successfully!`);
        }
        fetchData();
        setIsModalOpen(false);
    };

    const handleDeleteClick = (transaction: FormattedRevenueTransaction) => {
        setTransactionToDelete(transaction);
        setIsConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (transactionToDelete) {
            const currentTransactions = await getRevenueTransactions();
            const newTransactions = currentTransactions.filter(t => t.id !== transactionToDelete.id);
            await saveRevenueTransactions(newTransactions);
            fetchData();
            addToast(`Transaction deleted successfully.`);
            if (adminUser) {
                logAction(adminUser, 'REVENUE_ENTRY_DELETED', 'RevenueTransaction', transactionToDelete.id, { transaction: transactionToDelete });
            }
        }
        setIsConfirmOpen(false);
        setTransactionToDelete(null);
    };

    const handleExportCSV = () => {
        const headers = ['Transaction ID', 'Date', 'Sales Person Name', 'Student Name', 'Program Name', 'Credits', 'Price (Original)', 'Currency', `Price (${settings.primaryCurrency})`, 'Transaction Type'];
        const rows = filteredTransactions.map(t => [
            t.id, t.date, `"${t.salesPersonName}"`, `"${t.studentName}"`, `"${t.programTitle}"`,
            t.credits, t.price.toFixed(2), t.currency, t.convertedPrice.toFixed(2), t.type
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `revenue_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Revenue data exported successfully!');
    };
    

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Revenue Management</h1>
                <p className="text-gray-500 dark:text-gray-400">Track and manage all financial transactions.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={BanknotesIcon} />
                <StatCard title="Average Sale Value" value={formatCurrency(averageSaleValue)} icon={ScaleIcon} />
                <StatCard title="Transactions" value={transactionCount.toLocaleString()} icon={ArrowTrendingUpIcon} />
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 mb-4">
                    <div className="w-full md:w-1/3">
                         <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder="Search by student..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-wrap items-center justify-end gap-2">
                         <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                            <option value="all">All Time</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="custom">Custom Range</option>
                         </select>
                         {dateFilter === 'custom' && (<>
                            <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"/>
                            <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"/>
                         </>)}
                         <select value={salesPersonFilter} onChange={e => setSalesPersonFilter(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                            <option value="all">All Sales People</option>{salesPeople.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                         </select>
                         <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                             <option value="all">All Programs</option>{allPrograms.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                         </select>
                        <button onClick={handleExportCSV} className="flex items-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"><DocumentDownloadIcon className="h-5 w-5 mr-2" /> Export CSV</button>
                        <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600"><PlusIcon className="h-5 w-5 mr-2" /> Add Entry</button>
                    </div>
                </div>
                {isLoading ? <SkeletonLoader rows={5} /> : (
                    <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <SortableHeader sortKey="date">Date</SortableHeader>
                                    <SortableHeader sortKey="salesPersonName">Sales Person</SortableHeader>
                                    <SortableHeader sortKey="studentName">Student</SortableHeader>
                                    <SortableHeader sortKey="programTitle">Program</SortableHeader>
                                    <SortableHeader sortKey="credits">Credits</SortableHeader>
                                    <SortableHeader sortKey="price">Amount</SortableHeader>
                                    <SortableHeader sortKey="convertedPrice">Amount ({settings.primaryCurrency})</SortableHeader>
                                    <SortableHeader sortKey="type">Type</SortableHeader>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-sm">{t.date}</td>
                                        <td className="px-4 py-3 text-sm">{t.salesPersonName}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{t.studentName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{t.programTitle}</td>
                                        <td className="px-4 py-3 text-sm text-center">{t.credits}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">{t.price.toFixed(2)} {t.currency}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(t.convertedPrice)}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${typeStyles[t.type]}`}>{t.type}</span></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-3">
                                                <button onClick={() => handleOpenModal(t)}><PencilIcon className="h-5 w-5 text-indigo-500 hover:text-indigo-700"/></button>
                                                <button onClick={() => handleDeleteClick(t)}><TrashIcon className="h-5 w-5 text-red-500 hover:text-red-700"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredTransactions.length}
                            itemsPerPage={itemsPerPage}
                        />
                    )}
                    </>
                )}
            </div>
            <RevenueFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveTransaction} 
                transaction={editingTransaction} 
                enrollments={allEnrollments} 
                users={allUsers}
                programs={allPrograms}
                students={students}
                teachers={teachers}
            />
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDeleteConfirm} title="Delete Revenue Entry" message={`This will permanently delete the financial record and impact reports. This action does NOT automatically refund credits from the student's enrollment. A separate manual adjustment is required.`}/>
        </div>
    );
};

export default RevenuePage;