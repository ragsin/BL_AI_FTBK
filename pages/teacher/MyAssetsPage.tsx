import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Asset } from '../../types';
import { SearchIcon, DocumentDuplicateIcon, ArchiveBoxIcon } from '../../components/icons/Icons';
// FIX: Changed imports from mockData to api files
import { getAssets } from '../../api/assetApi';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';

const AssetCard: React.FC<{ asset: Asset & { typeName: string } }> = ({ asset }) => {
    const { addToast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(asset.details)
            .then(() => {
                addToast('Asset details copied to clipboard!');
            })
            .catch(err => {
                addToast('Failed to copy details.', 'error');
                console.error('Failed to copy text: ', err);
            });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md flex flex-col">
            <div className="p-6 flex-grow">
                <div className="flex justify-between items-start">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">{asset.typeName}</span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{asset.name}</h3>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 h-24 overflow-auto whitespace-pre-wrap font-mono">
                    {asset.details}
                </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 mt-auto">
                <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600"
                >
                    <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                    Copy Details
                </button>
            </div>
        </div>
    );
};


const MyAssetsPage: React.FC = () => {
    const { user: teacher } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const { settings } = useSettings();
    const assetTypeMap = useMemo(() => new Map(settings.assetTypes.map(t => [t.id, t.name])), [settings.assetTypes]);
    
    // FIX: Use state for async data
    const [myAssets, setMyAssets] = useState<(Asset & { typeName: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAssets = async () => {
            if (!teacher) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const allAssets = await getAssets();
            const teacherAssets = allAssets
                .filter(asset => asset.assignedTo.includes(teacher.id))
                .map(asset => ({
                    ...asset,
                    typeName: assetTypeMap.get(asset.typeId) || 'Unknown'
                }));
            setMyAssets(teacherAssets);
            setIsLoading(false);
        };
        fetchAssets();
    }, [teacher, assetTypeMap]);


    const filteredAssets = useMemo(() => {
        return myAssets.filter(asset =>
            asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.typeName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [myAssets, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Assets</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        These are the shared resources assigned to you.
                    </p>
                </div>
                 <div className="w-full md:w-1/3">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search my assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
            </div>

            {isLoading ? <p>Loading assets...</p> : filteredAssets.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                    <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assets found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'Try adjusting your search.' : 'You have no assets assigned to you.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAssets.map(asset => (
                       <AssetCard key={asset.id} asset={asset} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyAssetsPage;