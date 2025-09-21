import React, { useState, useMemo, useEffect } from 'react';
import { ProgramStatus, EnrollmentStatus } from '../../types';
import { SearchIcon, DocumentDownloadIcon, ChevronUpIcon, ChevronDownIcon } from '../icons/Icons';
import { useToast } from '../../contexts/ToastContext';
import { DateRange } from '../../pages/admin/ReportsPage';
import { getPrograms } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getSessions } from '../../api/sessionApi';

interface ProgramReportProps {
    dateRange: DateRange;
}

interface ProgramReportData {
    id: string;
    title: string;
    status: ProgramStatus;
    studentCount: number;
    teacherCount: number;
    sessionsInPeriod: number;
}

type SortConfig = { key: keyof ProgramReportData; direction: 'ascending' | 'descending' } | null;

const StatusBadge: React.FC<{ status: ProgramStatus }> = ({ status }) => {
    const statusColors: Record<ProgramStatus, string> = {
        [ProgramStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [ProgramStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [ProgramStatus.ARCHIVED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>;
};

const ProgramReport: React.FC<ProgramReportProps> = ({ dateRange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'all'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'title', direction: 'ascending' });
    const { addToast } = useToast();
    const [reportData, setReportData] = useState<ProgramReportData[] | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setReportData(null);
            
            const [programs, enrollments, sessions] = await Promise.all([
                getPrograms(), getEnrollments(), getSessions()
            ]);

            const data = programs.map(program => {
                const programEnrollments = enrollments.filter(e => e.programId === program.id && e.status === EnrollmentStatus.ACTIVE);
                const studentIds = new Set(programEnrollments.map(e => e.studentId));
                const teacherIds = new Set(programEnrollments.map(e => e.teacherId));
                
                const sessionsInPeriod = sessions.filter(s => {
                    if (s.programId !== program.id) return false;
                    if (!dateRange.start && !dateRange.end) return true;
                    const sessionDate = new Date(s.start);
                    if (dateRange.start && sessionDate < dateRange.start) return false;
                    if (dateRange.end && sessionDate > dateRange.end) return false;
                    return true;
                }).length;

                return {
                    id: program.id,
                    title: program.title,
                    status: program.status,
                    studentCount: studentIds.size,
                    teacherCount: teacherIds.size,
                    sessionsInPeriod,
                };
            });
            setReportData(data);
        };
        fetchData();
    }, [dateRange]);

    const filteredData = useMemo(() => {
        if (!reportData) return [];
        let filtered = reportData.filter(program => 
            (program.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'all' || program.status === statusFilter)
        );
        if (sortConfig) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [reportData, searchTerm, statusFilter, sortConfig]);

    const requestSort = (key: keyof ProgramReportData) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig?.key === key && sortConfig?.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: keyof ProgramReportData) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    const handleExport = () => {
        const headers = ['Program Title', 'Status', 'Active Students', 'Assigned Teachers', 'Sessions in Period'];
        const rows = filteredData.map(p => [
            `"${p.title}"`, p.status, p.studentCount, p.teacherCount, p.sessionsInPeriod
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', 'program_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Program report exported!');
    };

    const SortableHeader: React.FC<{ sortKey: keyof ProgramReportData; children: React.ReactNode; }> = ({ sortKey, children }) => (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">{children}<span className="ml-1">{getSortIcon(sortKey)}</span></div>
        </th>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Program Report</h2>
                 <div className="w-full md:w-auto flex items-center gap-2">
                    <div className="relative flex-grow"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search programs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/></div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ProgramStatus | 'all')} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                        <option value="all">All Statuses</option>
                        {Object.values(ProgramStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={handleExport} className="flex items-center justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"><DocumentDownloadIcon className="h-5 w-5 mr-2" />Export CSV</button>
                </div>
            </div>
             <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <SortableHeader sortKey="title">Program</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                            <SortableHeader sortKey="studentCount">Active Students</SortableHeader>
                            <SortableHeader sortKey="teacherCount">Assigned Teachers</SortableHeader>
                            <SortableHeader sortKey="sessionsInPeriod">Sessions in Period</SortableHeader>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {!reportData ? (
                             <tr><td colSpan={5} className="text-center p-8">Loading report...</td></tr>
                        ) : (
                            filteredData.map(program => (
                                <tr key={program.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 whitespace-nowrap"><div className="font-medium text-gray-900 dark:text-white">{program.title}</div></td>
                                    <td className="px-4 py-3"><StatusBadge status={program.status} /></td>
                                    <td className="px-4 py-3 text-sm font-semibold text-center text-gray-800 dark:text-gray-200">{program.studentCount}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-center text-gray-800 dark:text-gray-200">{program.teacherCount}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-center text-gray-800 dark:text-gray-200">{program.sessionsInPeriod}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProgramReport;