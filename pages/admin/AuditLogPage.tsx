import React, { useState, useMemo, useEffect } from 'react';
// FIX: Changed imports from mockData to api files
import { getAuditLogs } from '../../api/auditApi';
import { getUsers } from '../../api/userApi';
// FIX: Add Program type import
import { AuditLog, User, Program } from '../../types';
import { SearchIcon, ClipboardListIcon, XIcon, EyeIcon } from '../../components/icons/Icons';
import AuditLogDetailsModal from '../../components/AuditLogDetailsModal';
import { useSettings } from '../../contexts/SettingsContext';
import { getPrograms } from '../../api/programApi';
import Pagination from '../../components/Pagination';

const ACTION_TYPES = [
    'ANNOUNCEMENT_DELETED', 'ANNOUNCEMENT_SENT',
    'ASSET_CREATED', 'ASSET_DELETED', 'ASSET_UPDATED',
    'CREDITS_ADJUSTED',
    'CURRICULUM_CONTENT_DELETED', 'CURRICULUM_IMPORTED', 
    'CURRICULUM_ITEM_CREATED', 'CURRICULUM_ITEM_DELETED', 'CURRICULUM_ITEM_UPDATED',
    'ENROLLMENT_CREATED', 'ENROLLMENT_UPDATED',
    'PROGRAM_CLONED', 'PROGRAM_CREATED', 'PROGRAM_DELETED', 'PROGRAM_UPDATED',
    'REVENUE_ENTRY_CREATED', 'REVENUE_ENTRY_DELETED', 'REVENUE_ENTRY_UPDATED',
    'SESSION_CANCELLED', 'SESSION_CREATED', 'SESSION_RECURRING_CREATED', 'SESSION_UPDATED',
    'SETTINGS_UPDATED',
    'USER_ACTIVATED', 'USER_CREATED', 'USER_DEACTIVATED', 'USER_PASSWORD_RESET', 'USER_UPDATED',
].sort();

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const { settings } = useSettings();
    const [programs, setPrograms] = useState<Program[]>([]);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        const fetchData = async () => {
            const [logsData, usersData, programsData] = await Promise.all([
                getAuditLogs(),
                getUsers(),
                getPrograms(),
            ]);
            setLogs(logsData);
            setUsers(usersData);
            setPrograms(programsData);
        };
        fetchData();
    }, []);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [users]);
    const programMap = useMemo(() => new Map(programs.map(p => [p.id, p.title])), [programs]);
    const categoryMap = useMemo(() => new Map(settings.programCategories.map(c => [c.id, c.name])), [settings.programCategories]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            const start = startDate ? new Date(startDate) : null;
            if (start) start.setHours(0,0,0,0);
            const end = endDate ? new Date(endDate) : null;
            if(end) end.setHours(23,59,59,999);

            return (
                (userFilter === 'all' || log.userId === userFilter) &&
                (actionFilter === 'all' || log.action === actionFilter) &&
                (!start || logDate >= start) &&
                (!end || logDate <= end) &&
                (
                    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        });
    }, [logs, userFilter, actionFilter, startDate, endDate, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredLogs]);

    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLogs, currentPage]);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Audit Log</h1>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                            <option value="all">All Users</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                        </select>
                         <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                            <option value="all">All Actions</option>
                            {ACTION_TYPES.map(action => <option key={action} value={action}>{action}</option>)}
                        </select>
                        <div className="flex items-center gap-2 lg:col-span-2">
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3 w-full"/>
                             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3 w-full"/>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Timestamp</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Entity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                                            <div className="text-xs">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{log.userName}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm"><span className="px-2 py-1 font-mono text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{log.action}</span></td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{log.entityType}: {log.entityId}</td>
                                        <td className="px-4 py-3"><button onClick={() => setSelectedLog(log)} className="text-primary-600 hover:text-primary-800"><EyeIcon className="h-5 w-5"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     {filteredLogs.length === 0 && (
                        <div className="text-center py-12">
                             <ClipboardListIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No logs found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
                        </div>
                    )}
                    {totalPages > 1 && (
                       <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            itemsPerPage={itemsPerPage}
                            totalItems={filteredLogs.length}
                       />
                    )}
                </div>
            </div>
            <AuditLogDetailsModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
                userMap={userMap}
                programMap={programMap}
                categoryMap={categoryMap}
            />
        </>
    );
};

export default AuditLogPage;
