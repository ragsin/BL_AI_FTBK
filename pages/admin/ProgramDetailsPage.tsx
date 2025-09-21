import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Program, CurriculumItem, ResourceLink, AssignmentTemplate, Role, Enrollment, CurriculumStatus, Assignment, AssignmentStatus, User } from '../../types';
import { ArrowLeftIcon, PencilIcon, BookOpenIcon, ChevronRightIcon, LinkIcon, DocumentTextIcon, DocumentDownloadIcon, UsersIcon, AcademicCapIcon, ClipboardDocumentCheckIcon, ScaleIcon } from '../../components/icons/Icons';
import ProgramFormModal from '../../components/ProgramFormModal';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SkeletonLoader from '../../components/SkeletonLoader';
import { getPrograms, savePrograms } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getAssignments } from '../../api/sessionApi';
import { getCurriculumProgress } from '../../api/programApi';
import { getUsers } from '../../api/userApi';

const StatusBadge: React.FC<{ status: Program['status'] }> = ({ status }) => {
    const colors = {
        Active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${colors[status]}`}>{status}</span>;
};

const ResourceList: React.FC<{ title: string, resources: ResourceLink[] | undefined }> = ({ title, resources }) => {
    if (!resources || resources.length === 0) return null;
    return (
        <div className="mt-2">
            <h5 className="font-semibold text-sm text-gray-600 dark:text-gray-400">{title}</h5>
            <div className="pl-4 mt-1 space-y-1">
                {resources.map(res => (
                     <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-blue-500 hover:underline">
                        <LinkIcon className="h-4 w-4" />
                        <span>{res.title}</span>
                    </a>
                ))}
            </div>
        </div>
    );
};

const CurriculumNode: React.FC<{ item: CurriculumItem; level: number }> = ({ item, level }) => {
    const [isOpen, setIsOpen] = useState(level < 1); // Open chapters by default

    const hasChildren = item.children && item.children.length > 0;
    const hasContent = (item.studentResources && item.studentResources.length > 0) || (item.teacherResources && item.teacherResources.length > 0) || (item.assignments && item.assignments.length > 0);

    return (
        <div style={{ paddingLeft: `${level * 1.5}rem` }}>
            <div
                className="flex items-center justify-between py-2 cursor-pointer group"
                onClick={() => (hasChildren || hasContent) && setIsOpen(!isOpen)}
            >
                <div className="flex items-center space-x-3">
                    {(hasChildren || hasContent) ? <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} /> : <div className="w-5 h-5" />}
                    <span className="font-semibold text-gray-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">{item.title}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{item.type}</span>
                </div>
            </div>
            {isOpen && (
                <div className="border-l-2 border-gray-200 dark:border-gray-600 ml-2.5 pl-5 py-2 space-y-3">
                    {hasContent && (
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <ResourceList title="Student Resources" resources={item.studentResources} />
                            <ResourceList title="Teacher Resources" resources={item.teacherResources} />
                            {item.assignments && item.assignments.length > 0 && (
                                <div className="mt-2">
                                <h5 className="font-semibold text-sm text-gray-600 dark:text-gray-400">Assignments</h5>
                                    <div className="pl-4 mt-1 space-y-1">
                                        {item.assignments?.map((ass: AssignmentTemplate) => (
                                            <div key={ass.id}>
                                                <a href={ass.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-indigo-500 hover:underline">
                                                    <DocumentTextIcon className="h-4 w-4" />
                                                    <span>{ass.title}</span>
                                                </a>
                                                {ass.instructions && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 pl-6">{ass.instructions}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {item.children?.map(child => <CurriculumNode key={child.id} item={child} level={level + 1} />)}
                </div>
            )}
        </div>
    );
};

const generateDownloadContent = (programToDownload: Program): string => {
    let content = `Program Details\n`;
    content += `===============\n`;
    content += `Title: ${programToDownload.title}\n`;
    content += `Status: ${programToDownload.status}\n`;
    content += `Target Grade Levels: ${programToDownload.targetGradeLevel.join(', ')}\n\n`;
    content += `Description:\n${programToDownload.description}\n\n`;

    content += `Curriculum\n`;
    content += `==========\n\n`;

    if (!programToDownload.structure || programToDownload.structure.length === 0) {
        content += "No curriculum defined for this program.\n";
        return content;
    }

    const processItem = (item: CurriculumItem, indent = '') => {
        content += `${indent}- [${item.type}] ${item.title}\n`;
        
        if (item.studentResources && item.studentResources.length > 0) {
            content += `${indent}  Student Resources:\n`;
            item.studentResources.forEach(res => {
                content += `${indent}    - ${res.title}: ${res.url}\n`;
            });
        }
        
        if (item.teacherResources && item.teacherResources.length > 0) {
            content += `${indent}  Teacher Resources:\n`;
            item.teacherResources.forEach(res => {
                content += `${indent}    - ${res.title}: ${res.url}\n`;
            });
        }

        if (item.assignments && item.assignments.length > 0) {
            content += `${indent}  Assignments:\n`;
            item.assignments.forEach(assign => {
                content += `${indent}    - ${assign.title}\n`;
                if(assign.instructions) content += `${indent}      Instructions: ${assign.instructions}\n`;
                if(assign.url) content += `${indent}      URL: ${assign.url}\n`;
            });
        }

        if (item.children && item.children.length > 0) {
            item.children.forEach(child => processItem(child, indent + '  '));
        }
    };

    programToDownload.structure.forEach(chapter => {
        processItem(chapter, '');
        content += '\n'; // Add space between chapters
    });

    return content;
};

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

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center space-x-3">
    <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full">
      <Icon className="h-5 w-5 text-primary-500" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  </div>
);

const ProgramDetailsPage: React.FC = () => {
    const { programId } = useParams<{ programId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();
    
    const [program, setProgram] = useState<Program | null>(null);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!programId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            const allPrograms = await getPrograms();
            const targetProgram = allPrograms.find(p => p.id === programId);
            setProgram(targetProgram || null);

            if (targetProgram) {
                const [allEnrollments, allAssignments, allProgress, allUsers] = await Promise.all([
                    getEnrollments(), getAssignments(), getCurriculumProgress(), getUsers()
                ]);
                
                const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
                const programEnrollments = allEnrollments.filter(e => e.programId === programId);
                const studentIds = new Set(programEnrollments.map(e => e.studentId));
                const teacherIds = new Set(programEnrollments.map(e => e.teacherId));

                const studentProgressMap = new Map<string, number>();
                let totalProgressPercent = 0;
                let countWithProgress = 0;
                programEnrollments.forEach(e => {
                    const progress = allProgress[e.id];
                    if (progress && progress.structure) {
                        let total = 0, completed = 0;
                        const traverse = (items: CurriculumItem[]) => { items.forEach(item => { total++; if (item.status === CurriculumStatus.COMPLETED) completed++; if (item.children) traverse(item.children); }); };
                        traverse(progress.structure);
                        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                        totalProgressPercent += percentage;
                        countWithProgress++;
                        studentProgressMap.set(e.studentId, percentage);
                    }
                });
                const averageProgress = countWithProgress > 0 ? Math.round(totalProgressPercent / countWithProgress) : 0;

                const programAssignments = allAssignments.filter(a => a.programId === programId);
                const submittedAssignments = programAssignments.filter(a => a.status !== AssignmentStatus.NOT_SUBMITTED);
                const submissionRate = programAssignments.length > 0 ? Math.round((submittedAssignments.length / programAssignments.length) * 100) : 0;
                
                const gradedAssignments = programAssignments.filter(a => a.grade);
                let totalScore = 0, gradedCount = 0;
                gradedAssignments.forEach(a => { const score = gradeToNumeric(a.grade); if (score !== null) { totalScore += score; gradedCount++; } });
                const averageGrade = gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0;

                const progressDistribution = [{ name: '0-25%', students: 0 }, { name: '26-50%', students: 0 }, { name: '51-75%', students: 0 }, { name: '76-100%', students: 0 }];
                studentProgressMap.forEach(percentage => {
                    if (percentage <= 25) progressDistribution[0].students++;
                    else if (percentage <= 50) progressDistribution[1].students++;
                    else if (percentage <= 75) progressDistribution[2].students++;
                    else progressDistribution[3].students++;
                });

                const teacherPerformance = Array.from(teacherIds).map(teacherId => {
                    const teacherEnrollments = programEnrollments.filter(e => e.teacherId === teacherId);
                    const teacherStudentIds = teacherEnrollments.map(e => e.studentId);
                    
                    const teacherAssignments = programAssignments.filter(a => teacherStudentIds.includes(a.studentId));
                    const gradedTeacherAssignments = teacherAssignments.filter(a => a.grade);
                    let teacherTotalScore = 0, teacherGradedCount = 0;
                    gradedTeacherAssignments.forEach(a => { const score = gradeToNumeric(a.grade); if (score !== null) { teacherTotalScore += score; teacherGradedCount++; } });
                    
                    const avgTeacherGrade = teacherGradedCount > 0 ? Math.round(teacherTotalScore / teacherGradedCount) : 0;
                    const avgTeacherProgress = teacherStudentIds.reduce((sum, sId) => sum + (studentProgressMap.get(sId) || 0), 0) / (teacherStudentIds.length || 1);

                    return { teacherId, teacherName: userMap.get(teacherId) || 'Unknown', studentCount: teacherStudentIds.length, averageProgress: Math.round(avgTeacherProgress), averageGrade: avgTeacherGrade };
                });

                setAnalyticsData({
                    totalStudents: studentIds.size, totalTeachers: teacherIds.size, averageProgress, submissionRate, averageGrade,
                    progressDistribution, teacherPerformance,
                });
            }
            setIsLoading(false);
        };

        fetchData();
    }, [programId]);

    const handleSaveProgram = async (updatedProgram: Program) => {
        const allPrograms = await getPrograms();
        const newPrograms = allPrograms.map(p => p.id === updatedProgram.id ? updatedProgram : p);
        await savePrograms(newPrograms);
        setProgram(updatedProgram);
        addToast('Program updated successfully!');
        setIsEditModalOpen(false);
    };
    
    const handleDownload = () => {
        if (!program) return;
        const content = generateDownloadContent(program);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `${program.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_curriculum.txt`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('Program and curriculum details downloaded!');
    };
    
    if (isLoading) {
        return <SkeletonLoader type="dashboard" />;
    }

    if (!program) {
        return <div className="text-center p-8">Program not found.</div>;
    }

    const isAdmin = user?.role === Role.ADMIN;
    const backPath = isAdmin ? '/admin/programs' : '/teacher/programs';

    return (
        <>
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <Link to={backPath} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Go back">
                                    <ArrowLeftIcon className="h-6 w-6" />
                                </Link>
                                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{program.title}</h1>
                                <StatusBadge status={program.status} />
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 ml-11">{program.description}</p>
                        </div>
                        <div className="flex items-center space-x-3 self-start md:self-center">
                            <button onClick={handleDownload} className="btn-secondary">
                                <DocumentDownloadIcon className="h-5 w-5 mr-2" />
                                Download
                            </button>
                            {isAdmin && (
                                <>
                                    <button onClick={() => setIsEditModalOpen(true)} className="btn-secondary">
                                        <PencilIcon className="h-5 w-5 mr-2" />
                                        Edit Program
                                    </button>
                                    <button onClick={() => navigate(`/admin/programs/${program.id}/curriculum`)} className="btn-primary">
                                        <BookOpenIcon className="h-5 w-5 mr-2" />
                                        Manage Curriculum
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                
                {isAdmin && analyticsData && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Program Analytics</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                           <StatCard title="Active Students" value={`${analyticsData.totalStudents}`} icon={UsersIcon} />
                           <StatCard title="Avg. Progress" value={`${analyticsData.averageProgress}%`} icon={AcademicCapIcon} />
                           <StatCard title="Submission Rate" value={`${analyticsData.submissionRate}%`} icon={ClipboardDocumentCheckIcon} />
                           <StatCard title="Avg. Grade" value={`${analyticsData.averageGrade}%`} icon={ScaleIcon} />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t dark:border-gray-700">
                           <div>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Student Progress Distribution</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={analyticsData.progressDistribution} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} />
                                        <Bar dataKey="students" fill="rgb(var(--color-primary-500))" />
                                    </BarChart>
                                </ResponsiveContainer>
                           </div>
                           <div>
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Teacher Performance</h3>
                                <div className="overflow-auto max-h-[250px]">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                            <tr>
                                                <th className="p-2 text-left font-medium">Teacher</th>
                                                <th className="p-2 text-center font-medium">Students</th>
                                                <th className="p-2 text-center font-medium">Avg. Progress</th>
                                                <th className="p-2 text-center font-medium">Avg. Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-gray-700">
                                            {analyticsData.teacherPerformance.map((t: any) => (
                                                <tr key={t.teacherId}>
                                                    <td className="p-2 font-semibold">{t.teacherName}</td>
                                                    <td className="p-2 text-center">{t.studentCount}</td>
                                                    <td className="p-2 text-center">{t.averageProgress}%</td>
                                                    <td className="p-2 text-center">{t.averageGrade}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                           </div>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Curriculum Overview</h2>
                    <div className="space-y-2">
                        {program.structure && program.structure.length > 0 ? (
                            program.structure.map(item => <CurriculumNode key={item.id} item={item} level={0} />)
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No curriculum has been defined for this program yet.</p>
                        )}
                    </div>
                </div>
            </div>
            
            {isAdmin && (
                <ProgramFormModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveProgram}
                    program={program}
                />
            )}
             <style>{`.btn-primary { @apply flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600; } .btn-secondary { @apply flex items-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600; }`}</style>
        </>
    );
};

export default ProgramDetailsPage;
