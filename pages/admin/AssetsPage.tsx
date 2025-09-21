import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Asset, AssetStatus, User, Role, AssetHistoryEntry } from '../../types';
import { SearchIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon, ClockIcon, ChartPieIcon, ArchiveBoxIcon } from '../../components/icons/Icons';
import AssetFormModal from '../../components/AssetFormModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import AssetHistoryModal from '../../components/AssetHistoryModal';
import { useToast } from '../../contexts/ToastContext';
import { getUsers } from '../../api/userApi';
import { getAssets, saveAssets } from '../../api/assetApi';
import { logAction } from '../../api/auditApi';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import SkeletonLoader from '../../components/SkeletonLoader';
import EmptyState from '../../components/EmptyState';

type SortConfig = {
    key: keyof Asset | 'assignedToNames' | 'typeName';
    direction: 'ascending' | 'descending';
} | null;

const StatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
    const statusColors: Record<AssetStatus, string> = {
        [AssetStatus.AVAILABLE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [AssetStatus.ASSIGNED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [AssetStatus.ARCHIVED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>
};

const AssetsPage: React.FC = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dateAcquired', direction: 'descending' });
    const { addToast } = useToast();
    const { user: adminUser } = useAuth();
    const navigate = useNavigate();
    const { settings } = useSettings();
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [assetForHistory, setAssetForHistory] = useState<Asset | null>(null);
    
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [assetsData, usersData] = await Promise.all([getAssets(), getUsers()]);
            setAssets(assetsData);
            setAllUsers(usersData);
        } catch (error) {
            console.error("Failed to fetch assets data:", error);
            addToast("Failed to load asset data.", "error");
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const assignableUsers = useMemo(() => allUsers.filter(u => u.role !== Role.STUDENT && u.role !== Role.PARENT), [allUsers]);
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [allUsers]);
    const assetTypeMap = useMemo(() => new Map(settings.assetTypes.map(t => [t.id, t.name])), [settings.assetTypes]);

    const filteredAssets = useMemo(() => {
        let enhancedAssets = assets.map(asset => ({
            ...asset,
            assignedToNames: asset.assignedTo.map(id => userMap.get(id) || 'Unknown').join(', '),
            typeName: assetTypeMap.get(asset.typeId) || 'Unknown'
        }));

        let filtered = enhancedAssets.filter(asset =>
            (asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || asset.details.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'all' || asset.status === statusFilter) &&
            (typeFilter === 'all' || asset.typeId === typeFilter)
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const key = sortConfig.key as keyof typeof a;
                if (a[key] < b[key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[key] > b[key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [assets, searchTerm, statusFilter, typeFilter, sortConfig, userMap, assetTypeMap]);

    const requestSort = (key: keyof Asset | 'assignedToNames' | 'typeName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: keyof Asset | 'assignedToNames' | 'typeName') => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };

    const SortableHeader: React.FC<{ sortKey: keyof Asset | 'assignedToNames' | 'typeName'; children: React.ReactNode; }> = ({ sortKey, children }) => (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">{children}<span className="ml-1">{getSortIcon(sortKey)}</span></div>
        </th>
    );

    const handleOpenFormModal = (asset: Asset | null = null) => {
        setEditingAsset(asset);
        setIsFormModalOpen(true);
    };

    const handleSaveAsset = async (assetToSave: Omit<Asset, 'id' | 'dateAcquired' | 'history'>) => {
        const isEditing = !!editingAsset;
        const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin';
        const timestamp = new Date().toISOString();
        let finalAsset: Asset;
        const currentAssets = await getAssets();

        if (isEditing && editingAsset) {
            const historyEntry: AssetHistoryEntry = {
                id: `hist-${Date.now()}`,
                change: 'Asset details updated.',
                changedBy: adminName,
                timestamp,
            };
            finalAsset = { 
                ...editingAsset, 
                ...assetToSave, 
                history: [...editingAsset.history, historyEntry] 
            };
            const newAssets = currentAssets.map(a => a.id === finalAsset.id ? finalAsset : a);
            await saveAssets(newAssets);
            logAction(adminUser, 'ASSET_UPDATED', 'Asset', finalAsset.id, { previousState: editingAsset, changes: finalAsset });
            addToast('Asset updated successfully!');
        } else {
            const historyEntry: AssetHistoryEntry = {
                id: `hist-${Date.now()}`,
                change: 'Asset created.',
                changedBy: adminName,
                timestamp,
            };
            finalAsset = {
                ...assetToSave,
                id: `asset-${Date.now()}`,
                dateAcquired: new Date().toISOString().split('T')[0],
                history: [historyEntry],
            };
            const newAssets = [finalAsset, ...currentAssets];
            await saveAssets(newAssets);
            logAction(adminUser, 'ASSET_CREATED', 'Asset', finalAsset.id, { asset: finalAsset });
            addToast('Asset created successfully!');
        }
        fetchData();
        setIsFormModalOpen(false);
        setEditingAsset(null);
    };

    const handleDeleteClick = (asset: Asset) => {
        setAssetToDelete(asset);
        setIsConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (assetToDelete) {
            const currentAssets = await getAssets();
            const newAssets = currentAssets.filter(a => a.id !== assetToDelete.id);
            await saveAssets(newAssets);
            fetchData();
            logAction(adminUser, 'ASSET_DELETED', 'Asset', assetToDelete.id, { name: assetToDelete.name });
            addToast(`Asset "${assetToDelete.name}" deleted successfully.`);
        }
        setIsConfirmOpen(false);
        setAssetToDelete(null);
    };

    const handleOpenHistoryModal = (asset: Asset) => {
        setAssetForHistory(asset);
        setIsHistoryModalOpen(true);
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
                                placeholder="Search assets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Types</option>
                            {settings.assetTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'all')}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(AssetStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                         <button onClick={() => navigate('/admin/assets/reports')} className="flex items-center justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <ChartPieIcon className="h-5 w-5 mr-2" />
                            View Reports
                        </button>
                        <button onClick={() => handleOpenFormModal()} className="flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Add Asset
                        </button>
                    </div>
                </div>
                
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <SortableHeader sortKey="name">Asset Name</SortableHeader>
                                <SortableHeader sortKey="typeName">Type</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <SortableHeader sortKey="assignedToNames">Assigned To</SortableHeader>
                                <SortableHeader sortKey="dateAcquired">Date Acquired</SortableHeader>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState 
                                            icon={ArchiveBoxIcon}
                                            title="No assets found"
                                            message="Try adjusting your search filters, or add a new asset."
                                            action={{ text: "Add Asset", onClick: () => handleOpenFormModal() }}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map(asset => (
                                    <tr key={asset.id}>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900 dark:text-white">{asset.name}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.typeName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={asset.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.assignedToNames}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{asset.dateAcquired}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-3">
                                                <button onClick={() => handleOpenFormModal(asset)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" title="Edit"><PencilIcon className="h-5 w-5"/></button>
                                                <button onClick={() => handleOpenHistoryModal(asset)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" title="View History"><ClockIcon className="h-5 w-5"/></button>
                                                <button onClick={() => handleDeleteClick(asset)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Delete"><TrashIcon className="h-5 w-5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <AssetFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSave={handleSaveAsset}
                asset={editingAsset}
                assignableUsers={assignableUsers}
            />
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Asset"
                message={`Are you sure you want to delete the asset "${assetToDelete?.name}"? This action cannot be undone.`}
            />
            {assetForHistory && (
                 <AssetHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    asset={assetForHistory}
                />
            )}
        </>
    );
};

export default AssetsPage;