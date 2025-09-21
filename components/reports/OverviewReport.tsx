import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Role, EnrollmentStatus } from '../../types';
import { UsersIcon, AcademicCapIcon, CurrencyDollarIcon, CalendarIcon, ClipboardListIcon } from '../icons/Icons';
import { DateRange } from '../../pages/admin/ReportsPage';
import { useSettings } from '../../contexts/SettingsContext';
import { getRevenueTransactions } from '../../api/revenueApi';
import { getUsers } from '../../api/userApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getSessions } from '../../api/sessionApi';

interface OverviewReportProps {
    dateRange: DateRange;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl flex items-center space-x-4">
    <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full">
      <Icon className="h-6 w-6 text-primary-500" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
);

const OverviewReport: React.FC<OverviewReportProps> = ({ dateRange }) => {
    const { formatCurrency } = useSettings();
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setReportData(null); // Reset on date change to show loading

            const filterByDate = <T extends { date?: string; dateAdded?: string; dateEnrolled?: string; start?: string; end?: string; }>(items: T[], dateField: keyof T): T[] => {
                if (!dateRange.start && !dateRange.end) return items;
                return items.filter(item => {
                    const itemDateStr = item[dateField] as string | undefined;
                    if (!itemDateStr) return false;
                    const itemDate = new Date(itemDateStr);
                    if (dateRange.start && itemDate < dateRange.start) return false;
                    if (dateRange.end && itemDate > dateRange.end) return false;
                    return true;
                });
            };
            
            const [revenue, users, enrollments, sessions] = await Promise.all([
                getRevenueTransactions(),
                getUsers(),
                getEnrollments(),
                getSessions()
            ]);

            const filteredRevenue = filterByDate(revenue, 'date');
            const newStudents = filterByDate(users.filter(u => u.role === Role.STUDENT), 'dateAdded');
            const newEnrollments = filterByDate(enrollments, 'dateEnrolled');
            const completedSessions = filterByDate(sessions.filter(s => s.status === 'Completed'), 'end');
            
            const netRevenue = filteredRevenue.reduce((sum, t) => sum + (t.conversionRate ? t.price * t.conversionRate : t.price), 0);

            const rangeInDays = (dateRange.end && dateRange.start) ? (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 3600 * 24) : 90;
            const groupByMonth = !dateRange.start || rangeInDays > 90;
            const formatKey = (date: Date) => groupByMonth ? date.toLocaleString('default', { month: 'short', year: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            const revenueByDate = filteredRevenue.reduce((acc, t) => {
                const key = formatKey(new Date(t.date));
                const revenueVal = t.conversionRate ? t.price * t.conversionRate : t.price;
                acc[key] = (acc[key] || 0) + revenueVal;
                return acc;
            }, {} as Record<string, number>);

            const chartData = Object.entries(revenueByDate)
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

            setReportData({
                netRevenue,
                newStudents: newStudents.length,
                newEnrollments: newEnrollments.length,
                completedSessions: completedSessions.length,
                chartData,
            });
        };
        fetchData();
    }, [dateRange]);
    
    const dateRangeTitle = dateRange.start ? ' (Period)' : '';
    
    if (!reportData) {
        return (
             <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                     <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                     <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                     <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                     <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                 </div>
                 <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
             </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Business Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={`Net Revenue${dateRangeTitle}`} value={formatCurrency(reportData.netRevenue)} icon={CurrencyDollarIcon} />
                <StatCard title={`New Students${dateRangeTitle}`} value={reportData.newStudents} icon={UsersIcon} />
                <StatCard title={`New Enrollments${dateRangeTitle}`} value={reportData.newEnrollments} icon={ClipboardListIcon} />
                <StatCard title={`Completed Sessions${dateRangeTitle}`} value={reportData.completedSessions} icon={CalendarIcon} />
            </div>
            
            <div className="pt-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Financial Trends</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={reportData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value/1000}k`}/>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #ccc', borderRadius: '0.5rem' }} formatter={(value: number) => formatCurrency(value)} />
                            <Area type="monotone" dataKey="revenue" stroke="rgb(var(--color-primary-600))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default OverviewReport;