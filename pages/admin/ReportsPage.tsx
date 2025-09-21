import React, { useState, useMemo } from 'react';
import OverviewReport from '../../components/reports/OverviewReport';
import StudentReport from '../../components/reports/StudentReport';
import TeacherReport from '../../components/reports/TeacherReport';
import ProgramReport from '../../components/reports/ProgramReport';
import AssetReport from '../../components/reports/AssetReport';
import FinancialReport from '../../components/reports/FinancialReport';
import PerformanceReport from '../../components/reports/PerformanceReport';
import { ChartPieIcon, UsersIcon, AcademicCapIcon, BookOpenIcon, ArchiveBoxIcon, BanknotesIcon, TrophyIcon } from '../../components/icons/Icons';

type Tab = 'overview' | 'student' | 'teacher' | 'program' | 'asset' | 'financial' | 'performance';

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

const ReportsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [dateFilter, setDateFilter] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const dateRange = useMemo((): DateRange => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        let start = new Date();
        start.setHours(0, 0, 0, 0);

        switch (dateFilter) {
            case '7days':
                start.setDate(end.getDate() - 7);
                return { start, end };
            case '30days':
                start.setDate(end.getDate() - 30);
                return { start, end };
            case 'thisMonth':
                start = new Date(end.getFullYear(), end.getMonth(), 1);
                return { start, end };
            case 'custom':
                const customStart = customStartDate ? new Date(customStartDate) : null;
                if(customStart) customStart.setHours(0,0,0,0);

                const customEnd = customEndDate ? new Date(customEndDate) : null;
                if(customEnd) customEnd.setHours(23,59,59,999);
                return { start: customStart, end: customEnd };
            case 'all':
            default:
                return { start: null, end: null };
        }
    }, [dateFilter, customStartDate, customEndDate]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewReport dateRange={dateRange} />;
            case 'student': return <StudentReport dateRange={dateRange} />;
            case 'teacher': return <TeacherReport dateRange={dateRange} />;
            case 'program': return <ProgramReport dateRange={dateRange} />;
            case 'asset': return <AssetReport dateRange={dateRange} />;
            case 'financial': return <FinancialReport dateRange={dateRange} />;
            case 'performance': return <PerformanceReport dateRange={dateRange} />;
            default: return null;
        }
    };

    const TabButton: React.FC<{ tabName: Tab; label: string; icon: React.ElementType }> = ({ tabName, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tabName
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600'
                }`}
        >
            <Icon className="h-5 w-5 mr-2" />
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reports Center</h1>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-4">
                        <label htmlFor="dateFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range:</label>
                        <select
                            id="dateFilter"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Time</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="thisMonth">This Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        {dateFilter === 'custom' && (
                            <>
                                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"/>
                                <span className="text-gray-500">to</span>
                                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"/>
                            </>
                        )}
                    </div>
                </div>
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto px-4" aria-label="Tabs">
                        <TabButton tabName="overview" label="Overview" icon={ChartPieIcon} />
                        <TabButton tabName="student" label="Student Reports" icon={UsersIcon} />
                        <TabButton tabName="teacher" label="Teacher Reports" icon={AcademicCapIcon} />
                        <TabButton tabName="program" label="Program Reports" icon={BookOpenIcon} />
                        <TabButton tabName="asset" label="Asset Reports" icon={ArchiveBoxIcon} />
                        <TabButton tabName="financial" label="Financial Reports" icon={BanknotesIcon} />
                        <TabButton tabName="performance" label="Performance" icon={TrophyIcon} />
                    </nav>
                </div>
                <div className="p-4 md:p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;