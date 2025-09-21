import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { UsersIcon, AcademicCapIcon, CurrencyDollarIcon, CalendarIcon, ArrowUpIcon, ArrowDownIcon, RocketLaunchIcon, SparklesIcon, ExclamationTriangleIcon, RefreshIcon, GlobeAltIcon, TagIcon, TrophyIcon } from '../../components/icons/Icons';
import { StatCardData, Activity, TourStep, Role, EnrollmentStatus, SessionStatus, UserStatus, AssignmentStatus, Session, User, RevenueTransactionType, Enrollment } from '../../types';
import { useTour } from '../../contexts/TourContext';
import { getCancellationRequests, getSessions, getAssignments } from '../../api/sessionApi';
import { getUsers } from '../../api/userApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getRevenueTransactions } from '../../api/revenueApi';
import { getPrograms } from '../../api/programApi';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { GoogleGenAI } from '@google/genai';
import SkeletonLoader from '../../components/SkeletonLoader';

// Helper for relative time formatting
const timeSince = (date: Date): string => {
    if (!date) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 0) return 'in the future';
    if (seconds < 60) return `${seconds}s ago`;
    
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `${Math.floor(seconds)}s ago`;
};


const adminTourSteps: TourStep[] = [
    { selector: '#main-sidebar', title: 'Navigation', content: 'This is the main sidebar where you can navigate to all the core modules of the platform.' },
    { selector: '#nav-dashboard', title: 'Dashboard', content: 'You are here! This page gives you a high-level overview of your business.' },
    { selector: '#stat-cards', title: 'Key Statistics', content: 'These cards show your most important metrics at a glance.' },
    { selector: '#action-center', title: 'Action Center', content: 'Urgent tasks and notifications that require your attention will appear here.' },
    { selector: '#theme-toggle', title: 'Theme Switcher', content: 'Toggle between light and dark mode for your visual comfort.' },
    { selector: '#notifications-bell', title: 'Notifications', content: 'Click here to see recent platform activity and important updates.' },
    { selector: '#user-profile-widget', title: 'Your Profile', content: 'Manage your own profile or log out from here. That concludes our tour!' },
];

const ActionCenterItem: React.FC<{ title: string; subtitle: string; onClick: () => void, disabled?: boolean, icon?: React.ElementType }> = ({ title, subtitle, onClick, disabled, icon: Icon }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
        <div className="flex items-center space-x-3">
             {Icon && <Icon className="h-5 w-5 text-warning-500 flex-shrink-0" />}
            <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
        </div>
        <button 
            onClick={onClick} 
            disabled={disabled}
            className="px-3 py-1 text-xs font-semibold text-white bg-primary-500 rounded-full hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
            View
        </button>
    </div>
);

const StatCard: React.FC<{ data: StatCardData }> = ({ data }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{data.title}</p>
      <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{data.value}</p>
      {data.change && (
        <div className={`flex items-center text-sm mt-2 ${data.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
            {data.changeType === 'increase' ? <ArrowUpIcon className="h-4 w-4 mr-1" /> : <ArrowDownIcon className="h-4 w-4 mr-1" />}
            <span>{data.change}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">vs last 30d</span>
        </div>
      )}
    </div>
    <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full">
      <data.icon className="h-6 w-6 text-primary-500" />
    </div>
  </div>
);

const DailyBriefingCard: React.FC<{ data: any }> = ({ data }) => {
    const { settings } = useSettings();
    const [briefing, setBriefing] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const BRIEFING_CACHE_KEY = 'ai_daily_briefing_cache';

    const generateBriefing = useCallback(async () => {
        if (!settings.aiProvider.enabled) {
            setError('AI features are disabled in Settings > AI Configuration.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        
        const systemPrompt = `You are an expert business analyst for an online education platform called ${settings.companyName}. Provide a concise, professional, and insightful "Daily Briefing" based on the following metrics. The tone should be informative and proactive, suitable for a CEO. Highlight key changes, identify potential issues (like at-risk students), and suggest possible focus areas. Do not use markdown formatting like headings or bullet points; write it as a single paragraph.`;
        const atRiskStudentNames = data.atRiskStudents.map((s: { studentName: string; }) => s.studentName).join(', ') || 'None';
        const userPrompt = `
            Current Metrics:
            - Total Revenue (all time): ${data.totalRevenue}
            - New Students (this month): ${data.newStudentsThisMonth}
            - Active Teachers: ${data.activeTeachers}
            - Sessions This Month: ${data.sessionsThisMonth}
            - Students with low credits: ${data.lowCreditStudentCount}
            - At-Risk Students (missed 2+ sessions recently): ${atRiskStudentNames}
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: settings.aiProvider.model,
                contents: `${systemPrompt}\n${userPrompt}`,
            });
            const newContent = response.text;
            
            const newTimestamp = Date.now();
            setBriefing(newContent);
            setLastUpdated(newTimestamp);
            localStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify({ content: newContent, timestamp: newTimestamp }));

        } catch (e: any) {
            console.error("Error generating AI briefing:", e);
            setError('Could not generate briefing. The AI service may be temporarily unavailable. Please contact support.');
        } finally {
            setIsLoading(false);
        }
    }, [settings.aiProvider, settings.companyName, data]);

    useEffect(() => {
        const loadBriefing = () => {
            if (!settings.aiBriefing.enabled) return;
            
            const cachedData = localStorage.getItem(BRIEFING_CACHE_KEY);
            let isStale = true;

            if (cachedData) {
                try {
                    const { content, timestamp } = JSON.parse(cachedData);
                    setBriefing(content);
                    setLastUpdated(timestamp);
                    isStale = false; // Assume not stale unless a condition is met
                    const now = new Date();
                    const lastUpdate = new Date(timestamp);
                    
                    // Check auto-refresh interval
                    if (settings.aiBriefing.autoRefreshHours > 0) {
                        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceUpdate >= settings.aiBriefing.autoRefreshHours) {
                            isStale = true;
                        }
                    }
                    
                    // Check daily update time
                    if (settings.aiBriefing.dailyUpdateTime) {
                        const [hours, minutes] = settings.aiBriefing.dailyUpdateTime.split(':').map(Number);
                        const scheduledTimeToday = new Date();
                        scheduledTimeToday.setHours(hours, minutes, 0, 0);
                        
                        if (now >= scheduledTimeToday && lastUpdate < scheduledTimeToday) {
                            isStale = true;
                        }
                    }

                } catch (e) {
                    isStale = true;
                }
            }
            
            if (isStale) {
                generateBriefing();
            }
        };
        loadBriefing();
    }, [settings.aiBriefing, generateBriefing]);

    if (!settings.aiBriefing.enabled) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <SparklesIcon className="h-6 w-6 text-primary-500 mr-3"/>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">AI Daily Briefing</h3>
                </div>
                <div className="flex items-center space-x-2">
                    {lastUpdated && <span className="text-xs text-gray-400">Updated {timeSince(new Date(lastUpdated))}</span>}
                    <button onClick={generateBriefing} disabled={isLoading} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait">
                        <RefreshIcon className={`h-4 w-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            {isLoading && !briefing ? (
                <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
            ) : error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : (
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{briefing}</p>
            )}
        </div>
    );
};

const RankedListCard: React.FC<{
    title: string;
    icon: React.ElementType;
    data: { name: string; value: string | number }[];
    valueFormatter?: (value: number) => string;
}> = ({ title, icon: Icon, data, valueFormatter = (v) => v.toLocaleString() }) => {
    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center mb-4">
                    <Icon className="h-6 w-6 text-primary-500 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available for this period.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center mb-4">
                <Icon className="h-6 w-6 text-primary-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
            </div>
            <ul className="space-y-3">
                {data.map((item, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                            <span className="font-bold text-gray-400 dark:text-gray-500 w-6">{index + 1}.</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                            {typeof item.value === 'number' ? valueFormatter(item.value) : item.value}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const getCountryFromTimezone = (timezone?: string): string => {
    if (!timezone) return 'Unknown';
    const city = timezone.split('/')[1];
    const countryMap: Record<string, string> = {
        'New_York': 'USA', 'Chicago': 'USA', 'Denver': 'USA', 'Los_Angeles': 'USA', 'Phoenix': 'USA',
        'London': 'UK', 'Paris': 'France',
        'Tokyo': 'Japan', 'Kolkata': 'India',
        'Sydney': 'Australia',
    };
    return countryMap[city] || timezone.split('/')[0] || 'Unknown';
};

const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
        return { change: current > 0 ? '+100%' : '+0%', changeType: 'increase' as 'increase' | 'decrease' };
    }
    const percentChange = ((current - previous) / previous) * 100;
    return {
        change: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`,
        changeType: (percentChange >= 0 ? 'increase' : 'decrease') as 'increase' | 'decrease',
    };
};

const DashboardPage: React.FC = () => {
  const { startTour } = useTour();
  const { settings, formatCurrency } = useSettings();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const [users, sessions, enrollments, revenueTxs, allAssignments, programs, cancellationRequests] = await Promise.all([
            getUsers(), getSessions(), getEnrollments(), getRevenueTransactions(), getAssignments(), getPrograms(), getCancellationRequests()
        ]);

        const userMap = new Map(users.map(u => [u.id, u]));
        const programMap = new Map(programs.map(p => [p.id, p]));
        const categoryMap = new Map(settings.programCategories.map(c => [c.id, c.name]));
        
        const activeTeachers = users.filter(u => u.role === Role.TEACHER && u.status === UserStatus.ACTIVE).length;
        const totalRevenue = revenueTxs.reduce((sum, tx) => sum + (tx.conversionRate ? tx.price * tx.conversionRate : tx.price), 0);
        
        const now = new Date();
        const currentPeriodEnd = new Date(now);
        const currentPeriodStart = new Date(now);
        currentPeriodStart.setDate(now.getDate() - 30);
        const previousPeriodEnd = new Date(currentPeriodStart);
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
        const previousPeriodStart = new Date(previousPeriodEnd);
        previousPeriodStart.setDate(previousPeriodEnd.getDate() - 30);
        
        const revenueThisPeriod = revenueTxs.filter(tx => new Date(tx.date) >= currentPeriodStart && new Date(tx.date) <= currentPeriodEnd).reduce((sum, tx) => sum + (tx.conversionRate ? tx.price * tx.conversionRate : tx.price), 0);
        const newStudentsThisPeriod = users.filter(u => u.role === Role.STUDENT && new Date(u.dateAdded) >= currentPeriodStart && new Date(u.dateAdded) <= currentPeriodEnd).length;
        const sessionsThisPeriod = sessions.filter(s => new Date(s.start) >= currentPeriodStart && new Date(s.start) <= currentPeriodEnd && s.status !== SessionStatus.CANCELLED).length;

        const revenueLastPeriod = revenueTxs.filter(tx => new Date(tx.date) >= previousPeriodStart && new Date(tx.date) <= previousPeriodEnd).reduce((sum, tx) => sum + (tx.conversionRate ? tx.price * tx.conversionRate : tx.price), 0);
        const newStudentsLastPeriod = users.filter(u => u.role === Role.STUDENT && new Date(u.dateAdded) >= previousPeriodStart && new Date(u.dateAdded) <= previousPeriodEnd).length;
        const sessionsLastPeriod = sessions.filter(s => new Date(s.start) >= previousPeriodStart && new Date(s.start) <= previousPeriodEnd && s.status !== SessionStatus.CANCELLED).length;

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const newStudentsThisMonth = users.filter(u => u.role === Role.STUDENT && new Date(u.dateAdded) >= oneMonthAgo).length;
        const sessionsThisMonth = sessions.filter(s => new Date(s.start) >= oneMonthAgo && s.status !== SessionStatus.CANCELLED).length;

        const pendingCancellationRequests = cancellationRequests.filter(r => r.status === 'pending');
        const sessionMap = new Map(sessions.map(s => [s.id, s]));
        const formattedCancellationRequests = pendingCancellationRequests.map(req => {
            const student = userMap.get(req.studentId);
            const session = sessionMap.get(req.sessionId);
            return { ...req, studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student', sessionDate: session ? new Date(session.start).toLocaleDateString() : 'Unknown Date' };
        });

        const lowCreditEnrollments = settings.salesLowCreditAlerts.enabled ? enrollments.filter(e => e.status === EnrollmentStatus.ACTIVE && e.creditsRemaining <= settings.salesLowCreditAlerts.threshold) : [];
        const lowCreditStudentCount = lowCreditEnrollments.length;
        const lowCreditEnrollmentIds = lowCreditEnrollments.map(e => e.id);

        const atRiskSettings = settings.studentAtRisk;
        const periodDaysAgo = new Date();
        periodDaysAgo.setDate(periodDaysAgo.getDate() - atRiskSettings.missedSessions.periodDays);
        const studentAbsenceCount = sessions.filter(s => s.status === SessionStatus.ABSENT && new Date(s.start) >= periodDaysAgo).reduce((acc, session) => { if (session.studentId) acc[session.studentId] = (acc[session.studentId] || 0) + 1; return acc; }, {} as Record<string, number>);
        const atRiskStudents = atRiskSettings.enabled ? Object.entries(studentAbsenceCount).filter(([_, count]) => count >= atRiskSettings.missedSessions.count).map(([studentId, count]) => { const student = userMap.get(studentId); return { studentId, studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown', absences: count }; }) : [];
        const atRiskStudentIds = atRiskStudents.map(s => s.studentId);

        const assignmentsToGrade = allAssignments.filter(a => a.status === AssignmentStatus.PENDING_GRADING);
        const assignmentsToGradeCount = assignmentsToGrade.length;
        const studentIdsToGrade = [...new Set(assignmentsToGrade.map(a => a.studentId))];
        
        const revenueByMonth = revenueTxs.reduce((acc, tx) => {
            const txDate = new Date(tx.date);
            const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth()).padStart(2, '0')}`; // Use month index for sorting
            const revenueVal = tx.conversionRate ? tx.price * tx.conversionRate : tx.price;
            acc[monthKey] = (acc[monthKey] || 0) + revenueVal;
            return acc;
        }, {} as Record<string, number>);

        const revenueChartData = Array.from({ length: 6 }).map((_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            const monthName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            return { name: monthName, revenue: revenueByMonth[monthKey] || 0 };
        });

        const activities: (Activity & { date: Date })[] = [];
        enrollments.forEach(e => {
            const student = userMap.get(e.studentId); const program = programMap.get(e.programId);
            if (student && program) activities.push({ id: `act-enr-${e.id}`, user: { name: `${student.firstName} ${student.lastName}`, avatar: student.avatar || '' }, action: 'enrolled in', target: program.title, timestamp: e.dateEnrolled, date: new Date(e.dateEnrolled) });
        });
        allAssignments.forEach(a => {
            if (a.status === AssignmentStatus.PENDING_GRADING || a.status === AssignmentStatus.SUBMITTED_LATE) {
                const student = userMap.get(a.studentId);
                if (student) activities.push({ id: `act-assign-${a.id}`, user: { name: `${student.firstName} ${student.lastName}`, avatar: student.avatar || '' }, action: 'submitted', target: a.title, timestamp: a.submittedAt, date: new Date(a.submittedAt) });
            }
        });
        const dynamicRecentActivities = activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
            
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const enrollmentsByCategory = enrollments.filter(e => { const enrolledDate = new Date(e.dateEnrolled); return enrolledDate.getMonth() === currentMonth && enrolledDate.getFullYear() === currentYear; }).reduce((acc, e) => { const program = programMap.get(e.programId); const categoryName = program?.categoryId ? categoryMap.get(program.categoryId) : 'Uncategorized'; if (categoryName) acc[categoryName] = (acc[categoryName] || 0) + 1; return acc; }, {} as Record<string, number>);
        const enrollmentsByCategoryRanked = Object.entries(enrollmentsByCategory).map(([name, value]): {name: string, value: number} => ({ name, value })).sort((a, b) => b.value - a.value);

        const studentsByCountry = users.filter(u => { const addedDate = new Date(u.dateAdded); return u.role === Role.STUDENT && addedDate.getMonth() === currentMonth && addedDate.getFullYear() === currentYear; }).reduce((acc, u) => { const country = getCountryFromTimezone(u.timezone); acc[country] = (acc[country] || 0) + 1; return acc; }, {} as Record<string, number>);
        const studentsByCountryRanked = Object.entries(studentsByCountry).map(([name, value]): {name: string, value: number} => ({ name, value })).sort((a, b) => b.value - a.value);

        const salesByPerson = revenueTxs.filter(tx => { const txDate = new Date(tx.date); return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear; }).reduce((acc, tx) => { const salesperson = userMap.get(tx.salesPersonId); const salespersonName = salesperson ? salesperson.firstName : 'Unknown'; const revenue = tx.conversionRate ? tx.price * tx.conversionRate : tx.price; acc[salespersonName] = (acc[salespersonName] || 0) + revenue; return acc; }, {} as Record<string, number>);
        const salesByPersonRanked = Object.entries(salesByPerson).map(([name, value]): {name: string, value: number} => ({ name, value })).sort((a, b) => b.value - a.value);

        setDashboardData({ activeTeachers, totalRevenue, newStudentsThisMonth, sessionsThisMonth, revenueThisPeriod, newStudentsThisPeriod, sessionsThisPeriod, revenueLastPeriod, newStudentsLastPeriod, sessionsLastPeriod, formattedCancellationRequests, lowCreditStudentCount, lowCreditEnrollmentIds, assignmentsToGradeCount, studentIdsToGrade, revenueChartData, dynamicRecentActivities, atRiskStudents, atRiskStudentIds, enrollmentsByCategoryRanked, studentsByCountryRanked, salesByPersonRanked });
        setIsLoading(false);
    };
    fetchData();
  }, [settings.salesLowCreditAlerts, settings.studentAtRisk, settings.programCategories]);

  if (isLoading || !dashboardData) {
    return <SkeletonLoader type="dashboard" />;
  }
  
  const revenueChange = calculateChange(dashboardData.revenueThisPeriod, dashboardData.revenueLastPeriod);
  const studentsChange = calculateChange(dashboardData.newStudentsThisPeriod, dashboardData.newStudentsLastPeriod);
  const sessionsChange = calculateChange(dashboardData.sessionsThisPeriod, dashboardData.sessionsLastPeriod);

  const stats: StatCardData[] = [
    { title: 'Revenue (Last 30d)', value: formatCurrency(dashboardData.revenueThisPeriod), ...revenueChange, icon: CurrencyDollarIcon },
    { title: 'New Students (Last 30d)', value: dashboardData.newStudentsThisPeriod.toLocaleString(), ...studentsChange, icon: UsersIcon },
    { title: 'Active Teachers', value: dashboardData.activeTeachers.toLocaleString(), change: '', changeType: 'increase', icon: AcademicCapIcon },
    { title: 'Sessions (Last 30d)', value: dashboardData.sessionsThisPeriod.toLocaleString(), ...sessionsChange, icon: CalendarIcon },
  ];

  const briefingDataForAI = {
    totalRevenue: formatCurrency(dashboardData.totalRevenue),
    newStudentsThisMonth: dashboardData.newStudentsThisMonth,
    activeTeachers: dashboardData.activeTeachers,
    sessionsThisMonth: dashboardData.sessionsThisMonth,
    lowCreditStudentCount: dashboardData.lowCreditStudentCount,
    atRiskStudents: dashboardData.atRiskStudents
  };

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's a snapshot of your platform's performance.</p>
        </div>
         <button onClick={() => startTour(adminTourSteps)} className="flex items-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors">
            <RocketLaunchIcon className="h-5 w-5 mr-2" />
            Start Tour
        </button>
      </div>

      <DailyBriefingCard data={briefingDataForAI} />

      <div id="stat-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => <StatCard key={stat.title} data={stat} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div id="financial-trends-chart" className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Revenue Trends</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={dashboardData.revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.2)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(value, 0).slice(0, -3)+'k'}/>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(5px)', 
                    border: '1px solid #ccc',
                    borderRadius: '0.5rem'
                  }} 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="revenue" stroke="rgb(var(--color-primary-600))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div id="action-center" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Action Center</h3>
            <div className="space-y-2">
                {dashboardData.atRiskStudents.length > 0 && (
                    <ActionCenterItem 
                        icon={ExclamationTriangleIcon}
                        title="At-Risk Students" 
                        subtitle={`${dashboardData.atRiskStudents.length} students have multiple absences.`} 
                        onClick={() => navigate('/admin/users', { state: { atRiskStudentIds: dashboardData.atRiskStudentIds } })} 
                    />
                )}
                {dashboardData.lowCreditStudentCount > 0 && (
                     <ActionCenterItem 
                        title="Low Credits Alert" 
                        subtitle={`${dashboardData.lowCreditStudentCount} students are low on credits.`} 
                        onClick={() => navigate('/admin/enrollments', { state: { lowCreditEnrollmentIds: dashboardData.lowCreditEnrollmentIds }})} 
                    />
                )}
                {dashboardData.formattedCancellationRequests.length > 0 && (
                    <ActionCenterItem 
                        key="cancellation-requests"
                        title="Scheduling Requests" 
                        subtitle={`${dashboardData.formattedCancellationRequests.length} pending cancellations.`} 
                        onClick={() => navigate('/admin/schedule', { state: { pendingCancellations: dashboardData.formattedCancellationRequests }})}
                    />
                )}
                 <ActionCenterItem 
                    title="Assignments to Grade" 
                    subtitle={`${dashboardData.assignmentsToGradeCount} new submissions.`} 
                    onClick={() => navigate('/admin/users', { state: { studentIdsToGrade: dashboardData.studentIdsToGrade } })}
                    disabled={dashboardData.assignmentsToGradeCount === 0}
                />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RankedListCard 
              title="New Enrollments by Category"
              icon={TagIcon}
              data={dashboardData.enrollmentsByCategoryRanked.slice(0, 5)}
          />
          <RankedListCard 
              title="New Students by Country"
              icon={GlobeAltIcon}
              data={dashboardData.studentsByCountryRanked.slice(0, 5)}
          />
          <RankedListCard 
              title="Top Salespeople"
              icon={TrophyIcon}
              data={dashboardData.salesByPersonRanked.slice(0, 5)}
              valueFormatter={(val) => formatCurrency(val)}
          />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {dashboardData.dynamicRecentActivities.map(activity => (
            <div key={activity.id} className="flex items-center space-x-4">
              <img className="h-10 w-10 rounded-full" src={activity.user.avatar} alt={activity.user.name} />
              <div>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-semibold">{activity.user.name}</span> {activity.action} <span className="font-semibold">{activity.target}</span>.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{timeSince(activity.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;