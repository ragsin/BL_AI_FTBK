import React, { useState } from 'react';
import { useParentPortal } from '../../contexts/ParentPortalContext';
import ParentPageHeader from '../../components/ParentPageHeader';
import { Session, Assignment, EnrollmentStatus, SessionStatus, AssignmentStatus, CurriculumItem, CurriculumStatus, Program } from '../../types';
import { getSessions, getAssignments } from '../../api/sessionApi';
import { getCurriculumProgress, getPrograms } from '../../api/programApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { DocumentDownloadIcon } from '../../components/icons/Icons';

interface ReportData {
    childName: string;
    programTitle: string;
    dateRange: string;
    sessionsAttended: number;
    sessionsMissed: number;
    assignmentsCompleted: number;
    averageGrade: string;
    attendanceDetails: Session[];
    assignmentDetails: Assignment[];
    milestones: string[];
}

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

const ParentReportsPage: React.FC = () => {
    const { selectedChild, children } = useParentPortal();
    const [datePreset, setDatePreset] = useState('30');
    const [report, setReport] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!selectedChild) return;
        setIsLoading(true);

        const now = new Date();
        const startDate = new Date();
        let dateRangeString = '';

        switch (datePreset) {
            case '30': startDate.setDate(now.getDate() - 30); dateRangeString = 'Last 30 Days'; break;
            case '90': startDate.setDate(now.getDate() - 90); dateRangeString = 'Last 90 Days'; break;
            case 'year': startDate.setMonth(now.getMonth() - 12); dateRangeString = 'This School Year'; break;
            default: startDate.setTime(0); dateRangeString = 'All Time'; break;
        }

        const [allSessions, allAssignments, allEnrollments, allPrograms, allProgress] = await Promise.all([
            getSessions(), getAssignments(), getEnrollments(), getPrograms(), getCurriculumProgress()
        ]);
        
        const activeEnrollment = allEnrollments.find(e => e.studentId === selectedChild.id && e.status === EnrollmentStatus.ACTIVE);
        const program = activeEnrollment ? allPrograms.find(p => p.id === activeEnrollment.programId) : null;

        const sessionsInRange = allSessions.filter(s => s.studentId === selectedChild.id && new Date(s.start) >= startDate && new Date(s.start) <= now);
        const assignmentsInRange = allAssignments.filter(a => a.studentId === selectedChild.id && a.submittedAt && new Date(a.submittedAt) >= startDate && new Date(a.submittedAt) <= now);
        
        const sessionsAttended = sessionsInRange.filter(s => s.status === SessionStatus.COMPLETED).length;
        const sessionsMissed = sessionsInRange.filter(s => s.status === SessionStatus.ABSENT).length;
        const assignmentsCompleted = assignmentsInRange.filter(a => a.status === AssignmentStatus.GRADED || a.status === AssignmentStatus.SUBMITTED_LATE).length;
        
        const gradedAssignments = assignmentsInRange.filter(a => a.grade);
        let averageGrade = 'N/A';
        if (gradedAssignments.length > 0) {
            let totalScore = 0, count = 0;
            gradedAssignments.forEach(a => {
                const score = gradeToNumeric(a.grade);
                if (score !== null) { totalScore += score; count++; }
            });
            if (count > 0) averageGrade = `${(totalScore / count).toFixed(1)}%`;
        }
        
        let milestones: string[] = [];
        if (activeEnrollment) {
            const progress = allProgress[activeEnrollment.id];
            if (progress) {
                 const completedSessionsInRange = sessionsInRange.filter(s => s.status === SessionStatus.COMPLETED);
                 const completedCurriculumItemIds = new Set(completedSessionsInRange.map(s => s.curriculumItemId).filter(id => !!id));
                const findMilestones = (items: CurriculumItem[]) => {
                    items.forEach(item => {
                        if (item.status === CurriculumStatus.COMPLETED && completedCurriculumItemIds.has(item.id)) milestones.push(item.title);
                        if (item.children) findMilestones(item.children);
                    });
                };
                findMilestones(progress.structure);
            }
        }

        setReport({
            childName: `${selectedChild.firstName} ${selectedChild.lastName}`,
            programTitle: program?.title || 'N/A',
            dateRange: dateRangeString,
            sessionsAttended, sessionsMissed, assignmentsCompleted, averageGrade,
            attendanceDetails: sessionsInRange.sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
            assignmentDetails: assignmentsInRange.sort((a,b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()),
            milestones,
        });
        setIsLoading(false);
    };
    
    const handlePrint = () => { window.print(); };

    if (children.length === 0) {
        return <ParentPageHeader title="Progress Reports" />;
    }

    return (
        <div className="space-y-6">
            <ParentPageHeader title="Progress Reports" />
            <div id="report-controls" className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Generate Report</h2>
                <p className="text-sm text-gray-500 mt-1">Select a time period to generate a printable progress report for your child.</p>
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                    <select value={datePreset} onChange={e => setDatePreset(e.target.value)} className="bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3">
                        <option value="30">Last 30 Days</option><option value="90">Last 90 Days</option><option value="year">This School Year</option><option value="all">All Time</option>
                    </select>
                    <button onClick={handleGenerateReport} disabled={isLoading} className="bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 disabled:bg-primary-400">
                        {isLoading ? 'Generating...' : 'Generate Report'}
                    </button>
                    {report && <button onClick={handlePrint} className="flex items-center bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-700"><DocumentDownloadIcon className="h-5 w-5 mr-2"/>Print / Save as PDF</button>}
                </div>
            </div>
            {report && (
                <div id="report-preview" className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-gray-800 dark:text-gray-200">
                    <div className="border-b-2 border-gray-200 dark:border-gray-600 pb-4 mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Progress Report</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300">{report.childName}</p>
                        <div className="flex justify-between items-end mt-2"><p className="font-semibold text-primary-600 dark:text-primary-400">{report.programTitle}</p><p className="text-sm text-gray-500 dark:text-gray-400">{report.dateRange} ({new Date().toLocaleDateString()})</p></div>
                    </div>
                    <div className="mb-8"><h2 className="text-xl font-bold mb-4">Summary</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-2xl font-bold">{report.sessionsAttended}</p><p className="text-sm text-gray-500 dark:text-gray-400">Sessions Attended</p></div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-2xl font-bold">{report.sessionsMissed}</p><p className="text-sm text-gray-500 dark:text-gray-400">Sessions Missed</p></div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-2xl font-bold">{report.assignmentsCompleted}</p><p className="text-sm text-gray-500 dark:text-gray-400">Assignments Done</p></div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><p className="text-2xl font-bold">{report.averageGrade}</p><p className="text-sm text-gray-500 dark:text-gray-400">Average Grade</p></div>
                    </div></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div><h2 className="text-xl font-bold mb-4">Attendance Details</h2><ul className="space-y-2 text-sm max-h-80 overflow-y-auto pr-2">{report.attendanceDetails.length > 0 ? report.attendanceDetails.map(session => (
                            <li key={session.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex justify-between items-center font-semibold"><span>{new Date(session.start).toLocaleDateString()}</span><span className={session.status === 'Completed' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{session.status}</span></div>
                                {session.parentSummary && <p className="text-xs italic mt-1 pl-2 border-l-2 border-gray-300 dark:border-gray-600">{session.parentSummary}</p>}
                            </li>)) : <li className="text-center text-gray-500 italic py-4">No sessions in this period.</li>}</ul></div>
                        <div><h2 className="text-xl font-bold mb-4">Assignment Details</h2><ul className="space-y-2 text-sm max-h-80 overflow-y-auto pr-2">{report.assignmentDetails.length > 0 ? report.assignmentDetails.map(assignment => (
                            <li key={assignment.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex justify-between items-center font-semibold"><span>{assignment.title}</span><span>Grade: {assignment.grade || 'N/A'}</span></div>
                                {assignment.feedback && <p className="text-xs italic mt-1 pl-2 border-l-2 border-gray-300 dark:border-gray-600">{assignment.feedback}</p>}
                            </li>)) : <li className="text-center text-gray-500 italic py-4">No assignments in this period.</li>}</ul></div>
                    </div>
                    <div className="mt-8"><h2 className="text-xl font-bold mb-4">Curriculum Milestones Achieved</h2>{report.milestones.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-sm columns-2">{report.milestones.map((milestone, i) => (<li key={i}>{milestone}</li>))}</ul>) : <p className="text-center text-gray-500 italic py-4">No new milestones achieved in this period.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentReportsPage;
