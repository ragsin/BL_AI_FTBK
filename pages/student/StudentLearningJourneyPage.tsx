import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CurriculumProgress, CurriculumItem, CurriculumStatus, EnrollmentStatus } from '../../types';
import { CheckCircleIcon, BookOpenIcon, LinkIcon, DocumentTextIcon, PencilSquareIcon, StarIcon } from '../../components/icons/Icons';
import { getCurriculumProgress } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';

const statusInfo: Record<CurriculumStatus, { iconColor: string, bgColor: string, ringColor: string, icon: React.ElementType, titleColor: string }> = {
    [CurriculumStatus.COMPLETED]: { iconColor: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900', ringColor: 'ring-green-500', titleColor: 'text-slate-800 dark:text-white', icon: StarIcon },
    [CurriculumStatus.IN_PROGRESS]: { iconColor: 'text-sky-600', bgColor: 'bg-sky-100 dark:bg-sky-900', ringColor: 'ring-sky-500', titleColor: 'text-slate-800 dark:text-white', icon: () => ( <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span></span> ) },
    [CurriculumStatus.LOCKED]: { iconColor: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-700', ringColor: 'ring-slate-400', titleColor: 'text-slate-500 dark:text-slate-400', icon: () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg> ) },
};

const JourneyItem: React.FC<{ item: CurriculumItem; isLast: boolean; isFirst: boolean; }> = ({ item, isLast, isFirst }) => {
    const { icon: Icon, iconColor, bgColor, ringColor, titleColor } = statusInfo[item.status];
    const itemPadding = { 'Chapter': 'pl-0', 'Topic': 'pl-10', 'Sub-Topic': 'pl-20' }[item.type];

    return (
        <div className={`relative ${itemPadding}`}>
            {!isFirst && <div className="absolute top-0 left-5 h-5 w-0.5 bg-slate-300 dark:bg-slate-600"></div>}
            {!isLast && <div className="absolute top-5 left-5 h-full w-0.5 bg-slate-300 dark:bg-slate-600"></div>}
            <div className="relative flex items-center space-x-4">
                <div className={`z-10 flex h-10 w-10 items-center justify-center rounded-full ring-4 ${bgColor} ${ringColor}`}><Icon className={`h-6 w-6 ${iconColor}`} /></div>
                <div className="flex-1"><h3 className={`font-extrabold text-lg ${titleColor}`}>{item.title}</h3><p className={`text-sm font-semibold ${titleColor} opacity-70`}>{item.type}</p></div>
            </div>
        </div>
    );
};

const StudentLearningJourneyPage: React.FC = () => {
    const { user: student } = useAuth();
    const [curriculum, setCurriculum] = useState<CurriculumProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchJourney = async () => {
            if (!student) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const [allProgress, allEnrollments] = await Promise.all([
                getCurriculumProgress(),
                getEnrollments(),
            ]);
            const activeEnrollment = allEnrollments.find(e => e.studentId === student.id && e.status === EnrollmentStatus.ACTIVE);
            
            if (activeEnrollment) {
                setCurriculum(allProgress[activeEnrollment.id] || null);
            } else {
                setCurriculum(null);
            }
            setIsLoading(false);
        };
        fetchJourney();
    }, [student]);

    const flattenedJourney = useMemo(() => {
        if (!curriculum?.structure) return [];
        const flat: CurriculumItem[] = [];
        const traverse = (items: CurriculumItem[]) => { items.forEach(item => { flat.push(item); if (item.children) traverse(item.children); }); };
        traverse(curriculum.structure);
        return flat;
    }, [curriculum]);

    if (isLoading) {
        return <div className="p-8 text-center">Loading your journey map...</div>
    }

    if (!curriculum) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg text-center">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">Journey Map</h1>
                <p className="mt-4 text-slate-500">You don't have an active curriculum assigned.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">Journey Map: {curriculum.programTitle}</h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Follow your path to success! Here are all the steps in your learning adventure.</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <div className="space-y-5">
                    {flattenedJourney.map((item, index) => (
                        <JourneyItem key={item.id} item={item} isFirst={index === 0} isLast={index === flattenedJourney.length - 1} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentLearningJourneyPage;
