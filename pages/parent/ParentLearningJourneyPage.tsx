import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CurriculumProgress, CurriculumItem, CurriculumStatus, EnrollmentStatus } from '../../types';
import { CheckCircleIcon, BookOpenIcon, LinkIcon } from '../../components/icons/Icons';
import { getCurriculumProgress } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { useParentPortal } from '../../contexts/ParentPortalContext';
import ParentPageHeader from '../../components/ParentPageHeader';

const StatusIndicator: React.FC<{ status: CurriculumStatus }> = ({ status }) => {
    switch(status) {
        case CurriculumStatus.COMPLETED:
            return <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />;
        case CurriculumStatus.IN_PROGRESS:
            return (
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                    </span>
                </div>
            );
        case CurriculumStatus.LOCKED:
            return (
                 <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-400">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                 </div>
            );
        default:
            return <div className="w-5 h-5 flex-shrink-0" />;
    }
};

const ParentLearningJourneyPage: React.FC = () => {
    const { selectedChildId, children } = useParentPortal();
    const [curriculum, setCurriculum] = useState<CurriculumProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchJourney = async () => {
            if (!selectedChildId) {
                setCurriculum(null);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const allProgress = await getCurriculumProgress();
            const allEnrollments = await getEnrollments();
            const activeEnrollment = allEnrollments.find(e => e.studentId === selectedChildId && e.status === EnrollmentStatus.ACTIVE);
            
            if (activeEnrollment) {
                setCurriculum(allProgress[activeEnrollment.id] || null);
            } else {
                setCurriculum(null);
            }
            setIsLoading(false);
        };
        fetchJourney();
    }, [selectedChildId]);

    const flattenedJourney = useMemo(() => {
        if (!curriculum?.structure) return [];
        const flat: CurriculumItem[] = [];
        const traverse = (items: CurriculumItem[]) => {
            items.forEach(item => {
                flat.push(item);
                if (item.children) traverse(item.children);
            });
        };
        traverse(curriculum.structure);
        return flat;
    }, [curriculum]);

    const [selectedItem, setSelectedItem] = useState<CurriculumItem | null>(null);

    useEffect(() => {
        const firstInProgress = flattenedJourney.find(item => item.status === CurriculumStatus.IN_PROGRESS);
        setSelectedItem(firstInProgress || (flattenedJourney.length > 0 ? flattenedJourney[0] : null));
    }, [flattenedJourney]);


    if (children.length === 0) {
        return <ParentPageHeader title="Learning Journey" />;
    }
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <ParentPageHeader title="Learning Journey" />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
                    <p className="mt-4 text-gray-500">Loading learning journey...</p>
                </div>
            </div>
        )
    }

    if (!curriculum) {
        return (
            <>
                <ParentPageHeader title="Learning Journey" />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
                    <p className="mt-4 text-gray-500">This child does not have an active curriculum assigned.</p>
                </div>
            </>
        );
    }

    return (
        <div className="space-y-6">
            <ParentPageHeader title={`Learning Journey: ${curriculum.programTitle}`} />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md space-y-1 h-fit max-h-[70vh] overflow-y-auto">
                    {flattenedJourney.map(item => {
                        const isCompleted = item.status === CurriculumStatus.COMPLETED;
                        const isLocked = item.status === CurriculumStatus.LOCKED;
                        const baseTitleClass = item.type === 'Chapter' ? 'text-lg text-primary-700 dark:text-primary-300' : 'text-md text-gray-800 dark:text-white';
                        const statusTitleClass = isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : isLocked ? 'text-gray-400 dark:text-gray-500' : baseTitleClass;

                        return (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className={`p-3 rounded-lg cursor-pointer border-l-4 transition-colors flex items-center space-x-3 ${selectedItem?.id === item.id ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                style={{ paddingLeft: `${item.type === 'Topic' ? 2 : item.type === 'Sub-Topic' ? 3 : 1}rem` }}
                            >
                                <StatusIndicator status={item.status} />
                                <div className="flex-grow overflow-hidden">
                                    <p className={`font-semibold ${statusTitleClass}`}>{item.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.type}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="lg:col-span-7">
                    {selectedItem ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-6 sticky top-6">
                            <div>
                                <p className="text-sm font-semibold text-primary-500">{selectedItem.type}</p>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{selectedItem.title}</h2>
                            </div>
                             <div className="space-y-4">
                                <h4 className="font-semibold text-gray-600 dark:text-gray-300 flex items-center"><LinkIcon className="h-5 w-5 mr-2" />Resources</h4>
                                {selectedItem.studentResources && selectedItem.studentResources.length > 0 ? (
                                    selectedItem.studentResources.map(res => (
                                        <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-blue-500 hover:underline truncate">
                                            {res.title}
                                        </a>
                                    ))
                                ) : <p className="text-xs text-gray-400 italic">No resources for this item.</p>}
                            </div>
                        </div>
                    ) : (
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center justify-center h-full min-h-[300px]">
                            <BookOpenIcon className="h-12 w-12 text-gray-400" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Select an Item</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a chapter or topic from the left to see its details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentLearningJourneyPage;