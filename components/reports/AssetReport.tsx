import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Asset, User, Role, AssetStatus } from '../../types';
import { DateRange } from '../../pages/admin/ReportsPage';
import { useSettings } from '../../contexts/SettingsContext';
import { getAssets } from '../../api/assetApi';
import { getUsers } from '../../api/userApi';

const COLORS = {
    [AssetStatus.AVAILABLE]: '#10b981', // green
    [AssetStatus.ASSIGNED]: '#f59e0b',  // yellow
    [AssetStatus.ARCHIVED]: '#6b7280',   // gray
};
const TYPE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#eab308'];

interface AssetReportProps {
    dateRange: DateRange;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
          <p className="label">{`${payload[0].name} : ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
};

const AssetReport: React.FC<AssetReportProps> = ({ dateRange }) => {
    const { settings } = useSettings();
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setReportData(null);
            
            let [assets, allUsers] = await Promise.all([getAssets(), getUsers()]);
            const assetTypeMap = new Map(settings.assetTypes.map(t => [t.id, t.name]));
            
            if (dateRange.start || dateRange.end) {
                assets = assets.filter(asset => {
                    const acquiredDate = new Date(asset.dateAcquired);
                    if (dateRange.start && acquiredDate < dateRange.start) return false;
                    if (dateRange.end && acquiredDate > dateRange.end) return false;
                    return true;
                });
            }
            
            const assignableUsers = allUsers.filter(u => u.role !== Role.STUDENT && u.role !== Role.PARENT);
            const userMap = new Map(allUsers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));

            const statusCounts = assets.reduce((acc, asset) => {
                acc[asset.status] = (acc[asset.status] || 0) + 1;
                return acc;
            }, {} as Record<AssetStatus, number>);
            const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
            
            const typeCounts = assets.reduce((acc, asset) => {
                const typeName = assetTypeMap.get(asset.typeId) || 'Unknown';
                acc[typeName] = (acc[typeName] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
            
            const userAllocation: { name: string, count: number, assets: string[] }[] = assignableUsers.map(user => {
                const assignedAssets = assets.filter(asset => asset.assignedTo.includes(user.id));
                return {
                    name: userMap.get(user.id) || 'Unknown',
                    count: assignedAssets.length,
                    assets: assignedAssets.map(a => a.name)
                };
            });

            const unassignedAssets = assets.filter(asset => asset.status === AssetStatus.AVAILABLE).map(asset => ({
                ...asset,
                typeName: assetTypeMap.get(asset.typeId) || 'Unknown'
            }));

            setReportData({ statusData, typeData, userAllocation, unassignedAssets });
        };
        fetchData();
    }, [dateRange, settings.assetTypes]);

    const reportTitle = `Asset Analysis${dateRange.start ? ' (Acquired in Period)' : ''}`;

    if (!reportData) {
        return <div className="text-center p-8">Loading asset report...</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{reportTitle}</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Assets by Status</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={reportData.statusData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" labelLine={false} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {reportData.statusData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as AssetStatus]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Assets by Type</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={reportData.typeData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" labelLine={false} label={({ percent }: any) => `${((percent || 0) * 100).toFixed(0)}%`}>
                                {reportData.typeData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                                ))}
                            </Pie>
                             <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Asset Allocation by User</h3>
                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full text-sm">
                           <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0"><tr className="text-left text-gray-500 dark:text-gray-400">
                                <th className="p-2">User</th><th className="p-2">Asset Count</th>
                            </tr></thead>
                            <tbody>
                                {reportData.userAllocation.sort((a: any,b: any) => b.count - a.count).map((user: any) => (
                                    <tr key={user.name} className="border-t dark:border-gray-700">
                                        <td className="p-2 font-semibold text-gray-800 dark:text-gray-200" title={user.assets.join('\n')}>{user.name}</td>
                                        <td className="p-2 text-center">{user.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Unassigned Assets</h3>
                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full text-sm">
                           <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0"><tr className="text-left text-gray-500 dark:text-gray-400">
                                <th className="p-2">Asset Name</th><th className="p-2">Type</th>
                            </tr></thead>
                            <tbody>
                                {reportData.unassignedAssets.map((asset: any) => (
                                    <tr key={asset.id} className="border-t dark:border-gray-700">
                                        <td className="p-2 font-semibold text-gray-800 dark:text-gray-200">{asset.name}</td>
                                        <td className="p-2">{asset.typeName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetReport;