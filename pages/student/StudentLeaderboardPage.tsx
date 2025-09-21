import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, Role } from '../../types';
import { getUsers } from '../../api/userApi';
import { TrophyIcon } from '../../components/icons/Icons';

const levels = [
    { level: 1, xp: 0, title: "Newcomer" },
    { level: 2, xp: 100, title: "Apprentice" },
    { level: 3, xp: 250, title: "Journeyman" },
    { level: 4, xp: 500, title: "Explorer" },
    { level: 5, xp: 1000, title: "Scholar" },
];

const getLevelInfo = (xp: number) => {
    let currentLevelInfo = levels[0];
    for (let i = 0; i < levels.length; i++) {
        if (xp >= levels[i].xp) {
            currentLevelInfo = levels[i];
        }
    }
    return currentLevelInfo;
};

interface LeaderboardEntry extends User {
    level: number;
    levelTitle: string;
    rank: number;
}

const StudentLeaderboardPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);
            const allUsers = await getUsers();
            const students = allUsers.filter(u => u.role === Role.STUDENT);

            const rankedStudents = students
                .map(student => {
                    const xp = student.experiencePoints || 0;
                    const { level, title } = getLevelInfo(xp);
                    return { ...student, xp, level, levelTitle: title };
                })
                .sort((a, b) => b.xp - a.xp)
                .map((student, index) => ({
                    ...student,
                    rank: index + 1,
                }));
            
            setLeaderboard(rankedStudents as LeaderboardEntry[]);
            setIsLoading(false);
        };

        fetchLeaderboard();
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center">Loading leaderboard...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">Leaderboard</h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">See who's leading the grand adventure!</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-300 uppercase w-16">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">Student</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">Level</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">XP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {leaderboard.map(student => {
                            const isCurrentUser = student.id === currentUser?.id;
                            return (
                                <tr key={student.id} className={`${isCurrentUser ? 'bg-sky-100 dark:bg-sky-800/50' : ''}`}>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-bold text-lg ${
                                            student.rank === 1 ? 'text-amber-500' : 
                                            student.rank === 2 ? 'text-slate-400' : 
                                            student.rank === 3 ? 'text-amber-700' : 'text-slate-600 dark:text-slate-300'
                                        }`}>
                                            {student.rank}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <img src={student.avatar} alt={student.firstName} className="h-10 w-10 rounded-full" />
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">{student.firstName} {student.lastName}</p>
                                                {isCurrentUser && <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">This is you!</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="font-bold text-slate-800 dark:text-white">{student.level}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{student.levelTitle}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-pink-500 dark:text-pink-400">
                                        {student.experiencePoints?.toLocaleString()}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentLeaderboardPage;