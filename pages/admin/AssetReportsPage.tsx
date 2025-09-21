import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import AssetReport from '../../components/reports/AssetReport';
import { DateRange } from './ReportsPage';

const AssetReportsPage: React.FC = () => {
    const navigate = useNavigate();

    // The AssetReport component requires a dateRange prop.
    // Since this page doesn't have date filters, we'll pass a default "all time" range.
    const dateRange: DateRange = { start: null, end: null };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/admin/assets')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Go back">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Asset Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400">An overview of company resource distribution.</p>
                </div>
            </div>
            <AssetReport dateRange={dateRange} />
        </div>
    );
};

export default AssetReportsPage;