

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Session, SessionStatus, User, Program, Role, ProgramStatus, Enrollment, CreditTransaction, EnrollmentStatus, Unavailability, AvailabilitySlot, SessionType, CurriculumItem, Assignment, AssignmentStatus, CurriculumStatus, Announcement, CancellationRequest } from '../../types';
import SessionFormModal from '../../components/SessionFormModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { getSessions, saveSessions, getAssignments, saveAssignments, getCancellationRequests, saveCancellationRequests, triggerNextAssignmentAfterSession, updateCurriculumAfterSessionCompletion } from '../../api/sessionApi';
import { getEnrollments, saveEnrollments, getCreditTransactions, saveCreditTransactions } from '../../api/enrollmentApi';
import { getUsers, getAvailability, getUnavailability, addExperiencePoints } from '../../api/userApi';
import { getPrograms, getCurriculumProgress, saveCurriculumProgress } from '../../api/programApi';
import { getAnnouncements, saveAnnouncements } from '../../api/communicationApi';
import { useAuth } from '../../contexts/AuthContext';
import { InformationCircleIcon, XIcon, CheckCircleIcon, XCircleIcon } from '../../components/icons/Icons';
import { useSettings } from '../../contexts/SettingsContext';

const SchedulePage: React.FC = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
    const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
    const [teacherAvailability, setTeacherAvailability] = useState<AvailabilitySlot[]>([]);
    const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [
                sessionsData,
                enrollmentsData,
                creditTransactionsData,
                unavailabilityData,
                availabilityData,
                requestsData,
                usersData,
                programsData
            ] = await Promise.all([
                getSessions(),
                getEnrollments(),
                getCreditTransactions(),
                getUnavailability(),
                getAvailability(),
                getCancellationRequests(),
                getUsers(),
                getPrograms()
            ]);
            setSessions(sessionsData);
            setEnrollments(enrollmentsData);
            setCreditTransactions(creditTransactionsData);
            setUnavailability(unavailabilityData);
            setTeacherAvailability(availabilityData);
            setCancellationRequests(requestsData);
            setUsers(usersData);
            setPrograms(programsData.filter(p => p.status === ProgramStatus.ACTIVE));
        };
        fetchData();
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [selectedDateInfo, setSelectedDateInfo] = useState<any>(null);
    const calendarRef = useRef<FullCalendar>(null);
    const { theme } = useTheme();
    const { addToast } = useToast();
    const { settings } = useSettings();
    const { user: adminUser } = useAuth();

    const location = useLocation();
    const navigate = useNavigate();
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const teachers = useMemo(() => users.filter(u => u.role === Role.TEACHER), [users]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    
    useEffect(() => {
        if (teachers.length > 0 && !selectedTeacherId) {
            setSelectedTeacherId(teachers[0].id);
        }
    }, [teachers, selectedTeacherId]);

    const students = useMemo(() => users.filter(u => u.role === Role.STUDENT), [users]);
    
    const pendingCancellations = useMemo(() => {
        const sessionMap = new Map(sessions.map(s => [s.id, s]));
        return cancellationRequests
            .filter(r => r.status === 'pending')
            .map(req => {
                const student = userMap.get(req.studentId);
                const session = sessionMap.get(req.sessionId);
                return {
                    ...req,
                    studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
                    sessionDate: session ? new Date(session.start).toLocaleString() : 'Unknown Date',
                    sessionTitle: session?.title || 'Untitled Session'
                }
            });
    }, [cancellationRequests, sessions, userMap]);


    const statusColors: Record<SessionStatus, string> = {
        [SessionStatus.SCHEDULED]: '#10b981',
        [SessionStatus.COMPLETED]: '#3b82f6',
        [SessionStatus.CANCELLED]: '#ef4444',
        [SessionStatus.ABSENT]: '#f97316',
    };

    const calendarEvents = useMemo(() => {
        if (!selectedTeacherId) return [];
        return sessions
            .filter(s => s.teacherId === selectedTeacherId)
            .map(session => ({
                id: session.id,
                title: session.title,
                start: session.start,
                end: session.end,
                backgroundColor: statusColors[session.status],
                borderColor: statusColors[session.status],
                extendedProps: session,
            }));
    }, [sessions, selectedTeacherId]);

    const businessHours = useMemo(() => {
        if (!selectedTeacherId) return [];
        return teacherAvailability
            .filter(slot => slot.teacherId === selectedTeacherId)
            .map(slot => ({
                daysOfWeek: [slot.dayOfWeek],
                startTime: slot.startTime,
                endTime: slot.endTime,
            }));
    }, [selectedTeacherId, teacherAvailability]);

    const handleEventClick = (clickInfo: any) => {
        const session = sessions.find(s => s.id === clickInfo.event.id);
        if (session) {
            setSelectedSession(session);
            setIsModalOpen(true);
        }
    };

    const handleDateSelect = (selectInfo: any) => {
        setSelectedDateInfo(selectInfo);
        setSelectedSession(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSession(null);
        setSelectedDateInfo(null);
    };

    const handleCancelSession = async (sessionToCancel: Session, scope: 'single' | 'series') => {
        let sessionsToUpdate: Session[] = [];
        if (scope === 'single' || !sessionToCancel.recurringId) {
            sessionsToUpdate.push(sessionToCancel);
        } else {
            sessionsToUpdate = sessions.filter(s => 
                s.recurringId === sessionToCancel.recurringId && 
                new Date(s.start) >= new Date(sessionToCancel.start)
            );
        }

        if (sessionsToUpdate.length === 0) return;

        let updatedEnrollments = [...enrollments];
        let updatedCreditTxs = [...creditTransactions];
        let refundedCreditsCount = 0;

        sessionsToUpdate.forEach(s => {
            if (s.status !== SessionStatus.SCHEDULED) return;
            if (s.sessionType === SessionType.PARENT_TEACHER || s.sessionType === SessionType.DEMO) return;

            const enrollment = updatedEnrollments.find(e => e.studentId === s.studentId && e.programId === s.programId);
            if (enrollment) {
                const enrollmentIndex = updatedEnrollments.findIndex(e => e.id === enrollment.id);
                updatedEnrollments[enrollmentIndex] = { ...enrollment, creditsRemaining: enrollment.creditsRemaining + 1 };
                
                const newCreditTx: CreditTransaction = {
                    id: `ct-cancel-${s.id}`, enrollmentId: enrollment.id, change: 1, 
                    reason: `Credit refund for cancelled session on ${new Date(s.start).toLocaleDateString()}`, 
                    date: new Date().toISOString(), adminName: 'System'
                };
                updatedCreditTxs.push(newCreditTx);
                refundedCreditsCount++;
            }
        });

        const updatedSessions = sessions.map(s => {
            if (sessionsToUpdate.some(uts => uts.id === s.id)) {
                return { ...s, status: SessionStatus.CANCELLED };
            }
            return s;
        });

        setSessions(updatedSessions);
        setEnrollments(updatedEnrollments);
        setCreditTransactions(updatedCreditTxs);
        await saveSessions(updatedSessions);
        await saveEnrollments(updatedEnrollments);
        await saveCreditTransactions(updatedCreditTxs);

        addToast(`${refundedCreditsCount} credit(s) refunded. ${sessionsToUpdate.length} session(s) cancelled.`);
        handleCloseModal();
    };

    const handleSaveSession = async (sessionDataFromModal: Session, options: { isRecurring: boolean; numberOfSessions: number }) => {
        const { isRecurring, numberOfSessions } = options;
        const isDemo = sessionDataFromModal.sessionType === SessionType.DEMO;
        const student = !isDemo ? students.find(s => s.id === sessionDataFromModal.studentId) : null;
        const program = programs.find(p => p.id === sessionDataFromModal.programId);
        const isEditing = !!selectedSession;
        const originalSession = isEditing ? sessions.find(s => s.id === selectedSession.id) : null;
    
        const enrollment = !isDemo ? enrollments.find(e => e.studentId === sessionDataFromModal.studentId && e.programId === sessionDataFromModal.programId && e.status === EnrollmentStatus.ACTIVE) : null;
    
        if (!isEditing && isRecurring && enrollment && enrollment.creditsRemaining < numberOfSessions) {
             addToast(`Student does not have enough credits for the requested number of recurring sessions.`, 'error');
             return;
        }

        let finalTitle = sessionDataFromModal.title;
        if (isDemo) {
            finalTitle = `Demo: ${program?.title || 'Session'} - ${sessionDataFromModal.prospectName || 'Prospect'}`;
        } else if (sessionDataFromModal.sessionType === SessionType.CURRICULUM) {
            let curriculumPart = '';
            if (sessionDataFromModal.curriculumItemId && program?.structure) {
                let foundItem: CurriculumItem | undefined;
                const findItem = (items: CurriculumItem[]): CurriculumItem | undefined => {
                    for (const item of items) {
                        if (item.id === sessionDataFromModal.curriculumItemId) return item;
                        if (item.children) {
                            const found = findItem(item.children);
                            if (found) return found;
                        }
                    }
                    return undefined;
                };
                foundItem = findItem(program.structure);
                if (foundItem) {
                    curriculumPart = `: ${foundItem.title}`;
                }
            }
            finalTitle = `${program?.title || 'Session'}${curriculumPart} - ${student ? `${student.firstName} ${student.lastName}` : 'Student'}`;
        }
    
        if (!isRecurring) {
            const finalSession = { ...sessionDataFromModal, title: finalTitle };
    
            if (isEditing && originalSession) {
                const statusChanged = originalSession.status !== finalSession.status;
                const previousStatusWasScheduled = originalSession.status === SessionStatus.SCHEDULED;

                if (statusChanged && previousStatusWasScheduled && (finalSession.status === SessionStatus.COMPLETED || finalSession.status === SessionStatus.ABSENT)) {
                    const shouldDeductCredit = !isDemo && finalSession.sessionType !== SessionType.PARENT_TEACHER;
                    if (shouldDeductCredit && enrollment) {
                         if (enrollment.creditsRemaining > 0) {
                            const originalCredits = enrollment.creditsRemaining;
                            const newEnrollments = enrollments.map(e => e.id === enrollment.id ? { ...e, creditsRemaining: e.creditsRemaining - 1 } : e);
                            setEnrollments(newEnrollments);
                            await saveEnrollments(newEnrollments);
                            const newCredits = originalCredits - 1;

                            const newCreditTx: CreditTransaction = {
                                id: `ct-${finalSession.id}`, enrollmentId: enrollment.id, change: -1, reason: `Session marked as ${finalSession.status}`, date: new Date().toISOString(), adminName: 'System'
                            };
                            const finalCreditTxs = [...creditTransactions, newCreditTx];
                            setCreditTransactions(finalCreditTxs);
                            await saveCreditTransactions(finalCreditTxs);
                            addToast(`1 credit deducted for ${finalSession.status} session.`);

                            // Automated Low Credit Alert Logic
                            const alertSettings = settings.parentLowCreditAlerts;
                            if (alertSettings.enabled && originalCredits > alertSettings.threshold && newCredits <= alertSettings.threshold) {
                                const studentUser = users.find(u => u.id === finalSession.studentId);
                                const parent = studentUser?.parentId ? users.find(u => u.id === studentUser.parentId) : null;
                                const programForAlert = programs.find(p => p.id === finalSession.programId);

                                if (parent && studentUser && programForAlert) {
                                    const lowCreditTemplate = settings.messageTemplates.find(t => t.title === 'Low Credit Alert');
                                    if (lowCreditTemplate) {
                                        let content = lowCreditTemplate.content;
                                        content = content.replace(/\[Parent Name\]/g, `${parent.firstName} ${parent.lastName}`);
                                        content = content.replace(/\[Student Name\]/g, `${studentUser.firstName} ${studentUser.lastName}`);
                                        content = content.replace(/\[Program Name\]/g, programForAlert.title);
                                        content = content.replace(/\[Credits Remaining\]/g, newCredits.toString());
                                        content = content.replace(/\[Company Name\]/g, settings.companyName);

                                        const newAnnouncement: Announcement = {
                                            id: `ann-sys-${Date.now()}`,
                                            title: `Low Credit Alert for ${studentUser.firstName}`,
                                            content,
                                            targetUserIds: [parent.id],
                                            dateSent: new Date().toISOString(),
                                            sentById: 'system-auto',
                                        };
                                        await saveAnnouncements([...(await getAnnouncements()), newAnnouncement]);
                                        addToast(`Low credit alert sent to ${parent.firstName} ${parent.lastName}.`, 'info');
                                    }
                                }
                            }
                        } else {
                            addToast(`Student has no credits remaining. Credit not deducted.`, 'info');
                        }
                    }
                    if (finalSession.status === SessionStatus.COMPLETED) {
                        if (program && enrollment) {
                            const toastMessages = await triggerNextAssignmentAfterSession(finalSession, program, enrollment);
                            toastMessages.forEach(msg => addToast(msg, 'info'));

                            const { programCompleted } = await updateCurriculumAfterSessionCompletion(finalSession, enrollment);
                            if (programCompleted) {
                                const currentEnrollments = await getEnrollments();
                                const newEnrollments = currentEnrollments.map(e => e.id === enrollment.id ? { ...e, status: EnrollmentStatus.COMPLETED } : e);
                                setEnrollments(newEnrollments);
                                await saveEnrollments(newEnrollments);
                                addToast(`Student has completed the program! Enrollment status updated.`, 'info');
                            }
                        }
                        if (finalSession.studentId) {
                            await addExperiencePoints(finalSession.studentId, 50);
                            addToast(`Awarded 50XP to student for completing a session!`, 'info');
                        }
                    }
                }
                const newSessions = sessions.map(s => (s.id === finalSession.id ? finalSession : s));
                setSessions(newSessions);
                await saveSessions(newSessions);
                 addToast(`Session updated successfully!`);

            } else { 
                const newSession = { ...finalSession, id: `s-${Date.now()}` };
                const newSessions = [...sessions, newSession];
                setSessions(newSessions);
                await saveSessions(newSessions);
                addToast(`Session scheduled successfully!`);
            }

            handleCloseModal();
            return;
        }
    
        const initialStartDate = new Date(sessionDataFromModal.start);
        const sessionDuration = new Date(sessionDataFromModal.end).getTime() - initialStartDate.getTime();
        
        let allCurrentSessions = [...sessions];
        const newSessions: Session[] = [];
        const skippedDates: string[] = [];
        const recurringId = `rec-${Date.now()}`;
        
        for (let i = 0; i < numberOfSessions; i++) {
            const currentStartDate = new Date(initialStartDate.getTime());
            currentStartDate.setDate(currentStartDate.getDate() + (7 * i));
            const currentEndDate = new Date(currentStartDate.getTime() + sessionDuration);
            const dateString = currentStartDate.toLocaleDateString();

            const dayOfWeek = currentStartDate.getDay();
            const time = currentStartDate.toTimeString().substring(0, 5);
            const isTeacherAvailable = teacherAvailability.some(slot => 
                slot.teacherId === sessionDataFromModal.teacherId && slot.dayOfWeek === dayOfWeek && time >= slot.startTime && time < slot.endTime
            );
            if (!isTeacherAvailable) {
                skippedDates.push(dateString);
                continue;
            }

            const conflict = allCurrentSessions.some(s => {
                const existingStart = new Date(s.start);
                const existingEnd = new Date(s.end);
                const isOverlap = currentStartDate < existingEnd && currentEndDate > existingStart;
                const studentConflict = !isDemo && s.studentId === sessionDataFromModal.studentId;
                return isOverlap && (s.teacherId === sessionDataFromModal.teacherId || studentConflict);
            });
            if (conflict) {
                skippedDates.push(dateString);
                continue;
            }

            const newSession: Session = {
                ...sessionDataFromModal,
                id: `s-${Date.now()}-${i}`,
                title: finalTitle,
                start: currentStartDate.toISOString(),
                end: currentEndDate.toISOString(),
                recurringId: recurringId,
            };
            newSessions.push(newSession);
            allCurrentSessions.push(newSession);
        }
        
        if (newSessions.length > 0) {
            const finalSessions = [...sessions, ...newSessions];
            setSessions(finalSessions);
            await saveSessions(finalSessions);
        }
        
        let toastMessage = `Successfully scheduled ${newSessions.length} recurring sessions.`;
        if (skippedDates.length > 0) {
            toastMessage += ` Skipped ${[...new Set(skippedDates)].length} dates due to conflicts or unavailability: ${[...new Set(skippedDates)].join(', ')}.`;
        }
        addToast(toastMessage, newSessions.length > 0 ? 'success' : 'info');
        handleCloseModal();
    };
    
    const handleApprove = async (request: CancellationRequest) => {
        if (!adminUser) return;
        const allRequests = await getCancellationRequests();
        const updatedRequests = allRequests.map(r => r.id === request.id ? { ...r, status: 'approved' as 'approved' } : r);
        await saveCancellationRequests(updatedRequests);
        setCancellationRequests(updatedRequests);

        const session = sessions.find(s => s.id === request.sessionId);
        if (session) {
            await handleCancelSession(session, 'single');
            addToast('Cancellation approved. Session cancelled and credit refunded.');
        } else {
            addToast('Cancellation approved, but session could not be found to cancel.', 'info');
        }
    };
    
    const handleDeny = async (requestId: string) => {
        const allRequests = await getCancellationRequests();
        const updatedRequests = allRequests.map(r => r.id === requestId ? { ...r, status: 'denied' as 'denied' } : r);
        await saveCancellationRequests(updatedRequests);
        setCancellationRequests(updatedRequests);
        addToast('Cancellation request denied.');
    };


    const CalendarStyles = () => (
        <style>{`
            :root {
                --fc-border-color: ${theme === 'dark' ? '#374151' : '#e5e7eb'};
                --fc-daygrid-event-dot-width: 8px;
                --fc-list-event-dot-width: 10px;
                --fc-event-text-color: #ffffff;
                --fc-event-border-color: transparent;
            }
            .fc .fc-toolbar-title { color: ${theme === 'dark' ? '#f9fafb' : '#111827'}; }
            .fc .fc-daygrid-day-number { color: ${theme === 'dark' ? '#d1d5db' : '#374151'}; }
            .fc .fc-col-header-cell-cushion { color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; text-decoration: none; }
            .fc .fc-button { background-color: transparent !important; color: ${theme === 'dark' ? '#d1d5db' : '#374151'} !important; border: 1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'} !important; }
            .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active { background-color: #10b981 !important; color: white !important; border-color: #10b981 !important; box-shadow: none !important;}
        `}</style>
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Master Schedule</h1>
            <CalendarStyles />

            {pendingCancellations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md space-y-3">
                    <h3 className="font-semibold text-lg">Pending Cancellation Requests</h3>
                    {pendingCancellations.map(req => (
                        <div key={req.id} className="bg-info-50 dark:bg-info-900/30 p-3 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{req.studentName}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">"{req.sessionTitle}" on {req.sessionDate}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleApprove(req)} className="p-1.5 rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200" title="Approve">
                                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-200" />
                                </button>
                                <button onClick={() => handleDeny(req.id)} className="p-1.5 rounded-full bg-red-100 dark:bg-red-800 hover:bg-red-200" title="Deny">
                                    <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-200" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm flex flex-col flex-grow min-h-0">
                <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-4">
                    <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3 w-full sm:w-auto"
                    >
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                </div>
                <div className="flex-grow min-h-0">
                    <FullCalendar
                        key={selectedTeacherId}
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        initialView={'timeGridWeek'}
                        editable={true}
                        selectable={true}
                        selectMirror={true}
                        dayMaxEvents={true}
                        weekends={true}
                        events={calendarEvents}
                        businessHours={businessHours}
                        select={handleDateSelect}
                        eventClick={handleEventClick}
                        height="100%"
                        slotMinTime="08:00:00"
                        slotMaxTime="21:00:00"
                    />
                </div>
            </div>
            <SessionFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSession}
                onCancel={handleCancelSession}
                session={selectedSession}
                sessions={sessions}
                dateInfo={selectedDateInfo}
                students={students}
                teachers={teachers}
                programs={programs}
                enrollments={enrollments}
                availability={teacherAvailability}
                unavailability={unavailability}
                lockedTeacherId={selectedTeacherId}
            />
        </div>
    );
};

export default SchedulePage;