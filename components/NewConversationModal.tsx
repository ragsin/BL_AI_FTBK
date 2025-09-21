
import React, { useState, useMemo, useEffect } from 'react';
import { User, Role } from '../types';
import { XIcon } from './icons/Icons';
import MultiSelectDropdown from './MultiSelectDropdown';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (participants: { studentId: string; teacherId: string }, firstMessage: string) => void;
  allUsers: User[];
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ isOpen, onClose, onSave, allUsers }) => {
    const students = useMemo(() => allUsers.filter(u => u.role === Role.STUDENT), [allUsers]);
    const teachers = useMemo(() => allUsers.filter(u => u.role === Role.TEACHER), [allUsers]);
    
    const [studentId, setStudentId] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if(isOpen) {
            setStudentId('');
            setTeacherId('');
            setMessage('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId || !teacherId || !message.trim()) {
            alert('Please select a student, a teacher, and enter a message.');
            return;
        }
        onSave({ studentId, teacherId }, message);
    };

    if (!isOpen) return null;

    const studentOptions = students.map(s => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }));
    const teacherOptions = teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }));
    
    const inputStyle = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Start New Conversation</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student</label>
                            <select id="studentId" value={studentId} onChange={(e) => setStudentId(e.target.value)} required className={inputStyle}>
                                <option value="" disabled>Select a student...</option>
                                {studentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teacher</label>
                            <select id="teacherId" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required className={inputStyle}>
                                <option value="" disabled>Select a teacher...</option>
                                {teacherOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                            <textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                rows={4}
                                className={inputStyle}
                                placeholder="Type your initial message..."
                            />
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Start Conversation</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewConversationModal;
