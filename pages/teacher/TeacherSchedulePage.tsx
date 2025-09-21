
import React, { useState, useMemo, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '../../contexts/AuthContext';
import { Session, SessionStatus, User, Program, Role, ProgramStatus, Enrollment, Unavailability, AvailabilitySlot, SessionType, CancellationRequest } from '../../types';
import SessionFormModal from '../../components/SessionFormModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { getSessions, saveSessions, getCancellationRequests, saveCancellationRequests } from '../../api/sessionApi';
import { getEnrollments } from '../../api/enrollmentApi';
import { getUsers, getAvailability, getUnavailability } from '../../api/userApi';
import { getPrograms } from '../../api/programApi';
import { CheckCircleIcon, XCircleIcon } from '../../components/icons/Icons';

const TeacherSchedulePage: React.FC = () => {
    const { user: teacher } = useAuth();
    const { theme } = useTheme();
    const { addToast } = useToast();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [unavailability, setUnavailability] = useState<Unavailability[]>([]);
    const [teacherAvailability, setTeacherAvailability] = useState<AvailabilitySlot[]>([]);
    const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!teacher) return;
            const [
                allSessions, allEnrollments, allUnavailability, allAvailability,
                allRequests, allUsers, allPrograms
            ] = await Promise.all([
                getSessions(), getEnrollments(), getUnavailability(), getAvailability(),
                getCancellationRequests(), getUsers(), getPrograms()
            ]);
            
            const mySessions = allSessions.filter(s => s.teacherId === teacher.id);
            const mySessionIds = new Set(mySessions.map(s => s.id));
            
            setSessions(mySessions);
            setEnrollments(allEnrollments.filter(e => e.teacherId === teacher.id));
            setUnavailability(allUnavailability.filter(u => u.teacherId === teacher.id));
            setTeacherAvailability(allAvailability.filter(a => a.teacherId === teacher.id));
            setCancellationRequests(allRequests.filter(r => mySessionIds.has(r.sessionId)));
            setUsers(allUsers);
            setPrograms(allPrograms.filter(p => p.status === ProgramStatus.ACTIVE));
        };
        fetchData();
    }, [teacher]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [selectedDateInfo, setSelectedDateInfo] = useState<any>(null);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const myStudents = useMemo(() => users.filter(u => u.role === Role.STUDENT && enrollments.some(e => e.studentId === u.id)), [users, enrollments]);

    const pendingCancellations = useMemo(() => {
        return cancellationRequests
            .filter(r => r.status === 'pending')
            .map(req => {
                const student = userMap.get(req.studentId);
                const session = sessions.find(s => s.id === req.sessionId);
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
        return sessions.map(session => ({
            id: session.id, title: session.title, start: session.start, end: session.end,
            backgroundColor: statusColors[session.status], borderColor: statusColors[session.status],
            extendedProps: session,
        }));
    }, [sessions]);

    const businessHours = useMemo(() => {
        return teacherAvailability.map(slot => ({ daysOfWeek: [slot.dayOfWeek], startTime: slot.startTime, endTime: slot.endTime }));
    }, [teacherAvailability]);

    const handleEventClick = (clickInfo: any) => {
        const session = sessions.find(s => s.id === clickInfo.event.id);
        if (session) { setSelectedSession(session); setIsModalOpen(true); }
    };
    
    const handleDateSelect = (selectInfo: any) => {
        setSelectedDateInfo(selectInfo); setSelectedSession(null); setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false); setSelectedSession(null); setSelectedDateInfo(null);
    };

    const handleSaveSession = async (sessionData: Session, options: { isRecurring: boolean; numberOfSessions: number }) => {
        const allSessions = await getSessions();
        let updatedSessions: Session[];
        
        if (options.isRecurring) {
            // Simplified recurring logic without credit checks for teachers
            const initialStartDate = new Date(sessionData.start);
            const sessionDuration = new Date(sessionData.end).getTime() - initialStartDate.getTime();
            const newSessions: Session[] = [];
            const recurringId = `rec-${Date.now()}`;
            for (let i = 0; i < options.numberOfSessions; i++) {
                const currentStartDate = new Date(initialStartDate.getTime());
                currentStartDate.setDate(currentStartDate.getDate() + (7 * i));
                const newSession: Session = { ...sessionData, id: `s-${Date.now()}-${i}`, start: currentStartDate.toISOString(), end: new Date(currentStartDate.getTime() + sessionDuration).toISOString(), recurringId: recurringId };
                newSessions.push(newSession);
            }
            updatedSessions = [...allSessions, ...newSessions];
            addToast(`Scheduled ${options.numberOfSessions} recurring sessions.`);
        } else {
            if (selectedSession) {
                updatedSessions = allSessions.map(s => s.id === sessionData.id ? sessionData : s);
                addToast('Session updated!');
            } else {
                const newSession = { ...sessionData, id: `s-${Date.now()}` };
                updatedSessions = [...allSessions, newSession];
                addToast('Session scheduled!');
            }
        }
        await saveSessions(updatedSessions);
        setSessions(updatedSessions.filter(s => s.teacherId === teacher?.id));
        handleCloseModal();
    };

    const handleCancelSession = async (sessionToCancel: Session, scope: 'single' | 'series') => {
        let sessionsToUpdateIds: Set<string> = new Set();
        if (scope === 'single' || !sessionToCancel.recurringId) {
            sessionsToUpdateIds.add(sessionToCancel.id);
        } else {
            sessions.filter(s => s.recurringId === sessionToCancel.recurringId && new Date(s.start) >= new Date(sessionToCancel.start)).forEach(s => sessionsToUpdateIds.add(s.id));
        }

        const allSessions = await getSessions();
        const updatedSessions = allSessions.map(s => sessionsToUpdateIds.has(s.id) ? { ...s, status: SessionStatus.CANCELLED } : s);

        await saveSessions(updatedSessions);
        setSessions(updatedSessions.filter(s => s.teacherId === teacher?.id));
        addToast(`${sessionsToUpdateIds.size} session(s) cancelled.`);
        handleCloseModal();
    };
    
    const handleApprove = async (request: CancellationRequest) => {
        const allRequests = await getCancellationRequests();
        const updatedRequests = allRequests.map(r => r.id === request.id ? { ...r, status: 'approved' as const } : r);
        await saveCancellationRequests(updatedRequests);
        const mySessionIds = new Set(sessions.map(s => s.id));
        setCancellationRequests(updatedRequests.filter(r => mySessionIds.has(r.sessionId)));

        const session = sessions.find(s => s.id === request.sessionId);
        if (session) {
            handleCancelSession(session, 'single');
            addToast('Cancellation approved and session cancelled.');
        }
    };
    
    const handleDeny = async (requestId: string) => {
        const allRequests = await getCancellationRequests();
        const updatedRequests = allRequests.map(r => r.id === requestId ? { ...r, status: 'denied' as const } : r);
        await saveCancellationRequests(updatedRequests);
        const mySessionIds = new Set(sessions.map(s => s.id));
        setCancellationRequests(updatedRequests.filter(r => mySessionIds.has(r.sessionId)));
        addToast('Cancellation request denied.');
    };
    
    const CalendarStyles = () => (
        <style>{`
            :root {
                --fc-border-color: ${theme === 'dark' ? '#374151' : '#e5e7eb'};
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
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Schedule</h1>
            <CalendarStyles />
            {pendingCancellations.length > 0 && (
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md space-y-3">
                    <h3 className="font-semibold text-lg">Pending Cancellation Requests</h3>
                    {pendingCancellations.map(req => (
                        <div key={req.id} className="bg-info-50 dark:bg-info-900/30 p-3 rounded-lg flex items-center justify-between">
                            <div><p className="font-semibold">{req.studentName}</p><p className="text-sm text-gray-600 dark:text-gray-300">"{req.sessionTitle}" on {req.sessionDate}</p></div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleApprove(req as CancellationRequest)} title="Approve"><CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-200" /></button>
                                <button onClick={() => handleDeny(req.id)} title="Deny"><XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-200" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm flex flex-col flex-grow min-h-0">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
                    initialView={'timeGridWeek'} editable={true} selectable={true} selectMirror={true} dayMaxEvents={true}
                    weekends={true} events={calendarEvents} businessHours={businessHours} select={handleDateSelect} eventClick={handleEventClick}
                    height="100%" slotMinTime="08:00:00" slotMaxTime="21:00:00"
                />
            </div>
             <SessionFormModal
                isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveSession} onCancel={handleCancelSession}
                session={selectedSession} sessions={sessions} dateInfo={selectedDateInfo} students={myStudents}
                teachers={users.filter(u => u.role === Role.TEACHER)} programs={programs} enrollments={enrollments}
                availability={teacherAvailability} unavailability={unavailability} lockedTeacherId={teacher?.id}
            />
        </div>
    );
};

export default TeacherSchedulePage;
