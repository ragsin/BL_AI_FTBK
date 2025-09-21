import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { RevenueTransactionType } from '../../types';
import { DateRange } from '../../pages/admin/ReportsPage';
import { useSettings } from '../../contexts/SettingsContext';
import { BanknotesIcon, ArrowTrendingUpIcon } from '../icons/Icons';
import { getRevenueTransactions } from '../../api/revenueApi';
import { getPrograms } from '../../api/programApi';
import { getUsers } from '../../api/userApi';
import { getEnrollments } from '../../api/enrollmentApi';

interface FinancialReportProps {
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

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

const FinancialReport: React.FC<FinancialReportProps> = ({ dateRange }) => {
    const { formatCurrency, settings } = useSettings();
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setReportData(null);
            
            const [transactions, programs, users, enrollments] = await Promise.all([
                getRevenueTransactions(), getPrograms(), getUsers(), getEnrollments()
            ]);

            const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
            const programMap = new Map(programs.map(p => [p.id, p.title]));
            const enrollmentMap = new Map(enrollments.map(e => [e.id, e]));

            const filteredTransactions = transactions.filter(t => {
                if (!dateRange.start && !dateRange.end) return true;
                const transactionDate = new Date(t.date);
                if (dateRange.start && transactionDate < dateRange.start) return false;
                if (dateRange.end && transactionDate > dateRange.end) return false;
                return true;
            });
            
            // Revenue by Program
            const revenueByProgram = filteredTransactions.reduce((acc, t) => {
                const enrollment = enrollmentMap.get(t.enrollmentId);
                if (enrollment) {
                    const programName = programMap.get(enrollment.programId) || 'Unknown Program';
                    const value = t.conversionRate ? t.price * t.conversionRate : t.price;
                    acc[programName] = (acc[programName] || 0) + value;
                }
                return acc;
            }, {} as Record<string, number>);

            const revenueByProgramData = Object.entries(revenueByProgram)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            // Sales Performance
            const salesPerformance = filteredTransactions.reduce((acc: Record<string, { revenue: number, sales: number }>, t) => {
                const salesPersonName = userMap.get(t.salesPersonId) || 'Unknown';
                const value = t.conversionRate ? t.price * t.conversionRate : t.price;
                if (!acc[salesPersonName]) {
                    acc[salesPersonName] = { revenue: 0, sales: 0 };
                }
                acc[salesPersonName].revenue += value;
                acc[salesPersonName].sales++;
                return acc;
            }, {});
            
            const salesPerformanceData = Object.entries(salesPerformance)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue);

            // KPIs
            const totalRevenue = filteredTransactions.reduce((acc, t) => acc + (t.conversionRate ? t.price * t.conversionRate : t.price), 0);
            const totalSalesCount = filteredTransactions.length;
            const averageSaleValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

            setReportData({
                totalRevenue,
                totalSalesCount,
                averageSaleValue,
                revenueByProgramData,
                salesPerformanceData,
            });
        };
        fetchData();
    }, [dateRange, settings.primaryCurrency]);

    const CustomTooltipCurrency = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-white dark:bg-gray-800 p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
              <p className="label font-bold">{`${label}`}</p>
              <p className="intro" style={{color: payload[0].color}}>{`${payload[0].name} : ${formatCurrency(payload[0].value)}`}</p>
            </div>
          );
        }
        return null;
    };
    
    if (!reportData) {
        return <div className="text-center p-8">Loading financial report...</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Financial Report</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Revenue" value={formatCurrency(reportData.totalRevenue)} icon={BanknotesIcon} />
                <StatCard title="Total Sales" value={reportData.totalSalesCount} icon={ArrowTrendingUpIcon} />
                <StatCard title="Avg. Sale Value" value={formatCurrency(reportData.averageSaleValue)} icon={BanknotesIcon} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Sales Performance</h3>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sales Person</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Revenue</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Sales</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {reportData.salesPerformanceData.map((person: any) => (
                                    <tr key={person.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{person.name}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">{formatCurrency(person.revenue)}</td>
                                        <td className="px-4 py-3 text-center">{person.sales}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                     <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Revenue by Program</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={reportData.revenueByProgramData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                {reportData.revenueByProgramData.map((_entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default FinancialReport;