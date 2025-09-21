import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Role, EnrollmentStatus } from '../../types';
import { SearchIcon, DocumentDownloadIcon, ChevronUpIcon, ChevronDownIcon } from '../icons/Icons';
import { useToast } from '../../contexts/ToastContext';
import { DateRange } from '../../pages/admin/ReportsPage';
import { getUsers } from '../../api/userApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getSessions } from '../../api/sessionApi';
import { getPrograms } from '../../api/programApi';

interface StudentReportProps {
    dateRange: DateRange;
}

interface StudentReportData {
    id: string;
    name: string;
    email: string;
    activePrograms: string[];
    totalCredits: number;
    sessionsInPeriod: number;
}

type SortConfig = { key: keyof StudentReportData; direction: 'ascending' | 'descending' } | null;

const StudentReport: React.FC<StudentReportProps> = ({ dateRange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
    const { addToast } = useToast();
    const [reportData, setReportData] = useState<StudentReportData[] | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setReportData(null);
            
            const [users, enrollments, sessions, programs] = await Promise.all([
                getUsers(), getEnrollments(), getSessions(), getPrograms()
            ]);

            const students = users.filter(u => u.role === Role.STUDENT);
            const programMap = new Map(programs.map(p => [p.id, p.title]));

            const data = students.map(student => {
                const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
                const activeEnrollments = studentEnrollments.filter(e => e.status === EnrollmentStatus.ACTIVE);
                
                const sessionsInPeriod = sessions.filter(s => {
                    if (s.studentId !== student.id) return false;
                    if (s.status !== 'Completed') return false;
                    if (!dateRange.start && !dateRange.end) return true;
                    const sessionDate = new Date(s.end || s.start);
                    if (dateRange.start && sessionDate < dateRange.start) return false;
                    if (dateRange.end && sessionDate > dateRange.end) return false;
                    return true;
                }).length;

                return {
                    id: student.id,
                    name: `${student.firstName} ${student.lastName}`,
                    email: student.email,
                    activePrograms: activeEnrollments.map(e => programMap.get(e.programId) || 'Unknown'),
                    totalCredits: activeEnrollments.reduce((sum, e) => sum + e.creditsRemaining, 0),
                    sessionsInPeriod,
                };
            });
            setReportData(data);
        };
        fetchData();
    }, [dateRange]);

    const filteredData = useMemo(() => {
        if (!reportData) return [];
        let filtered = reportData.filter(student => 
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            student.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [reportData, searchTerm, sortConfig]);

    const requestSort = (key: keyof StudentReportData) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig?.key === key && sortConfig?.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: keyof StudentReportData) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    const handleExport = () => {
        const headers = ['Student Name', 'Email', 'Active Programs', 'Total Credits', 'Sessions in Period'];
        const rows = filteredData.map(student => [
            `"${student.name}"`, `"${student.email}"`, `"${student.activePrograms.join(', ')}"`, student.totalCredits, student.sessionsInPeriod
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'student_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('Student report exported!');
    };
    
    const SortableHeader: React.FC<{ sortKey: keyof StudentReportData; children: React.ReactNode; }> = ({ sortKey, children }) => (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">{children}<span className="ml-1">{getSortIcon(sortKey)}</span></div>
        </th>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Student Report</h2>
                <div className="w-full md:w-auto flex items-center gap-2">
                    <div className="relative flex-grow"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/></div>
                    <button onClick={handleExport} className="flex items-center justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"><DocumentDownloadIcon className="h-5 w-5 mr-2" />Export CSV</button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <SortableHeader sortKey="name">Student</SortableHeader>
                            <SortableHeader sortKey="activePrograms">Active Programs</SortableHeader>
                            <SortableHeader sortKey="totalCredits">Total Credits</SortableHeader>
                            <SortableHeader sortKey="sessionsInPeriod">Sessions in Period</SortableHeader>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {!reportData ? (
                            <tr><td colSpan={4} className="text-center p-8">Loading report...</td></tr>
                        ) : (
                            filteredData.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            <Link to={`/admin/users/${student.id}`} className="hover:underline text-primary-600 dark:text-primary-400">{student.name}</Link>
                                        </div>
                                        <div className="text-xs text-gray-500">{student.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{student.activePrograms.join(', ') || 'None'}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-center text-gray-800 dark:text-gray-200">{student.totalCredits}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-center text-gray-800 dark:text-gray-200">{student.sessionsInPeriod}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentReport;