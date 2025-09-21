import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AvailabilitySlot, Unavailability } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAvailability, saveAvailability, getUnavailability, saveUnavailability } from '../../api/userApi';
import { PlusIcon, TrashIcon, CalendarIcon } from '../../components/icons/Icons';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import ConfirmationModal from '../../components/ConfirmationModal';

const MyAvailabilityPage: React.FC = () => {
    const { user: teacher } = useAuth();
    const { addToast } = useToast();
    
    const [weeklySlots, setWeeklySlots] = useState<AvailabilitySlot[]>([]);
    const [oneOffUnavailability, setOneOffUnavailability] = useState<Unavailability[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newUnavailabilityDate, setNewUnavailabilityDate] = useState('');
    
    const [slotToDelete, setSlotToDelete] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!teacher) return;
        setIsLoading(true);
        const [availabilityData, unavailabilityData] = await Promise.all([
            getAvailability(),
            getUnavailability()
        ]);
        setWeeklySlots(availabilityData.filter(s => s.teacherId === teacher.id));
        setOneOffUnavailability(unavailabilityData.filter(u => u.teacherId === teacher.id));
        setIsLoading(false);
        setIsDirty(false);
    }, [teacher]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const calendarEvents: EventInput[] = useMemo(() => {
        return weeklySlots.map(slot => ({
            id: slot.id,
            daysOfWeek: [slot.dayOfWeek],
            startTime: slot.startTime,
            endTime: slot.endTime,
            title: 'Available',
            classNames: ['cursor-pointer', 'bg-primary-500', 'border-primary-500'],
        }));
    }, [weeklySlots]);

    const handleSelect = (selectInfo: any) => {
        if (!teacher) return;
        const newSlot: AvailabilitySlot = {
            id: `new-${Date.now()}`,
            teacherId: teacher.id,
            dayOfWeek: selectInfo.start.getDay(),
            startTime: selectInfo.start.toTimeString().substring(0, 5),
            endTime: selectInfo.end.toTimeString().substring(0, 5),
        };
        setWeeklySlots(prev => [...prev, newSlot]);
        setIsDirty(true);
    };

    const handleEventChange = (changeInfo: any) => {
        const { id, start, end } = changeInfo.event;
        setWeeklySlots(prev => prev.map(slot => {
            if (slot.id === id) {
                return {
                    ...slot,
                    dayOfWeek: start.getDay(),
                    startTime: start.toTimeString().substring(0, 5),
                    endTime: end.toTimeString().substring(0, 5),
                };
            }
            return slot;
        }));
        setIsDirty(true);
    };
    
    const handleEventClick = (clickInfo: any) => {
        setSlotToDelete(clickInfo.event.id);
        setIsConfirmOpen(true);
    };

    const confirmDeleteSlot = () => {
        if (slotToDelete) {
            setWeeklySlots(prev => prev.filter(slot => slot.id !== slotToDelete));
            setIsDirty(true);
            setSlotToDelete(null);
            setIsConfirmOpen(false);
        }
    };
    
    const handleAddUnavailability = () => {
        if (!teacher || !newUnavailabilityDate) return;
        const alreadyExists = oneOffUnavailability.some(u => u.date === newUnavailabilityDate);
        if (alreadyExists) {
            addToast('This date is already marked as unavailable.', 'error');
            return;
        }
        const newEntry: Unavailability = {
            id: `unavail-${Date.now()}`,
            teacherId: teacher.id,
            date: newUnavailabilityDate,
        };
        setOneOffUnavailability(prev => [...prev, newEntry].sort((a,b) => a.date.localeCompare(b.date)));
        setNewUnavailabilityDate('');
        setIsDirty(true);
    };

    const handleRemoveUnavailability = (id: string) => {
        setOneOffUnavailability(prev => prev.filter(u => u.id !== id));
        setIsDirty(true);
    };


    const handleSaveChanges = async () => {
        if (!teacher) return;

        // Validation for weekly slots
        const sortedSlots = [...weeklySlots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
        for (let i = 0; i < sortedSlots.length; i++) {
            const slot = sortedSlots[i];
            if (slot.startTime >= slot.endTime) {
                addToast(`Error on ${daysOfWeek[slot.dayOfWeek]}: Start time must be before end time.`, 'error');
                return;
            }
            if (i > 0) {
                const prev = sortedSlots[i - 1];
                if (prev.dayOfWeek === slot.dayOfWeek && prev.endTime > slot.startTime) {
                    addToast(`Error on ${daysOfWeek[slot.dayOfWeek]}: Overlapping time slots detected.`, 'error');
                    return;
                }
            }
        }
        
        const allAvailability = await getAvailability();
        const otherTeachersAvailability = allAvailability.filter(slot => slot.teacherId !== teacher.id);
        
        const allUnavailability = await getUnavailability();
        const otherTeachersUnavailability = allUnavailability.filter(u => u.teacherId !== teacher.id);
        
        await Promise.all([
            saveAvailability([...otherTeachersAvailability, ...weeklySlots]),
            saveUnavailability([...otherTeachersUnavailability, ...oneOffUnavailability])
        ]);
        
        addToast('Availability saved successfully!');
        setIsDirty(false);
    };
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-white">My Availability</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Manage your recurring weekly hours and specific unavailable dates.
                    </p>
                </div>
                <button 
                    onClick={handleSaveChanges} 
                    disabled={!isDirty || isLoading}
                    className="bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md h-[70vh]">
                     <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 pl-2">Recurring Weekly Schedule</h3>
                     <p className="text-xs text-gray-500 mb-4 pl-2">Click and drag on the calendar to create new slots. Drag, resize, or click to delete existing slots.</p>
                     {isLoading ? <p>Loading calendar...</p> : (
                        <FullCalendar
                            plugins={[timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={false}
                            allDaySlot={false}
                            height="100%"
                            events={calendarEvents}
                            selectable={true}
                            selectMirror={true}
                            editable={true}
                            select={handleSelect}
                            eventChange={handleEventChange}
                            eventClick={handleEventClick}
                            slotMinTime="07:00:00"
                            slotMaxTime="22:00:00"
                            contentHeight="auto"
                        />
                     )}
                </div>
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Specific Unavailable Dates</h3>
                        <div className="flex items-center space-x-2">
                             <input 
                                type="date"
                                value={newUnavailabilityDate}
                                onChange={(e) => setNewUnavailabilityDate(e.target.value)}
                                min={today}
                                className="input-style flex-grow"
                            />
                            <button onClick={handleAddUnavailability} className="p-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"><PlusIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md max-h-96 overflow-y-auto">
                        <h4 className="text-md font-semibold text-gray-600 dark:text-gray-400 mb-3">Upcoming Unavailable Dates</h4>
                        {oneOffUnavailability.length > 0 ? (
                            <ul className="space-y-2">
                                {oneOffUnavailability.map(u => (
                                    <li key={u.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{new Date(u.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
                                        <button onClick={() => handleRemoveUnavailability(u.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-4 w-4"/></button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-center text-gray-400 italic py-4">No specific dates marked as unavailable.</p>
                        )}
                    </div>
                </div>
            </div>
             <style>{`.input-style { @apply px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm; } .fc .fc-v-event { border-radius: 4px !important; } .fc .fc-timegrid-slot-lane { height: 2.5em !important; }`}</style>
             <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDeleteSlot}
                title="Delete Availability Slot"
                message="Are you sure you want to delete this availability slot?"
            />
        </div>
    );
};

export default MyAvailabilityPage;