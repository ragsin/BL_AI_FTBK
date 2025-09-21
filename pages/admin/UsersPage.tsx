import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Role, UserStatus } from '../../types';
import { SearchIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, EyeIcon, PowerIcon, UsersIcon, InformationCircleIcon, XIcon, ExclamationTriangleIcon, DocumentDownloadIcon, KeyIcon } from '../../components/icons/Icons';
import UserFormModal from '../../components/UserFormModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, saveUsers } from '../../api/userApi';
import { logAction } from '../../api/auditApi';
import SkeletonLoader from '../../components/SkeletonLoader';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import ResetPasswordModal from '../../components/ResetPasswordModal';


type SortableUserKeys = keyof User | 'email';

type SortConfig = {
    key: SortableUserKeys;
    direction: 'ascending' | 'descending';
} | null;

const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
    const roleColors: Record<Role, string> = {
        [Role.ADMIN]: 'bg-danger-100 text-danger-800',
        [Role.TEACHER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        [Role.STUDENT]: 'bg-success-100 text-success-800',
        [Role.PARENT]: 'bg-warning-100 text-warning-800',
        [Role.FINANCE]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
        [Role.SCHEDULER]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        [Role.SALES]: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[role]}`}>{role}</span>
}

const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
    const statusColors = {
        [UserStatus.ACTIVE]: 'bg-success-100 text-success-800',
        [UserStatus.INACTIVE]: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>
}

const DEFAULT_ADMIN_EMAIL = 'admin@brainleaf.com';

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastName', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const { addToast } = useToast();
    const { user: currentUser, impersonate } = useAuth();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);

    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
    const [userToToggle, setUserToToggle] = useState<User | null>(null);

    const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const triggerElementRef = useRef<HTMLElement | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const studentIdsToGrade: string[] | undefined = location.state?.studentIdsToGrade;
    const atRiskStudentIds: string[] | undefined = location.state?.atRiskStudentIds;

    const fetchData = useCallback(async () => {
        const usersData = await getUsers();
        setUsers(usersData);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            fetchData();
            setIsLoading(false);
        }, 750);
        return () => clearTimeout(timer);
    }, [fetchData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, statusFilter, studentIdsToGrade, atRiskStudentIds]);

    const filteredUsers = useMemo(() => {
        let baseUsers = users;
        if (studentIdsToGrade) {
            baseUsers = users.filter(u => studentIdsToGrade.includes(u.id));
        } else if (atRiskStudentIds) {
            baseUsers = users.filter(u => atRiskStudentIds.includes(u.id));
        }

        let filtered = baseUsers.filter(user =>
            (`${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (roleFilter === 'all' || user.role === roleFilter) &&
            (statusFilter === 'all' || user.status === statusFilter)
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                // Secondary sort for name
                if (sortConfig.key === 'lastName') {
                    return a.firstName.localeCompare(b.firstName);
                }
                return 0;
            });
        }
        return filtered;
    }, [users, searchTerm, roleFilter, statusFilter, sortConfig, studentIdsToGrade, atRiskStudentIds]);
    
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const paginatedUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const requestSort = (key: SortableUserKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableUserKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        }
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: SortableUserKeys; children: React.ReactNode }> = ({ sortKey, children }) => (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <span className="ml-1">{getSortIcon(sortKey)}</span>
            </div>
        </th>
    );

    const handleOpenModal = (user: User | null = null, event?: React.MouseEvent<HTMLButtonElement>) => {
        if (event) {
            triggerElementRef.current = event.currentTarget;
        }
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        triggerElementRef.current?.focus();
    };

    const handleSaveUser = async (userToSave: User) => {
        const isEditing = !!editingUser;
        const currentUsers = await getUsers();
        let newUsers;
        if (isEditing && editingUser) {
            const originalUser = currentUsers.find(u => u.id === editingUser.id);
            newUsers = currentUsers.map(u => (u.id === userToSave.id ? userToSave : u));
            await logAction(currentUser, 'USER_UPDATED', 'User', userToSave.id, { previousState: originalUser, changes: userToSave });
        } else {
            newUsers = [userToSave, ...currentUsers];
            await logAction(currentUser, 'USER_CREATED', 'User', userToSave.id, { user: userToSave });
        }
        await saveUsers(newUsers);
        fetchData();
        addToast(`User ${isEditing ? 'updated' : 'created'} successfully!`);
        handleCloseModal();
    };
    
    const handleToggleStatusClick = (user: User) => {
        setUserToToggle(user);
        setIsStatusConfirmOpen(true);
    };

    const handleToggleStatusConfirm = async () => {
        if (!userToToggle) return;
        
        const currentUsers = await getUsers();
        const originalUser = currentUsers.find(u => u.id === userToToggle.id);
        const newStatus = userToToggle.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
        const action = newStatus === UserStatus.ACTIVE ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
        const updatedUser = { ...userToToggle, status: newStatus };
    
        const newUsers = currentUsers.map(user => user.id === userToToggle.id ? updatedUser : user);
        
        await saveUsers(newUsers);
        fetchData();
        addToast(`User "${userToToggle.firstName} ${userToToggle.lastName}" has been ${newStatus === UserStatus.ACTIVE ? 'activated' : 'deactivated'}.`);
        await logAction(currentUser, action, 'User', userToToggle.id, { previousState: originalUser, changes: updatedUser });
        
        setIsStatusConfirmOpen(false);
        setUserToToggle(null);
    };

    const handleResetPasswordClick = (user: User) => {
        setUserToReset(user);
        setIsResetPasswordModalOpen(true);
    };

    const handleResetPasswordSave = async (password: string) => {
        if (!userToReset || !currentUser) return;
        const updatedUser = { ...userToReset, password };
        const currentUsers = await getUsers();
        const newUsers = currentUsers.map(u => (u.id === userToReset.id ? updatedUser : u));
        await saveUsers(newUsers);
        fetchData();
        await logAction(currentUser, 'USER_PASSWORD_RESET', 'User', userToReset.id, { reset_by: currentUser.username });
        addToast(`Password for ${userToReset.firstName} ${userToReset.lastName} has been reset.`);
        setIsResetPasswordModalOpen(false);
        setUserToReset(null);
    };


    const handleSelectUser = (userId: string) => {
        const newSelection = new Set(selectedUserIds);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedUserIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allSelectableIds = filteredUsers
                .filter(u => u.id !== currentUser?.id && u.email !== DEFAULT_ADMIN_EMAIL)
                .map(u => u.id);
            setSelectedUserIds(new Set(allSelectableIds));
        } else {
            setSelectedUserIds(new Set());
        }
    };

    const handleBulkAction = async (status: UserStatus) => {
        let updatedCount = 0;
        const action = status === UserStatus.ACTIVE ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
        const updatedUserIds: string[] = [];
        const currentUsers = await getUsers();

        const newUsers = currentUsers.map(user => {
            if (selectedUserIds.has(user.id)) {
                 if ((user.id === currentUser?.id || user.email === DEFAULT_ADMIN_EMAIL) && status === UserStatus.INACTIVE) {
                    addToast(`The user "${user.firstName} ${user.lastName}" cannot be deactivated.`, "error");
                    return user;
                }
                updatedCount++;
                updatedUserIds.push(user.id);
                return { ...user, status };
            }
            return user;
        });
        await saveUsers(newUsers);
        fetchData();

        if(updatedCount > 0){
            addToast(`${updatedCount} users updated to "${status}".`);
            await logAction(currentUser, 'USER_BULK_STATUS_CHANGE', 'User', 'multiple', { userIds: updatedUserIds, newStatus: status });
        }
        setSelectedUserIds(new Set());
        setIsBulkActionsOpen(false);
    };

    const handleClearFilter = () => {
        navigate('/admin/users', { replace: true, state: {} });
    };

    const handleExportCSV = () => {
        const headers = ['User ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Parent ID', 'Date Added', 'Last Login'];
        const rows = filteredUsers.map(user => [
            user.id,
            `"${user.firstName}"`,
            `"${user.lastName}"`,
            user.email,
            `"${user.phone || ''}"`,
            user.role,
            user.status,
            `"${user.parentId || ''}"`,
            user.dateAdded,
            user.lastLogin,
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast('User data exported successfully!');
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
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Management</h1>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 mb-4">
                    <div className="w-full md:w-1/3">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {selectedUserIds.size > 0 && (
                            <div className="relative">
                                <button onClick={() => setIsBulkActionsOpen(!isBulkActionsOpen)} className="w-full sm:w-auto text-sm bg-gray-200 dark:bg-gray-600 px-3 py-2 rounded-lg flex items-center justify-center">
                                    Bulk Actions ({selectedUserIds.size}) <ChevronDownIcon className="h-4 w-4 ml-2"/>
                                </button>
                                {isBulkActionsOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-700">
                                        <button onClick={() => handleBulkAction(UserStatus.ACTIVE)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Activate Selected</button>
                                        <button onClick={() => handleBulkAction(UserStatus.INACTIVE)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Deactivate Selected</button>
                                    </div>
                                )}
                            </div>
                        )}
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Roles</option>
                            {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                         <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(UserStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <button onClick={handleExportCSV} className="flex items-center justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <DocumentDownloadIcon className="h-5 w-5 mr-2" />
                            Export CSV
                        </button>
                        <button onClick={(e) => handleOpenModal(null, e)} className="flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Add User
                        </button>
                    </div>
                </div>

                {studentIdsToGrade && (
                    <div className="bg-info-100 dark:bg-info-800/30 text-info-800 dark:text-info-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <InformationCircleIcon className="h-5 w-5 mr-2"/>
                            <p className="text-sm font-medium">Showing students with assignments to grade.</p>
                        </div>
                        <button onClick={handleClearFilter} className="flex items-center text-sm font-semibold hover:underline">
                            <XIcon className="h-4 w-4 mr-1" />
                            Clear Filter
                        </button>
                    </div>
                )}

                {atRiskStudentIds && (
                    <div className="bg-warning-100 dark:bg-warning-800/30 text-warning-800 dark:text-warning-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2"/>
                            <p className="text-sm font-medium">Showing students identified as at-risk.</p>
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
                                <th className="px-6 py-3"><input type="checkbox" onChange={handleSelectAll} checked={selectedUserIds.size > 0 && selectedUserIds.size === filteredUsers.filter(u=> u.id !== currentUser?.id && u.email !== DEFAULT_ADMIN_EMAIL).length} className="rounded" /></th>
                                <SortableHeader sortKey="lastName">Name</SortableHeader>
                                <SortableHeader sortKey="email">Email</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                                <SortableHeader sortKey="role">Role</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <EmptyState 
                                            icon={UsersIcon}
                                            title="No users found"
                                            message="Try adjusting your search or filter criteria to find what you're looking for."
                                            action={!studentIdsToGrade ? { text: "Add User", onClick: (e) => handleOpenModal(null) } : undefined}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map(user => {
                                    const isProtectedUser = user.id === currentUser?.id || user.email === DEFAULT_ADMIN_EMAIL;
                                    return (
                                    <tr key={user.id} className={selectedUserIds.has(user.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''}>
                                        <td className="px-6 py-4"><input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => handleSelectUser(user.id)} className="rounded" disabled={isProtectedUser}/></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="h-10 w-10 rounded-full" src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                                                <div className="ml-4">
                                                    <Link to={`/admin/users/${user.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:underline">{user.firstName} {user.lastName}</Link>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={user.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-3">
                                                <button onClick={(e) => handleOpenModal(user, e)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" aria-label={`Edit ${user.firstName} ${user.lastName}`}><PencilIcon className="h-5 w-5"/></button>
                                                <button onClick={() => handleResetPasswordClick(user)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" title="Reset Password" aria-label={`Reset password for ${user.firstName} ${user.lastName}`}><KeyIcon className="h-5 w-5"/></button>
                                                <button 
                                                    onClick={() => handleToggleStatusClick(user)}
                                                    className={`disabled:opacity-30 disabled:cursor-not-allowed ${user.status === UserStatus.ACTIVE ? 'text-warning-500 hover:text-warning-700' : 'text-success-500 hover:text-success-700'}`}
                                                    title={user.status === UserStatus.ACTIVE ? 'Deactivate' : 'Activate'}
                                                    aria-label={user.status === UserStatus.ACTIVE ? `Deactivate ${user.firstName}` : `Activate ${user.firstName}`}
                                                    disabled={isProtectedUser && user.status === UserStatus.ACTIVE}
                                                >
                                                    <PowerIcon className="h-5 w-5"/>
                                                </button>
                                                <button 
                                                    onClick={() => impersonate(user)} 
                                                    className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" 
                                                    title="Impersonate"
                                                    aria-label={`Impersonate ${user.firstName} ${user.lastName}`}
                                                    disabled={currentUser?.id === user.id}
                                                >
                                                    <EyeIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredUsers.length}
                        itemsPerPage={usersPerPage}
                    />
                )}
            </div>
        </div>
        <UserFormModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveUser}
            user={editingUser}
        />
        <ConfirmationModal
            isOpen={isStatusConfirmOpen}
            onClose={() => {
                setIsStatusConfirmOpen(false);
                setUserToToggle(null);
            }}
            onConfirm={handleToggleStatusConfirm}
            title={`${userToToggle?.status === UserStatus.ACTIVE ? 'Deactivate' : 'Activate'} User`}
            message={`Are you sure you want to ${userToToggle?.status === UserStatus.ACTIVE ? 'deactivate' : 'activate'} the account for "${userToToggle?.firstName} ${userToToggle?.lastName}"? ${userToToggle?.status === UserStatus.ACTIVE ? 'They will no longer be able to log in.' : 'They will regain access to the platform.'}`}
        />
        <ResetPasswordModal
            isOpen={isResetPasswordModalOpen}
            onClose={() => setIsResetPasswordModalOpen(false)}
            onSave={handleResetPasswordSave}
            user={userToReset}
        />
        </>
    );
};

export default UsersPage;
