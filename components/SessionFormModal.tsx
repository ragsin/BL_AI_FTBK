
import React, { useState, useEffect, useMemo } from 'react';
import { Session, SessionStatus, User, Program, Enrollment, EnrollmentStatus, AvailabilitySlot, Unavailability, SessionType, CurriculumItem } from '../types';
import { XIcon, UsersIcon, AcademicCapIcon, CalendarIcon, ClockIcon, InformationCircleIcon, ExclamationTriangleIcon, LinkIcon, BookOpenIcon, PencilSquareIcon, QuestionMarkCircleIcon } from './icons/Icons';
import { useToast } from '../contexts/ToastContext';
import CancelSessionModal from './CancelSessionModal';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Session, options: { isRecurring: boolean; numberOfSessions: number }) => void;
  onCancel: (session: Session, scope: 'single' | 'series') => void;
  session: Session | null;
  sessions: Session[];
  dateInfo: any;
  students: User[];
  teachers: User[];
  programs: Program[];
  enrollments: Enrollment[];
  availability: AvailabilitySlot[];
  unavailability: Unavailability[];
  lockedTeacherId?: string;
  lockedStudentId?: string;
}

const FormRow: React.FC<{ icon: React.ElementType, label: string, children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
    <div className="flex items-start space-x-4">
        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full mt-1">
            <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="mt-1">{children}</div>
        </div>
    </div>
);

const SessionFormModal: React.FC<SessionFormModalProps> = ({ isOpen, onClose, onSave, onCancel, session, sessions, dateInfo, students, teachers, programs, enrollments, availability, unavailability, lockedTeacherId, lockedStudentId }) => {
  const [formData, setFormData] = useState<{
    programId: string;
    studentId: string;
    teacherId: string;
    startDate: string;
    startTime: string;
    endTime: string;
    status: string;
    privateNotes: string;
    parentSummary: string;
    sessionUrl: string;
    sessionType: string;
    title: string;
    prospectName: string;
    curriculumItemId: string;
  }>({
    programId: '',
    studentId: '',
    teacherId: '',
    startDate: '',
    startTime: '',
    endTime: '',
    status: SessionStatus.SCHEDULED,
    privateNotes: '',
    parentSummary: '',
    sessionUrl: '',
    sessionType: SessionType.CURRICULUM,
    title: '',
    prospectName: '',
    curriculumItemId: '',
  });
  const [isRecurring, setIsRecurring] = useState(false);
  const [numberOfSessions, setNumberOfSessions] = useState(2);
  const [endDate, setEndDate] = useState('');
  
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>(programs);
  const [isTeacherLocked, setIsTeacherLocked] = useState(!!lockedTeacherId);
  const [validation, setValidation] = useState<{ type: 'error' | 'warning' | 'info' | null, text: string }>({ type: null, text: '' });
  const [isSaveDisabled, setIsSaveDisabled] = useState(false);
  const { addToast } = useToast();

  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const isPastSession = useMemo(() => session && new Date(session.end) < new Date(), [session]);
  const isActionable = isPastSession && session?.status === SessionStatus.SCHEDULED;
  const isNotesMode = useMemo(() => session && (session.status === SessionStatus.COMPLETED || session.status === SessionStatus.ABSENT), [session]);

  const toDateInputString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toTimeInputString = (date: Date) => {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().substring(11, 16);
  };

  useEffect(() => {
    if (!isOpen) return;
    
    setIsRecurring(false);
    setNumberOfSessions(2);
    setEndDate('');
    setFilteredPrograms(programs);
    setIsTeacherLocked(!!lockedTeacherId);
    setSelectedChapterId('');
    setSelectedTopicId('');

    if (session) {
      const startDate = new Date(session.start);
      const endDate = new Date(session.end);
      setFormData({
        programId: session.programId,
        studentId: lockedStudentId || session.studentId || '',
        teacherId: lockedTeacherId || session.teacherId,
        startDate: toDateInputString(startDate),
        startTime: toTimeInputString(startDate),
        endTime: toTimeInputString(endDate),
        status: session.status,
        privateNotes: session.privateNotes || '',
        parentSummary: session.parentSummary || '',
        sessionUrl: session.sessionUrl || '',
        sessionType: session.sessionType || SessionType.CURRICULUM,
        title: session.title || '',
        prospectName: session.prospectName || '',
        curriculumItemId: session.curriculumItemId || '',
      });

        if (session.curriculumItemId) {
            const curriculum = programs.find(p => p.id === session.programId)?.structure || [];
            let chapterId = '';
            let topicId = '';
            
            for (const chapter of curriculum) {
                if (chapter.id === session.curriculumItemId) {
                    chapterId = chapter.id;
                    break;
                }
                for (const topic of chapter.children || []) {
                    if (topic.id === session.curriculumItemId) {
                        chapterId = chapter.id;
                        topicId = topic.id;
                        break;
                    }
                }
                if (chapterId) break;
            }
            setSelectedChapterId(chapterId);
            setSelectedTopicId(topicId);
        }

    } else if (dateInfo) {
       const startDate = new Date(dateInfo.start);
       const endDate = new Date(dateInfo.end);
       setFormData({
        programId: '',
        studentId: lockedStudentId || '',
        teacherId: lockedTeacherId || dateInfo.resource?.id || '',
        startDate: toDateInputString(startDate),
        startTime: toTimeInputString(startDate),
        endTime: toTimeInputString(endDate),
        status: SessionStatus.SCHEDULED,
        privateNotes: '',
        parentSummary: '',
        sessionUrl: '',
        sessionType: SessionType.CURRICULUM,
        title: '',
        prospectName: '',
        curriculumItemId: '',
      });
    } else if (lockedStudentId) {
        const today = new Date();
        const startTime = new Date();
        startTime.setHours(9, 0, 0, 0); // Default to 9 AM
        const endTime = new Date(startTime.getTime() + 3600000);

        setFormData({
            programId: '',
            studentId: lockedStudentId,
            teacherId: lockedTeacherId || '',
            startDate: toDateInputString(today),
            startTime: toTimeInputString(startTime),
            endTime: toTimeInputString(endTime),
            status: SessionStatus.SCHEDULED,
            privateNotes: '',
            parentSummary: '',
            sessionUrl: '',
            sessionType: SessionType.CURRICULUM,
            title: '',
            prospectName: '',
            curriculumItemId: '',
        });
    }
  }, [session, dateInfo, isOpen, programs, lockedTeacherId, lockedStudentId]);

    useEffect(() => {
        if (formData.sessionType === SessionType.DEMO) {
            setFilteredPrograms(programs); // all active programs passed as props
            setFormData(prev => ({ ...prev, studentId: '', programId: prev.programId || (programs.length > 0 ? programs[0].id : '') }));
            setIsTeacherLocked(!!lockedTeacherId);
            return;
        }

        if (!formData.studentId) {
            setFilteredPrograms(programs);
            setFormData(prev => ({ ...prev, programId: '', teacherId: lockedTeacherId || '' }));
            setIsTeacherLocked(!!lockedTeacherId);
            return;
        }

        const studentEnrollments = enrollments.filter(e => e.studentId === formData.studentId && e.status === EnrollmentStatus.ACTIVE);
        const enrolledProgramIds = studentEnrollments.map(e => e.programId);
        const studentPrograms = programs.filter(p => enrolledProgramIds.includes(p.id));
        setFilteredPrograms(studentPrograms);

        if (!enrolledProgramIds.includes(formData.programId)) {
            const newProgramId = studentPrograms.length > 0 ? studentPrograms[0].id : '';
            const newTeacherId = newProgramId ? studentEnrollments.find(e => e.programId === newProgramId)?.teacherId : '';
            setFormData(prev => ({
                ...prev,
                programId: newProgramId,
                teacherId: lockedTeacherId || newTeacherId || '',
            }));
            setIsTeacherLocked(!!lockedTeacherId || !!newTeacherId);
        }
    }, [formData.studentId, formData.sessionType, enrollments, programs, lockedTeacherId]);

    useEffect(() => {
        if (formData.sessionType === SessionType.DEMO) {
            setIsTeacherLocked(!!lockedTeacherId);
            return;
        }
        if (formData.studentId && formData.programId) {
            const enrollment = enrollments.find(e => e.studentId === formData.studentId && e.programId === formData.programId && e.status === EnrollmentStatus.ACTIVE);
            if (enrollment) {
                setFormData(prev => ({ ...prev, teacherId: enrollment.teacherId }));
                setIsTeacherLocked(true);
            }
        }
    }, [formData.studentId, formData.programId, formData.sessionType, enrollments, lockedTeacherId]);

    useEffect(() => {
        const validate = () => {
            if (isNotesMode) {
              setIsSaveDisabled(false);
              setValidation({ type: null, text: '' });
              return;
            }
            setValidation({ type: null, text: '' });
            setIsSaveDisabled(false);

            if (formData.sessionType === SessionType.DEMO) {
                if (!formData.prospectName || !formData.teacherId || !formData.programId || !formData.startDate || !formData.startTime || !formData.endTime) return;
            } else {
                if (!formData.startDate || !formData.startTime || !formData.endTime || !formData.studentId || !formData.teacherId || !formData.programId) return;
            }

            if (formData.sessionType !== SessionType.CURRICULUM && !formData.title.trim()) {
                setValidation({ type: 'error', text: 'Session Title is required for this session type.' });
                setIsSaveDisabled(true); return;
            }

            const proposedStart = new Date(`${formData.startDate}T${formData.startTime}`);
            const proposedEnd = new Date(`${formData.startDate}T${formData.endTime}`);

            if (proposedStart >= proposedEnd) {
                setValidation({ type: 'error', text: 'End time must be after start time.' });
                setIsSaveDisabled(true); return;
            }

            const conflictingSession = sessions.find(s => {
                if (session && s.id === session.id) return false;
                const existingStart = new Date(s.start); const existingEnd = new Date(s.end);
                const isStudentConflict = formData.sessionType !== SessionType.DEMO && s.studentId === formData.studentId;
                return proposedStart < existingEnd && proposedEnd > existingStart && (s.teacherId === formData.teacherId || isStudentConflict);
            });

            if (conflictingSession) {
                setValidation({ type: 'error', text: `${conflictingSession.teacherId === formData.teacherId ? 'Teacher' : 'Student'} has a scheduling conflict.` });
                setIsSaveDisabled(true); return;
            }

            const isDayUnavailable = unavailability.some(u => u.teacherId === formData.teacherId && u.date === formData.startDate);
            if (isDayUnavailable) {
                setValidation({ type: 'error', text: 'Teacher has marked this day as unavailable.' });
                setIsSaveDisabled(true); return;
            }

            const dayOfWeek = proposedStart.getDay();
            const time = proposedStart.toTimeString().substring(0, 5);
            const teacherDaySlots = availability.filter(slot => slot.teacherId === formData.teacherId && slot.dayOfWeek === dayOfWeek);
            const isWithinAvailability = teacherDaySlots.some(slot => time >= slot.startTime && time < slot.endTime);
            
            if (teacherDaySlots.length > 0 && !isWithinAvailability) {
                setValidation({ type: 'warning', text: "This time is outside the teacher's regular weekly availability." });
            } else {
                const student = students.find(s => s.id === formData.studentId);
                const teacher = teachers.find(t => t.id === formData.teacherId);
                if (student?.timezone && teacher?.timezone && student.timezone !== teacher.timezone) {
                    const teacherTime = proposedStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: teacher.timezone });
                    const studentTime = proposedStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: student.timezone });
                    setValidation({ type: 'info', text: `Teacher: ${teacherTime} | Student: ${studentTime}` });
                }
            }
        };
        validate();
    }, [formData, sessions, session, unavailability, availability, students, teachers, isNotesMode]);


  const currentEnrollment = useMemo(() => {
    if (!formData.studentId || !formData.programId || formData.sessionType === SessionType.DEMO) return null;
    return enrollments.find(e => e.studentId === formData.studentId && e.programId === formData.programId && e.status === EnrollmentStatus.ACTIVE);
  }, [formData.studentId, formData.programId, formData.sessionType, enrollments]);

  const creditsRemaining = currentEnrollment?.creditsRemaining || 0;
  const recurringError = isRecurring && numberOfSessions > creditsRemaining ? `Cannot book more than the remaining ${creditsRemaining} credits.` : '';

  const recurringEndDateInfo = useMemo(() => {
    if (!isRecurring || !formData.startDate || numberOfSessions < 2) {
      return { dateString: '', formattedString: null };
    }
    try {
      const startDate = new Date(`${formData.startDate}T00:00:00`);
      const finalSessionDate = new Date(startDate.getTime());
      finalSessionDate.setDate(startDate.getDate() + (numberOfSessions - 1) * 7);
      return {
        dateString: toDateInputString(finalSessionDate),
        formattedString: finalSessionDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      };
    } catch (e) { return { dateString: '', formattedString: null }; }
  }, [isRecurring, formData.startDate, numberOfSessions]);
  
  useEffect(() => {
    setEndDate(isRecurring ? recurringEndDateInfo.dateString : '');
  }, [isRecurring, recurringEndDateInfo.dateString]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'sessionType') {
        switch (value) {
            case SessionType.CURRICULUM:
                break;
            case SessionType.PARENT_TEACHER:
            case SessionType.SPECIAL_REQUEST:
            case SessionType.DEMO:
                setIsRecurring(false);
                break;
        }
    }
  };

  const handleStatusChange = (newStatus: SessionStatus) => {
    if (!session) return;
    const updatedSession = { ...session, status: newStatus };
    onSave(updatedSession, { isRecurring: false, numberOfSessions: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNotesMode) { /* handle saving notes */ }
    
    if (formData.sessionType === SessionType.DEMO) {
      if (!formData.prospectName || !formData.teacherId || !formData.programId || !formData.startDate || !formData.startTime || !formData.endTime) {
          addToast('Please fill all required fields.', 'error');
          return;
      }
    } else {
      if (!formData.programId || !formData.studentId || !formData.teacherId || !formData.startDate || !formData.startTime || !formData.endTime) {
          addToast('Please fill all required fields.', 'error');
          return;
      }
    }

     if (recurringError || isSaveDisabled) {
        addToast(recurringError || validation.text || "Please resolve errors before saving.", 'error');
        return;
    }
    const startISO = new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
    const endISO = new Date(`${formData.startDate}T${formData.endTime}`).toISOString();

    const finalSession: Session = {
      ...session,
      id: session?.id || Date.now().toString(),
      title: formData.title,
      programId: formData.programId,
      studentId: formData.sessionType === SessionType.DEMO ? undefined : formData.studentId,
      prospectName: formData.sessionType === SessionType.DEMO ? formData.prospectName : undefined,
      teacherId: formData.teacherId,
      status: formData.status as SessionStatus,
      privateNotes: formData.privateNotes,
      parentSummary: formData.parentSummary,
      sessionUrl: formData.sessionUrl,
      start: startISO,
      end: endISO,
      sessionType: formData.sessionType as SessionType,
      curriculumItemId: formData.curriculumItemId,
      preSessionQuestions: session?.preSessionQuestions,
    };
    onSave(finalSession, { isRecurring, numberOfSessions });
  };
  
    const selectedProgram = useMemo(() => programs.find(p => p.id === formData.programId), [programs, formData.programId]);
    const chapters = useMemo(() => selectedProgram?.structure || [], [selectedProgram]);
    const topics = useMemo(() => {
        if (!selectedChapterId) return [];
        const chapter = chapters.find(c => c.id === selectedChapterId);
        return chapter?.children || [];
    }, [chapters, selectedChapterId]);

    const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const chapterId = e.target.value;
        setSelectedChapterId(chapterId);
        setSelectedTopicId('');
        setFormData(prev => ({...prev, curriculumItemId: chapterId}));
    };

    const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const topicId = e.target.value;
        setSelectedTopicId(topicId);
        setFormData(prev => ({...prev, curriculumItemId: topicId || selectedChapterId}));
    };


  if (!isOpen) return null;
  
  const inputClass = "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  
  const validationColors = {
      error: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
      warning: 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-300',
      info: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  };
  const validationIcons = { error: ExclamationTriangleIcon, warning: ExclamationTriangleIcon, info: InformationCircleIcon };
  const disabledScheduling = isPastSession || isNotesMode;


  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{session ? isNotesMode ? `Session Notes (${formData.status})` : 'Edit Session' : 'Schedule New Session'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-6">
            {session?.preSessionQuestions && (
                 <div className="flex items-start space-x-3 p-3 rounded-lg text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200">
                    <QuestionMarkCircleIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold">Student's Pre-Session Questions</h4>
                        <p className="whitespace-pre-wrap">{session.preSessionQuestions}</p>
                    </div>
                </div>
            )}
            <FormRow icon={CalendarIcon} label="Session Type">
                <select name="sessionType" value={formData.sessionType} onChange={handleChange} className={inputClass} disabled={disabledScheduling}>
                    {Object.values(SessionType).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </FormRow>

            {formData.sessionType === SessionType.DEMO ? (
                <FormRow icon={UsersIcon} label="Prospect Name">
                    <input type="text" name="prospectName" value={formData.prospectName} onChange={handleChange} required className={inputClass} disabled={disabledScheduling} placeholder="Enter the prospective student's name" />
                </FormRow>
            ) : (
                <FormRow icon={UsersIcon} label="Student">
                    <select name="studentId" value={formData.studentId} onChange={handleChange} required className={inputClass} disabled={disabledScheduling || !!lockedStudentId}>
                         <option value="">Select a student...</option>
                         {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                </FormRow>
            )}
            
            <FormRow icon={AcademicCapIcon} label="Program">
                <select name="programId" value={formData.programId} onChange={handleChange} required className={inputClass} disabled={(formData.sessionType !== SessionType.DEMO && !formData.studentId) || disabledScheduling}>
                    <option value="">Select a program...</option>
                    {filteredPrograms.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
            </FormRow>
            <FormRow icon={UsersIcon} label="Teacher">
                <select name="teacherId" value={formData.teacherId} onChange={handleChange} required disabled={isTeacherLocked || disabledScheduling} className={`${inputClass} disabled:bg-gray-100 dark:disabled:bg-gray-600`}>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
            </FormRow>

            {formData.sessionType !== SessionType.CURRICULUM && (
                <FormRow icon={BookOpenIcon} label="Session Title">
                    <input type="text" name="title" placeholder="e.g., Q3 Progress Review" value={formData.title} onChange={handleChange} required={formData.sessionType !== SessionType.CURRICULUM} className={inputClass} disabled={disabledScheduling}/>
                </FormRow>
            )}

            {formData.sessionType === SessionType.CURRICULUM && chapters.length > 0 && (
                <FormRow icon={BookOpenIcon} label="Link to Curriculum (Optional)">
                    <div className="space-y-2">
                        <select name="chapter" value={selectedChapterId} onChange={handleChapterChange} className={inputClass} disabled={disabledScheduling}>
                            <option value="">Select a chapter...</option>
                            {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        {selectedChapterId && topics.length > 0 && (
                             <select name="topic" value={selectedTopicId} onChange={handleTopicChange} className={`${inputClass} pl-6`} disabled={disabledScheduling}>
                                <option value="">Select a topic...</option>
                                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        )}
                    </div>
                </FormRow>
            )}

            
            <FormRow icon={CalendarIcon} label="Date">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <label htmlFor="startDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                        <input id="startDate" type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className={inputClass} disabled={disabledScheduling}/>
                    </div>
                    {isRecurring && (
                        <div className="flex-1">
                            <label htmlFor="endDate" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                            <input id="endDate" type="date" name="endDate" value={endDate} disabled className={`${inputClass} bg-gray-100 dark:bg-gray-600 cursor-not-allowed`}/>
                        </div>
                    )}
                </div>
            </FormRow>

            <FormRow icon={ClockIcon} label="Time">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <label htmlFor="startTime" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
                        <input id="startTime" type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className={inputClass} disabled={disabledScheduling} />
                    </div>
                    <div className="flex-1">
                        <label htmlFor="endTime" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Time</label>
                        <input id="endTime" type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className={inputClass} disabled={disabledScheduling}/>
                    </div>
                </div>
            </FormRow>
            
            {validation.type && (
                <div className={`flex items-start space-x-3 p-3 rounded-lg text-sm ${validationColors[validation.type]}`}>
                    {React.createElement(validationIcons[validation.type], { className: 'h-5 w-5 flex-shrink-0 mt-0.5' })}
                    <span>{validation.text}</span>
                </div>
            )}
            
            <FormRow icon={LinkIcon} label="Session URL">
                <input type="url" name="sessionUrl" placeholder="https://zoom.us/j/..." value={formData.sessionUrl} onChange={handleChange} className={inputClass} disabled={disabledScheduling} />
            </FormRow>
            
            { isNotesMode ? (
                 <div className="pt-6 border-t dark:border-gray-700 space-y-6">
                    <FormRow icon={PencilSquareIcon} label="Private Teacher Notes">
                        <textarea name="privateNotes" rows={4} value={formData.privateNotes} onChange={handleChange} className={inputClass} placeholder="Add private notes visible only to staff..."/>
                    </FormRow>
                    <FormRow icon={PencilSquareIcon} label="Summary for Parent">
                        <textarea name="parentSummary" rows={4} value={formData.parentSummary} onChange={handleChange} className={inputClass} placeholder="Add a summary for the parent to see..."/>
                    </FormRow>
                </div>
            ) : (
                <FormRow icon={CalendarIcon} label="Status">
                    <select name="status" value={formData.status} onChange={handleChange} className={inputClass} disabled={disabledScheduling}>
                        {Object.values(SessionStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </FormRow>
            )}
             
            {!session && (
                <div className="pt-4 border-t dark:border-gray-600">
                    <div className="flex items-center">
                        <input id="isRecurring" name="isRecurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50" disabled={!currentEnrollment || formData.sessionType !== SessionType.CURRICULUM} />
                        <label htmlFor="isRecurring" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Schedule Recurring Weekly Sessions</label>
                    </div>

                    {isRecurring && (
                        <div className="mt-4 pl-7">
                            <label htmlFor="numberOfSessions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Sessions to Schedule</label>
                            <input type="number" name="numberOfSessions" id="numberOfSessions" value={numberOfSessions} onChange={(e) => setNumberOfSessions(Math.max(2, parseInt(e.target.value, 10) || 2))} min="2" max={creditsRemaining} required className={`mt-1 block w-full ${inputClass} ${recurringError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
                            {recurringEndDateInfo.formattedString && (<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The last session will be on <span className="font-semibold">{recurringEndDateInfo.formattedString}</span>.</p>)}
                            {currentEnrollment ? (<p className={`mt-2 text-xs ${recurringError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>Student has {creditsRemaining} credits remaining for this program.</p>) : (<p className="mt-2 text-xs text-yellow-500">No active enrollment found for this student and program. Cannot schedule recurring sessions.</p>)}
                        </div>
                    )}
                </div>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-between items-center flex-shrink-0 sticky bottom-0">
             {isActionable ? (
                <div className="flex w-full justify-between items-center">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Close</button>
                    <div className="flex space-x-3">
                        <button type="button" onClick={() => handleStatusChange(SessionStatus.ABSENT)} className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md shadow-sm hover:bg-yellow-700">Mark as Absent</button>
                        <button type="button" onClick={() => handleStatusChange(SessionStatus.COMPLETED)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">Mark as Completed</button>
                    </div>
                </div>
             ) : (
                <>
                    <div>
                        {session && !isPastSession && session.status === SessionStatus.SCHEDULED && !isNotesMode && (
                            <button type="button" onClick={() => setIsCancelModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                Cancel Session
                            </button>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                            {isNotesMode ? 'Close' : 'Cancel'}
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 dark:disabled:bg-primary-800 disabled:cursor-not-allowed" disabled={isSaveDisabled || !!recurringError}>
                            {isNotesMode ? 'Save Notes' : session ? 'Update Session' : 'Create Session'}
                        </button>
                    </div>
                </>
             )}
          </div>
        </form>
      </div>
    </div>
    <CancelSessionModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        session={session}
        onConfirmCancel={(scope) => {
            if (session) {
                onCancel(session, scope);
            }
            setIsCancelModalOpen(false);
        }}
    />
    </>
  );
};

export default SessionFormModal;
