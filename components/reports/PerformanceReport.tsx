import React, { useMemo, useState, useEffect } from 'react';
import { DateRange } from '../../pages/admin/ReportsPage';
import { Role, EnrollmentStatus, SessionStatus, AssignmentStatus, RevenueTransactionType, User, Program, Session, Assignment, RevenueTransaction, Enrollment } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { getUsers } from '../../api/userApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getSessions, getAssignments } from '../../api/sessionApi';
import { getPrograms } from '../../api/programApi';
import { getRevenueTransactions } from '../../api/revenueApi';

const gradeToNumeric = (grade?: string): number | null => {
    if (!grade) return null;
    const trimmedGrade = grade.trim();
    if (trimmedGrade.endsWith('%')) {
        return parseFloat(trimmedGrade.replace('%', ''));
    }
    const gradeMap: { [key: string]: number } = {
        'A+': 98, 'A': 95, 'A-': 92, 'B+': 88, 'B': 85, 'B-': 82,
        'C+': 78, 'C': 75, 'C-': 72, 'D+': 68, 'D': 65, 'D-': 62, 'F': 50,
    };
    return gradeMap[trimmedGrade.toUpperCase()] || null;
};

const PerformanceReport: React.FC<{ dateRange: DateRange }> = ({ dateRange }) => {
    const { formatCurrency } = useSettings();
    const [reportData, setReportData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setReportData(null);
            
            const [users, allEnrollments, allSessions, allAssignments, allPrograms, allRevenue] = await Promise.all([
                getUsers(), getEnrollments(), getSessions(), getAssignments(), getPrograms(), getRevenueTransactions()
            ]);

            const teachers = users.filter(u => u.role === Role.TEACHER);
            const userMap = new Map(users.map(u => [u.id, u]));

            const filterByDate = <T extends { date?: string; start?: string; }>(items: T[], dateField: keyof T): T[] => {
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
            const filteredSessions = filterByDate(allSessions, 'start');
            const filteredRevenue = filterByDate(allRevenue, 'date');

            const studentPerformanceByTeacher = teachers.map(teacher => {
                const enrollments = allEnrollments.filter(e => e.teacherId === teacher.id && e.status === EnrollmentStatus.ACTIVE);
                const studentIds = new Set(enrollments.map(e => e.studentId));
                const studentSessions = filteredSessions.filter(s => studentIds.has(s.studentId!));
                const completed = studentSessions.filter(s => s.status === SessionStatus.COMPLETED).length;
                const absent = studentSessions.filter(s => s.status === SessionStatus.ABSENT).length;
                const attendanceRate = (completed + absent) > 0 ? Math.round((completed / (completed + absent)) * 100) : 100;

                const studentAssignments = allAssignments.filter(a => studentIds.has(a.studentId) && a.grade);
                let totalGrade = 0;
                let gradedCount = 0;
                studentAssignments.forEach(a => {
                    const numericGrade = gradeToNumeric(a.grade);
                    if (numericGrade !== null) {
                        totalGrade += numericGrade;
                        gradedCount++;
                    }
                });
                const averageGrade = gradedCount > 0 ? Math.round(totalGrade / gradedCount) : 0;

                return {
                    teacherId: teacher.id,
                    teacherName: `${teacher.firstName} ${teacher.lastName}`,
                    studentCount: studentIds.size,
                    attendanceRate,
                    averageGrade,
                };
            }).sort((a, b) => b.averageGrade - a.averageGrade);

            const programProfitability = allPrograms.map(program => {
                const programEnrollmentIds = new Set(allEnrollments.filter(e => e.programId === program.id).map(e => e.id));
                const revenue = filteredRevenue
                    .filter(t => programEnrollmentIds.has(t.enrollmentId))
                    .reduce((sum, t) => sum + (t.conversionRate ? t.price * t.conversionRate : t.price), 0);

                const programSessions = filteredSessions.filter(s => s.programId === program.id && s.status === SessionStatus.COMPLETED);
                const cost = programSessions.reduce((sum, session) => {
                    const teacher = userMap.get(session.teacherId);
                    const payRate = teacher?.payRate || 0;
                    const durationHours = (new Date(session.end).getTime() - new Date(session.start).getTime()) / 3600000;
                    return sum + (payRate * durationHours);
                }, 0);
                
                const profit = revenue - cost;

                return {
                    programId: program.id,
                    programName: program.title,
                    revenue,
                    cost,
                    profit
                };
            }).sort((a, b) => b.profit - a.profit);
            
            setReportData({ studentPerformanceByTeacher, programProfitability });
        };
        fetchData();
    }, [dateRange]);

    if (!reportData) {
        return <div className="text-center p-8">Loading performance report...</div>
    }

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Student Performance by Teacher</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teacher</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"># Students</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg. Attendance</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg. Grade</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {reportData.studentPerformanceByTeacher.map((data: any) => (
                                <tr key={data.teacherId}>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{data.teacherName}</td>
                                    <td className="px-4 py-3 text-center">{data.studentCount}</td>
                                    <td className="px-4 py-3 text-center">{data.attendanceRate}%</td>
                                    <td className="px-4 py-3 text-center">{data.averageGrade}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Program Profitability</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Program</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Revenue</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Cost</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Net Profit</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {reportData.programProfitability.map((data: any) => (
                                <tr key={data.programId}>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{data.programName}</td>
                                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(data.revenue)}</td>
                                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">({formatCurrency(data.cost)})</td>
                                    <td className={`px-4 py-3 text-right font-bold ${data.profit >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(data.profit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PerformanceReport;