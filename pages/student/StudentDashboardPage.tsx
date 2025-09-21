import React, { useMemo, useState, useEffect } from 'react';
import { Session, Assignment, AssignmentStatus, CurriculumItem, CurriculumStatus, EnrollmentStatus, CurriculumProgress, SessionStatus, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { CalendarIcon, ClockIcon, ClipboardDocumentCheckIcon, FireIcon, ArrowRightIcon, BanknotesIcon, PencilSquareIcon, CheckCircleIcon, MailIcon, StarIcon } from '../../components/icons/Icons';
import { getSessions, getAssignments } from '../../api/sessionApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getCurriculumProgress, getPrograms } from '../../api/programApi';
import { Link } from 'react-router-dom';
import MessageModal from '../../components/MessageModal';
import { useSettings } from '../../contexts/SettingsContext';
import LevelUpModal from '../../components/LevelUpModal';

const calculateCurriculumProgress = (structure: CurriculumItem[] | undefined) => {
    let total = 0;
    let completed = 0;
    const traverse = (items: CurriculumItem[]) => {
        items.forEach(item => {
            total++;
            if (item.status === CurriculumStatus.COMPLETED) {
                completed++;
            }
            if (item.children) {
                traverse(item.children);
            }
        });
    };
    if (structure) {
        traverse(structure);
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
};

const levels = [
    { level: 1, xp: 0, title: "Newcomer" },
    { level: 2, xp: 100, title: "Apprentice" },
    { level: 3, xp: 250, title: "Journeyman" },
    { level: 4, xp: 500, title: "Explorer" },
    { level: 5, xp: 1000, title: "Scholar" },
];

const getLevelInfo = (xp: number) => {
    let currentLevelInfo = levels[0];
    let nextLevelInfo = levels[1];
    for (let i = 0; i < levels.length; i++) {
        if (xp >= levels[i].xp) {
            currentLevelInfo = levels[i];
            if (i + 1 < levels.length) {
                nextLevelInfo = levels[i + 1];
            } else {
                nextLevelInfo = { level: currentLevelInfo.level + 1, xp: Infinity, title: "Master" };
            }
        }
    }
    const xpForNextLevel = nextLevelInfo.xp - currentLevelInfo.xp;
    const xpIntoCurrentLevel = xp - currentLevelInfo.xp;
    const progressPercentage = xpForNextLevel === Infinity ? 100 : Math.round((xpIntoCurrentLevel / xpForNextLevel) * 100);

    return { ...currentLevelInfo, progressPercentage, xpForNextLevel, xpIntoCurrentLevel };
};

const NextAdventureCard: React.FC<{ session: Session | undefined }> = ({ session }) => {
    const [programMap, setProgramMap] = useState<Map<string, string>>(new Map());
    useEffect(() => {
        getPrograms().then(programs => setProgramMap(new Map(programs.map(p => [p.id, p.title]))));
    }, []);

    const { settings } = useSettings();

    if (!session) {
        return (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center text-center">
                <img src="https://i.imgur.com/3_THEME/friendly_mascot_waving.png" alt="Mascot" className="h-24 mb-4" />
                <h3 className="font-bold text-xl text-slate-800 dark:text-white">All Clear!</h3>
                <p className="text-slate-500 dark:text-slate-400">No upcoming adventures on your schedule. Time to explore!</p>
            </div>
        );
    }

    const now = new Date().getTime();
    const sessionStartTime = new Date(session.start).getTime();
    const joinableAfter = sessionStartTime - (settings.sessionJoinWindow.joinBufferMinutesBefore * 60 * 1000);
    const joinableBefore = sessionStartTime + (settings.sessionJoinWindow.joinBufferMinutesAfter * 60 * 1000);
    const canJoin = session.status === SessionStatus.SCHEDULED && now >= joinableAfter && now <= joinableBefore;

    return (
        <div className="bg-gradient-to-br from-sky-400 to-blue-500 dark:from-sky-600 dark:to-blue-700 p-6 rounded-2xl shadow-lg text-white">
            <h3 className="font-bold text-lg opacity-80">Your Next Adventure</h3>
            <p className="font-extrabold text-2xl mt-2">{programMap.get(session.programId)}</p>
            <div className="mt-4 flex items-center space-x-2 text-sm font-semibold opacity-90">
                <CalendarIcon className="h-5 w-5" />
                <span>{new Date(session.start).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm font-semibold opacity-90">
                <ClockIcon className="h-5 w-5" />
                <span>{new Date(session.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {canJoin && session.sessionUrl && (
                <button
                    onClick={() => window.open(session.sessionUrl, '_blank')}
                    className="mt-6 w-full bg-white text-sky-600 font-bold py-3 rounded-xl shadow-md hover:bg-sky-100 transition-all transform hover:scale-105"
                >
                    Let's Go!
                </button>
            )}
        </div>
    );
};

const QuestLogCard: React.FC<{ assignments: Assignment[] }> = ({ assignments }) => (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
        <h3 className="font-bold text-xl text-slate-800 dark:text-white">Your Quest Log</h3>
        <div className="mt-4 space-y-3">
            {assignments.length > 0 ? assignments.slice(0, 3).map(a => (
                <Link to="/student/assignments" key={a.id} className="block p-3 rounded-lg bg-slate-50/50 dark:bg-slate-700/50 hover:bg-slate-100/70 dark:hover:bg-slate-700 transition-colors">
                    <p className="font-bold text-slate-700 dark:text-slate-200">{a.title}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Due: {a.dueDate}</p>
                </Link>
            )) : <p className="text-sm text-slate-500 text-center py-4">No quests at the moment!</p>}
        </div>
        <Link to="/student/assignments" className="mt-4 inline-flex items-center text-sm font-bold text-sky-600 dark:text-sky-400 hover:underline">
            View All Quests <ArrowRightIcon className="h-4 w-4 ml-1" />
        </Link>
    </div>
);

const MascotCompanion: React.FC<{ assignmentsDueSoon: number, nextSession: boolean }> = ({ assignmentsDueSoon, nextSession }) => {
    const { settings } = useSettings();
    const [message, setMessage] = useState('');
    const [showBubble, setShowBubble] = useState(false);

    const messages = useMemo(() => {
        const baseMessages = [
            "Keep up the great work on your adventure!",
            "Every quest you complete makes you stronger!",
            "Did you know learning something new builds new paths in your brain?",
            "Remember to ask your teacher if you get stuck on a quest!",
        ];
        if (assignmentsDueSoon > 0) {
            baseMessages.push(`You have ${assignmentsDueSoon} quest${assignmentsDueSoon > 1 ? 's' : ''} due soon. You can do it!`);
        }
        if (nextSession) {
            baseMessages.push("Your next adventure is coming up! Get ready!");
        }
        return baseMessages;
    }, [assignmentsDueSoon, nextSession]);
    
    useEffect(() => {
        const pickMessage = () => {
            setMessage(messages[Math.floor(Math.random() * messages.length)]);
            setShowBubble(true);
            setTimeout(() => setShowBubble(false), 8000);
        };
        
        pickMessage();
        const interval = setInterval(pickMessage, 20000);
        return () => clearInterval(interval);
    }, [messages]);

    if (!settings.mascotEnabled) return null;

    return (
        <div className="mascot-container">
            {showBubble && <div className="speech-bubble animate-fade-in-up">{message}</div>}
            <img src={settings.mascotImageUrl} alt="Sparky the Fox mascot" className="h-32 w-auto" />
        </div>
    );
};

const StudentDashboardPage: React.FC = () => {
    const { user: student } = useAuth();
    const { settings } = useSettings();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
    const [levelUpInfo, setLevelUpInfo] = useState({ level: 0, title: '' });

    useEffect(() => {
        const fetchData = async () => {
            if (!student) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);

            const [allSessions, allAssignments, allEnrollments, allProgress] = await Promise.all([
                getSessions(), getAssignments(), getEnrollments(), getCurriculumProgress()
            ]);
            
            const myUpcomingSessions = allSessions
                .filter(s => s.studentId === student.id && new Date(s.start) > new Date() && s.status === SessionStatus.SCHEDULED)
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            
            const nextSession = myUpcomingSessions[0];
            
            const assignmentsDueSoon = allAssignments
                .filter(a => a.studentId === student.id && a.status === AssignmentStatus.NOT_SUBMITTED && new Date(a.dueDate) >= new Date())
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

            const activeEnrollment = allEnrollments.find(e => e.studentId === student.id && e.status === EnrollmentStatus.ACTIVE);
            let progressPercentage = 0;
            if (activeEnrollment) {
                const curriculum = allProgress[activeEnrollment.id];
                if (curriculum) progressPercentage = calculateCurriculumProgress(curriculum.structure);
            }
            
            const dailyStreak = student.dailyStreak || 1;

            setDashboardData({ assignmentsDueSoon, nextSession, progressPercentage, dailyStreak });
            setIsLoading(false);
        };
        fetchData();
    }, [student]);

    const levelInfo = useMemo(() => {
        if (!student || student.experiencePoints === undefined) return getLevelInfo(0);
        return getLevelInfo(student.experiencePoints);
    }, [student]);

    useEffect(() => {
        if (student) {
            const lastSeenLevel = parseInt(sessionStorage.getItem(`lastSeenLevel_${student.id}`) || '0', 10);
            if (levelInfo.level > lastSeenLevel) {
                setLevelUpInfo({ level: levelInfo.level, title: levelInfo.title });
                setIsLevelUpModalOpen(true);
                sessionStorage.setItem(`lastSeenLevel_${student.id}`, levelInfo.level.toString());
            }
        }
    }, [student, levelInfo]);

    if (isLoading || !student || !dashboardData) {
        return <div>Loading dashboard...</div>;
    }
    
    const { assignmentsDueSoon, nextSession, progressPercentage, dailyStreak } = dashboardData;

    return (
        <>
            <div className="relative space-y-8 font-student pb-36">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">
                    Welcome back, <span className="text-sky-500 dark:text-sky-400">{student.firstName}</span>!
                </h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <NextAdventureCard session={nextSession} />
                        <QuestLogCard assignments={assignmentsDueSoon} />
                    </div>

                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-xl text-slate-800 dark:text-white">Level Up!</h3>
                                <span className="font-bold text-lg text-pink-500 dark:text-pink-400">Level {levelInfo.level}</span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{levelInfo.title}</p>
                            <div className="mt-3">
                                <div className="xp-bar-container">
                                    <div className="xp-bar-fill" style={{ width: `${levelInfo.progressPercentage}%` }}></div>
                                </div>
                                <p className="text-xs text-right text-slate-400 mt-1">
                                    {levelInfo.xpIntoCurrentLevel} / {levelInfo.xpForNextLevel} XP
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Journey Map</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Overall Program Progress</p>
                            <div className="relative mt-4 h-32 flex items-center justify-center">
                                <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                                    <circle className="text-slate-200 dark:text-slate-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                                    <circle
                                        className="text-sky-500 dark:text-sky-400"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="45"
                                        cx="50"
                                        cy="50"
                                        style={{
                                            strokeDasharray: 2 * Math.PI * 45,
                                            strokeDashoffset: 2 * Math.PI * 45 * (1 - progressPercentage / 100),
                                            transform: 'rotate(-90deg)',
                                            transformOrigin: '50% 50%',
                                            transition: 'stroke-dashoffset 0.5s ease-in-out'
                                        }}
                                    />
                                </svg>
                                <span className="text-4xl font-extrabold text-sky-600 dark:text-sky-300">{progressPercentage}%</span>
                            </div>
                            <Link to="/student/journey" className="mt-4 inline-flex items-center text-sm font-bold text-sky-600 dark:text-sky-400 hover:underline">
                                View Full Map <ArrowRightIcon className="h-4 w-4 ml-1" />
                            </Link>
                        </div>

                        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg flex items-center justify-center space-x-4">
                            <FireIcon className="h-10 w-10 text-amber-500" />
                            <div>
                                <p className="text-3xl font-extrabold text-slate-800 dark:text-white">{dailyStreak}</p>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Day Streak!</p>
                            </div>
                        </div>
                    </div>
                </div>
                <MascotCompanion assignmentsDueSoon={assignmentsDueSoon.length} nextSession={!!nextSession} />
            </div>
            <LevelUpModal
                isOpen={isLevelUpModalOpen}
                onClose={() => setIsLevelUpModalOpen(false)}
                level={levelUpInfo.level}
                title={levelUpInfo.title}
            />
        </>
    );
};

export default StudentDashboardPage;