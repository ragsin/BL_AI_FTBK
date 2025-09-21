import React, { useMemo, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { useAuth } from '../../contexts/AuthContext';
import { Session, SessionStatus } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getSessions, saveSessions, getCancellationRequests, saveCancellationRequests } from '../../api/sessionApi';
import ConfirmationModal from '../../components/ConfirmationModal';
import PreSessionQuestionModal from '../../components/PreSessionQuestionModal';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';

const StudentSchedulePage: React.FC = () => {
    const { user: student } = useAuth();
    const { theme } = useTheme();
    const { addToast } = useToast();
    const { settings } = useSettings();
    
    const [sessions, setSessions] = useState<Session[]>([]);
    const [cancellationRequests, setCancellationRequests] = useState(() => []);
    const [isLoading, setIsLoading] = useState(true);
    
    const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [sessionForQuestions, setSessionForQuestions] = useState<Session | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        const [sessionsData, requestsData] = await Promise.all([
            getSessions(),
            getCancellationRequests(),
        ]);
        setSessions(sessionsData);
        // @ts-ignore
        setCancellationRequests(requestsData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const mySessions = useMemo(() => {
        if (!student) return [];
        return sessions.filter(s => s.studentId === student.id || student.childrenIds?.includes(s.studentId));
    }, [student, sessions]);

    const calendarEvents = useMemo(() => {
        const statusColors: Record<SessionStatus, string> = {
            [SessionStatus.SCHEDULED]: '#38BDF8',
            [SessionStatus.COMPLETED]: '#34D399',
            [SessionStatus.CANCELLED]: '#F87171',
            [SessionStatus.ABSENT]: '#FBBF24',
        };
        return mySessions.map(session => ({
            id: session.id,
            title: session.title,
            start: session.start,
            end: session.end,
            backgroundColor: statusColors[session.status],
            borderColor: statusColors[session.status],
            extendedProps: session,
            classNames: (new Date(session.start) > new Date() && session.status === SessionStatus.SCHEDULED) ? ['cursor-pointer'] : []
        }));
    }, [mySessions]);

    const handleEventClick = (clickInfo: any) => {
        const session = clickInfo.event.extendedProps as Session;
        if (!session) return;
        
        const isUpcomingAndScheduled = new Date(session.start) > new Date() && session.status === SessionStatus.SCHEDULED;

        if (isUpcomingAndScheduled) {
            setSessionForQuestions(session);
            setIsQuestionModalOpen(true);
        }
    };
    
    const handleSaveQuestions = async (sessionWithQuestions: Session) => {
        const newSessions = sessions.map(s => s.id === sessionWithQuestions.id ? sessionWithQuestions : s);
        await saveSessions(newSessions);
        setSessions(newSessions);
        addToast('Your questions have been saved and sent to your teacher.');
        setIsQuestionModalOpen(false);
    };

    const handleRequestCancellation = () => {
        if (sessionForQuestions) {
            setSessionToCancel(sessionForQuestions);
            setIsQuestionModalOpen(false);
            setIsConfirmOpen(true);
        }
    };

    const handleConfirmCancellation = async () => {
        if (!sessionToCancel || !student) return;

        const requests = await getCancellationRequests();
        const newRequest = {
            id: `cr-${Date.now()}`,
            sessionId: sessionToCancel.id,
            studentId: student.id,
            requestedAt: new Date().toISOString(),
            status: 'pending' as const
        };
        await saveCancellationRequests([...requests, newRequest]);
        
        addToast('Cancellation request sent to administration.', 'info');
        setIsConfirmOpen(false);
        setSessionToCancel(null);
    };

    const renderEventContent = (eventInfo: any) => {
        const session = eventInfo.event.extendedProps as Session;
        const isUpcomingAndScheduled = new Date(session.start) > new Date() && session.status === SessionStatus.SCHEDULED;
    
        if (eventInfo.view.type.includes('list')) {
            return (
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        {session.preSessionQuestions && <span title="You have submitted questions" className="flex-shrink-0">❓</span>}
                        <span className="font-bold truncate">{eventInfo.event.title}</span>
                    </div>
                    {isUpcomingAndScheduled && (
                        <button onClick={(e) => { e.stopPropagation(); setSessionToCancel(session); setIsConfirmOpen(true); }} className="ml-4 flex-shrink-0 text-xs font-bold text-red-600 hover:underline">
                            Request Cancellation
                        </button>
                    )}
                </div>
            );
        }
    
        return (
            <div className="flex items-center space-x-2 p-1 overflow-hidden font-bold">
                <b className="truncate">{eventInfo.timeText}</b>
                <span className="truncate">{eventInfo.event.title}</span>
                {session.preSessionQuestions && <span title="You have submitted questions for this session">❓</span>}
            </div>
        )
    }

    const CalendarStyles = () => (
        <style>{`
            :root {
                --fc-border-color: ${theme === 'dark' ? 'var(--student-bg-dark)' : '#E0F2FE'};
                --fc-daygrid-event-dot-width: 8px;
                --fc-list-event-dot-width: 10px;
                --fc-event-text-color: #ffffff;
                --fc-event-border-color: transparent;
            }
            .fc .fc-toolbar-title { color: var(--student-text-light); }
            .dark .fc .fc-toolbar-title { color: var(--student-text-dark); }
            .fc .fc-daygrid-day-number { color: var(--student-text-light); }
            .dark .fc .fc-daygrid-day-number { color: var(--student-text-dark); }
            .fc .fc-col-header-cell-cushion { color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; text-decoration: none; font-weight: 700; }
            .fc .fc-button { 
                background-color: #fff !important; 
                color: var(--student-primary-light) !important; 
                border: 2px solid var(--student-primary-light) !important; 
                font-weight: 700 !important;
            }
            .dark .fc .fc-button {
                 background-color: var(--student-bg-dark) !important; 
                 color: var(--student-primary-dark) !important; 
                 border-color: var(--student-primary-dark) !important;
            }
            .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active { 
                background-color: var(--student-primary-light) !important; 
                color: white !important; 
                border-color: var(--student-primary-light) !important;
                box-shadow: none !important;
            }
            .dark .fc .fc-button-primary:not(:disabled).fc-button-active, .dark .fc .fc-button-primary:not(:disabled):active {
                background-color: var(--student-primary-dark) !important; 
                color: var(--student-text-light) !important; 
                border-color: var(--student-primary-dark) !important;
            }
            .fc-event { cursor: pointer; }
        `}</style>
    );

  return (
    <>
        <CalendarStyles />
        <div className="space-y-6 h-full flex flex-col">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white">My Schedule</h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Here's a look at all your upcoming adventures!</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl shadow-lg flex flex-col flex-grow min-h-0">
                {isLoading ? <p>Loading schedule...</p> : (
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,listWeek'
                        }}
                        initialView="timeGridWeek"
                        weekends={true}
                        events={calendarEvents}
                        eventClick={handleEventClick}
                        eventContent={renderEventContent}
                        height="100%"
                        slotMinTime="08:00:00"
                        slotMaxTime="21:00:00"
                    />
                )}
            </div>
        </div>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={handleConfirmCancellation}
            title="Request Session Cancellation"
            message={`Are you sure you want to request to cancel the session "${sessionToCancel?.title}"? This will notify an administrator to review your request.`}
        />
        <PreSessionQuestionModal
            isOpen={isQuestionModalOpen}
            onClose={() => setIsQuestionModalOpen(false)}
            onSave={handleSaveQuestions}
            session={sessionForQuestions}
            onRequestCancel={handleRequestCancellation}
        />
    </>
  );
};

export default StudentSchedulePage;
