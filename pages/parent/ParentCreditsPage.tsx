import React, { useMemo, useState, useEffect } from 'react';
import { Enrollment, CreditTransaction, EnrollmentStatus, Program } from '../../types';
import { getEnrollments, getCreditTransactions } from '../../api/enrollmentApi';
import { getPrograms } from '../../api/programApi';
import { BanknotesIcon } from '../../components/icons/Icons';
import { useParentPortal } from '../../contexts/ParentPortalContext';
import ParentPageHeader from '../../components/ParentPageHeader';

const statusStyles: Record<EnrollmentStatus, { border: string; text: string; bg: string; }> = {
    [EnrollmentStatus.ACTIVE]: {
        border: 'border-green-500',
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30'
    },
    [EnrollmentStatus.COMPLETED]: {
        border: 'border-gray-500',
        text: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-100 dark:bg-gray-900/30'
    },
    [EnrollmentStatus.CANCELLED]: {
        border: 'border-red-500',
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30'
    },
};

const ParentCreditsPage: React.FC = () => {
    const { selectedChildId, children } = useParentPortal();
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [selectedProgramId, setSelectedProgramId] = useState<string>('');

    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const programMap = useMemo(() => new Map(programs.map(p => [p.id, p])), [programs]);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedChildId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const [allEnrollments, allCreditTxs, allPrograms] = await Promise.all([
                getEnrollments(),
                getCreditTransactions(),
                getPrograms(),
            ]);

            const childEnrollments = allEnrollments.filter(e => e.studentId === selectedChildId);
            setEnrollments(childEnrollments);
            
            const childEnrollmentIds = new Set(childEnrollments.map(e => e.id));
            setTransactions(allCreditTxs.filter(t => childEnrollmentIds.has(t.enrollmentId)));

            setPrograms(allPrograms);
            setIsLoading(false);

            if (childEnrollments.length > 0 && !selectedProgramId) {
                setSelectedProgramId(childEnrollments[0].id);
            } else if (childEnrollments.length === 0) {
                setSelectedProgramId('');
            }
        };

        fetchData();
    }, [selectedChildId]);

    const sortedEnrollments = useMemo(() => {
        return [...enrollments].sort((a, b) => {
            if (a.status === EnrollmentStatus.ACTIVE && b.status !== EnrollmentStatus.ACTIVE) return -1;
            if (a.status !== EnrollmentStatus.ACTIVE && b.status === EnrollmentStatus.ACTIVE) return 1;
            const lastTxA = transactions.filter(t => t.enrollmentId === a.id).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())[0];
            const lastTxB = transactions.filter(t => t.enrollmentId === b.id).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())[0];
            return (lastTxB ? new Date(lastTxB.date).getTime() : 0) - (lastTxA ? new Date(lastTxA.date).getTime() : 0);
        });
    }, [enrollments, transactions]);
    
    if (children.length === 0) {
        return <ParentPageHeader title="Credit History" />;
    }

    const TabButton: React.FC<{ tabId: 'overview' | 'history'; children: React.ReactNode; }> = ({ tabId, children }) => {
        const isActive = activeTab === tabId;
        return (
            <button
                onClick={() => setActiveTab(tabId)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
                {children}
            </button>
        );
    };

    const renderOverview = () => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Balances Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedEnrollments.map(enrollment => {
                    const totalPurchased = transactions
                        .filter(t => t.enrollmentId === enrollment.id && t.change > 0)
                        .reduce((sum, t) => sum + t.change, 0);
                    
                    const program = programMap.get(enrollment.programId);
                    if (!program) return null;

                    return (
                        <div key={enrollment.id} className={`p-4 rounded-lg flex items-start space-x-4 ${statusStyles[enrollment.status].bg}`}>
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-full mt-1">
                                <BanknotesIcon className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                                <p className={`font-bold ${statusStyles[enrollment.status].text}`}>{program.title}</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{enrollment.creditsRemaining} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Remaining</span></p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchased: {totalPurchased}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderTransactionHistory = () => {
        const enrollment = enrollments.find(e => e.id === selectedProgramId);
        if (!enrollment) {
            return (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
                    <p>Select a program to view its transaction history.</p>
                </div>
            )
        }
        
        const transactionsForProgram = transactions
            .filter(t => t.enrollmentId === selectedProgramId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let runningBalance = enrollment.creditsRemaining;
        const transactionsWithBalance = transactionsForProgram.map(t => {
            const balanceAfter = runningBalance;
            runningBalance -= t.change;
            return { ...t, balanceAfter };
        });

        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                 <div className="flex justify-end mb-4">
                     <select 
                        value={selectedProgramId} 
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                    >
                        {sortedEnrollments.map(e => (
                             <option key={e.id} value={e.id}>{programMap.get(e.programId)?.title}</option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Change</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {transactionsWithBalance.map(t => (
                                <tr key={t.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{t.reason}</td>
                                    <td className={`px-4 py-3 text-center whitespace-nowrap text-sm font-bold ${t.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {t.change > 0 ? `+${t.change}` : t.change}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-gray-200">{t.balanceAfter}</td>
                                </tr>
                            ))}
                             {transactionsWithBalance.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-sm text-gray-500">No transactions found for this program.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <ParentPageHeader title="Credit History" />
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-2">
                <div className="flex space-x-2">
                    <TabButton tabId="overview">Overview</TabButton>
                    <TabButton tabId="history">Transaction History</TabButton>
                </div>
            </div>
            
            <div>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'history' && renderTransactionHistory()}
            </div>
        </div>
    );
};

export default ParentCreditsPage;