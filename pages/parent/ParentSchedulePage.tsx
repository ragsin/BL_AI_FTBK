import React, { useMemo, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { Session, SessionStatus } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getSessions, getCancellationRequests, saveCancellationRequests } from '../../api/sessionApi';
import { useParentPortal } from '../../contexts/ParentPortalContext';
import ParentPageHeader from '../../components/ParentPageHeader';
import { useSettings } from '../../contexts/SettingsContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import ParentSessionDetailsModal from '../../components/ParentSessionDetailsModal';

const ParentSchedulePage: React.FC = () => {
    const { theme } = useTheme();
    const { addToast } = useToast();
    const { settings } = useSettings();
    const { selectedChildId, children } = useParentPortal();
    
    const [sessions, setSessions] = useState<Session[]>([]);
    const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [sessionToCancel, setSessionToCancel] = useState<Session | null>(null);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [sessionForDetails, setSessionForDetails] = useState<Session | null>(null);
    const [isCancellationPending, setIsCancellationPending] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [sessionsData, requestsData] = await Promise.all([
                getSessions(),
                getCancellationRequests(),
            ]);
            setSessions(sessionsData);
            setCancellationRequests(requestsData);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const childSessions = useMemo(() => {
        if (!selectedChildId) return [];
        return sessions.filter(s => s.studentId === selectedChildId);
    }, [selectedChildId, sessions]);

    const calendarEvents = useMemo(() => {
        const statusColors: Record<SessionStatus, string> = {
            [SessionStatus.SCHEDULED]: '#10b981',
            [SessionStatus.COMPLETED]: '#3b82f6',
            [SessionStatus.CANCELLED]: '#ef4444',
            [SessionStatus.ABSENT]: '#f97316',
        };
        return childSessions.map(session => ({
            id: session.id,
            title: session.title,
            start: session.start,
            end: session.end,
            backgroundColor: statusColors[session.status],
            borderColor: statusColors[session.status],
            extendedProps: session,
            classNames: (new Date(session.start) > new Date() && session.status === SessionStatus.SCHEDULED) ? ['cursor-pointer'] : []
        }));
    }, [childSessions]);
    
    const handleEventClick = (clickInfo: any) => {
        const session = clickInfo.event.extendedProps as Session;
        if (!session) return;
        
        const isUpcomingAndScheduled = new Date(session.start) > new Date() && session.status === SessionStatus.SCHEDULED;

        if (isUpcomingAndScheduled) {
            const existingRequest = cancellationRequests.find(
                req => req.sessionId === session.id && req.status === 'pending'
            );
            setIsCancellationPending(!!existingRequest);
            setSessionForDetails(session);
            setIsDetailsModalOpen(true);
        }
    };

    const handleRequestCancellation = () => {
        if (sessionForDetails) {
            setSessionToCancel(sessionForDetails);
            setIsDetailsModalOpen(false);
            setIsConfirmOpen(true);
        }
    };

    const handleConfirmCancellation = async () => {
        if (!sessionToCancel || !selectedChildId) return;

        const requests = await getCancellationRequests();
        const newRequest = {
            id: `cr-${Date.now()}`,
            sessionId: sessionToCancel.id,
            studentId: selectedChildId,
            requestedAt: new Date().toISOString(),
            status: 'pending' as const
        };
        await saveCancellationRequests([...requests, newRequest]);
        
        addToast("Cancellation request sent to teacher and administration.", 'info');
        setIsConfirmOpen(false);
        setSessionToCancel(null);
    };

    const renderEventContent = (eventInfo: any) => {
        const session = eventInfo.event.extendedProps as Session;
        const now = new Date().getTime();
        const startTime = new Date(session.start).getTime();
        const joinableAfter = startTime - (settings.sessionJoinWindow.joinBufferMinutesBefore * 60 * 1000);
        const joinableBefore = startTime + (settings.sessionJoinWindow.joinBufferMinutesAfter * 60 * 1000);
        const canJoin = session.status === SessionStatus.SCHEDULED && now >= joinableAfter && now <= joinableBefore && session.sessionUrl;
        const isUpcomingAndScheduled = new Date(session.start) > new Date() && session.status === SessionStatus.SCHEDULED;

        if (eventInfo.view.type.includes('list')) {
            return (
                 <div className="flex items-center justify-between w-full">
                    <span className="font-bold truncate">{eventInfo.event.title}</span>
                    <div className="flex items-center space-x-4">
                        {canJoin && <button onClick={(e) => { e.stopPropagation(); window.open(session.sessionUrl, '_blank'); }} className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-green-600">Join</button>}
                        {isUpcomingAndScheduled && <button onClick={(e) => { e.stopPropagation(); handleEventClick(eventInfo); }} className="text-xs font-bold text-primary-600 hover:underline">Details</button>}
                    </div>
                </div>
            );
        }

        return (
            <div className="p-1 overflow-hidden w-full flex items-center justify-between">
                <div className="truncate"><b>{eventInfo.timeText}</b><span className="ml-2">{eventInfo.event.title}</span></div>
                {canJoin && <button onClick={(e) => { e.stopPropagation(); window.open(session.sessionUrl, '_blank'); }} className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold hover:bg-green-600">Join</button>}
            </div>
        );
    };

    const CalendarStyles = () => (
        <style>{`
            :root { --fc-border-color: ${theme === 'dark' ? '#374151' : '#e5e7eb'}; --fc-list-event-dot-width: 10px; --fc-event-text-color: #ffffff; --fc-event-border-color: transparent; }
            .fc .fc-toolbar-title { color: ${theme === 'dark' ? '#f9fafb' : '#111827'}; }
            .fc .fc-daygrid-day-number { color: ${theme === 'dark' ? '#d1d5db' : '#374151'}; }
            .fc .fc-col-header-cell-cushion { color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'}; text-decoration: none; }
            .fc .fc-button { background-color: transparent !important; color: ${theme === 'dark' ? '#d1d5db' : '#374151'} !important; border: 1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'} !important; }
            .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active { background-color: #10b981 !important; color: white !important; border-color: #10b981 !important; box-shadow: none !important;}
        `}</style>
    );

    if (children.length === 0) {
        return <ParentPageHeader title="Schedule" />;
    }

  return (
    <>
        <div className="space-y-6 h-full flex flex-col">
            <ParentPageHeader title="Schedule" />
            <CalendarStyles />
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md flex flex-col flex-grow min-h-0">
                {isLoading ? <p>Loading schedule...</p> : (
                    <FullCalendar
                        key={selectedChildId}
                        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' }}
                        initialView="timeGridWeek"
                        weekends={true}
                        events={calendarEvents}
                        eventContent={renderEventContent}
                        eventClick={handleEventClick}
                        height="100%"
                        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                    />
                )}
            </div>
        </div>
        <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmCancellation} title="Request Session Cancellation" message={`Are you sure you want to request to cancel the session "${sessionToCancel?.title}"? This will notify your child's teacher and an administrator to review the request.`} />
        <ParentSessionDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} session={sessionForDetails} onRequestCancel={handleRequestCancellation} isCancellationPending={isCancellationPending} />
    </>
  );
};

export default ParentSchedulePage;
