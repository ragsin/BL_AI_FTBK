import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Program, ProgramStatus } from '../../types';
import { getPrograms } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { UsersIcon, AcademicCapIcon } from '../../components/icons/Icons';


const StatusBadge: React.FC<{ status: ProgramStatus }> = ({ status }) => {
    const statusColors: Record<ProgramStatus, string> = {
        [ProgramStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [ProgramStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [ProgramStatus.ARCHIVED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>
};

const ProgramCard: React.FC<{ program: Program; onClick: () => void; }> = ({ program, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col cursor-pointer"
        >
            <div className="p-6 flex-grow">
                <div className="flex justify-between items-start">
                    <StatusBadge status={program.status} />
                </div>
                <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{program.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{program.targetGradeLevel.join(', ')}</p>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 h-20 overflow-hidden text-ellipsis">
                    {program.description}
                </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 mt-auto">
                 <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center"><UsersIcon className="h-4 w-4 mr-1.5" />{program.studentCount} Students</span>
                    <span className="flex items-center"><AcademicCapIcon className="h-4 w-4 mr-1.5" />{program.teacherCount} Teachers</span>
                 </div>
            </div>
        </div>
    );
};

const TeacherProgramsPage: React.FC = () => {
    const { user: teacher } = useAuth();
    const navigate = useNavigate();
    const [myPrograms, setMyPrograms] = useState<Program[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPrograms = async () => {
            if (!teacher) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const allPrograms = await getPrograms();
            const allEnrollments = await getEnrollments();
            const programIds = new Set(allEnrollments.filter(e => e.teacherId === teacher.id).map(e => e.programId));
            setMyPrograms(allPrograms.filter(p => programIds.has(p.id) && p.status === ProgramStatus.ACTIVE));
            setIsLoading(false);
        };
        fetchPrograms();
    }, [teacher]);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Programs</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                    These are the programs you are currently assigned to teach.
                </p>
            </div>
            {isLoading ? <p>Loading programs...</p> : myPrograms.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                    <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No programs assigned</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You are not currently assigned to any active programs.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {myPrograms.map(program => (
                        <ProgramCard 
                            key={program.id}
                            program={program}
                            onClick={() => navigate(`/teacher/programs/${program.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeacherProgramsPage;