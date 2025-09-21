import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getEnrollments } from '../../api/enrollmentApi';
import { getSessions } from '../../api/sessionApi';
import { getUsers } from '../../api/userApi';
import { SessionStatus, User } from '../../types';
import EmptyState from '../../components/EmptyState';
import { ExclamationTriangleIcon } from '../../components/icons/Icons';
import { Link } from 'react-router-dom';

const AtRiskStudentsPage: React.FC = () => {
    const { user: teacher } = useAuth();
    const { settings } = useSettings();
    const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAtRiskStudents = async () => {
            if (!teacher || !settings.studentAtRisk.enabled) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            
            const [enrollments, sessions, users] = await Promise.all([
                getEnrollments(), getSessions(), getUsers()
            ]);
            
            const myStudentIds = new Set(enrollments.filter(e => e.teacherId === teacher.id).map(e => e.studentId));
            const userMap = new Map(users.map(u => [u.id, u]));

            const periodDaysAgo = new Date();
            periodDaysAgo.setDate(periodDaysAgo.getDate() - settings.studentAtRisk.missedSessions.periodDays);
            
            const studentAbsenceCount = sessions
                .filter(s => s.status === SessionStatus.ABSENT && new Date(s.start) >= periodDaysAgo && s.studentId && myStudentIds.has(s.studentId))
                .reduce((acc, session) => {
                    if (session.studentId) {
                        acc[session.studentId] = (acc[session.studentId] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);

            const atRiskStudentData = Object.entries(studentAbsenceCount)
                .filter(([_, count]) => count >= settings.studentAtRisk.missedSessions.count)
                .map(([studentId, absences]) => {
                    const student = userMap.get(studentId);
                    return {
                        studentId,
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
                        avatar: student?.avatar,
                        absences,
                    };
                });
            
            setAtRiskStudents(atRiskStudentData);
            setIsLoading(false);
        };
        fetchAtRiskStudents();
    }, [teacher, settings.studentAtRisk]);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">At-Risk Students</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Students who have missed {settings.studentAtRisk.missedSessions.count} or more sessions in the last {settings.studentAtRisk.missedSessions.periodDays} days.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Absences</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan={3} className="text-center p-8">Loading...</td></tr>
                            ) : atRiskStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={3}>
                                        <EmptyState
                                            icon={ExclamationTriangleIcon}
                                            title="No At-Risk Students"
                                            message="All of your students are meeting attendance expectations."
                                        />
                                    </td>
                                </tr>
                            ) : (
                                atRiskStudents.map(({ studentId, studentName, avatar, absences }) => (
                                    <tr key={studentId}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="h-10 w-10 rounded-full" src={avatar} alt={studentName} />
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{studentName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">{absences}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/teacher/students`} className="text-sm font-semibold text-primary-600 hover:text-primary-800">
                                                View Portfolio
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AtRiskStudentsPage;