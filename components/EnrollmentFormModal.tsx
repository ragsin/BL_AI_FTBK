import React, { useState, useEffect } from 'react';
import { Enrollment, EnrollmentStatus, User, Program, Role } from '../types';
import { XIcon } from './icons/Icons';

interface EnrollmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (enrollment: Enrollment) => void;
  enrollment: Enrollment | null;
  students: User[];
  teachers: User[];
  programs: Program[];
}

const EnrollmentFormModal: React.FC<EnrollmentFormModalProps> = ({ isOpen, onClose, onSave, enrollment, students, teachers, programs }) => {
  const [formData, setFormData] = useState({
    studentId: '',
    programId: '',
    teacherId: '',
    creditsRemaining: 0,
    status: EnrollmentStatus.ACTIVE,
  });

  useEffect(() => {
    if (!isOpen) return;
    
    if (enrollment) {
      setFormData({
        studentId: enrollment.studentId,
        programId: enrollment.programId,
        teacherId: enrollment.teacherId,
        creditsRemaining: enrollment.creditsRemaining,
        status: enrollment.status,
      });
    } else {
      setFormData({
        studentId: students.length > 0 ? students[0].id : '',
        programId: programs.length > 0 ? programs[0].id : '',
        teacherId: teachers.length > 0 ? teachers[0].id : '',
        creditsRemaining: 0,
        status: EnrollmentStatus.ACTIVE,
      });
    }
  }, [enrollment, isOpen, students, teachers, programs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'number' ? parseInt(value, 10) : value 
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.programId || !formData.teacherId) {
        alert('Please select a student, program, and teacher.');
        return;
    }
    const finalEnrollment: Enrollment = {
      ...enrollment,
      id: enrollment?.id || `e-${Date.now()}`,
      ...formData,
      dateEnrolled: enrollment?.dateEnrolled || new Date().toISOString().split('T')[0],
    };
    onSave(finalEnrollment);
  };

  if (!isOpen) return null;
  
  const inputStyle = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{enrollment ? 'Edit Enrollment' : 'New Enrollment'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student</label>
              <select name="studentId" id="studentId" value={formData.studentId} onChange={handleChange} required className={inputStyle}>
                {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="programId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Program</label>
              <select name="programId" id="programId" value={formData.programId} onChange={handleChange} required className={inputStyle}>
                {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teacher</label>
              <select name="teacherId" id="teacherId" value={formData.teacherId} onChange={handleChange} required className={inputStyle}>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="creditsRemaining" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Session Credits</label>
              <input type="number" name="creditsRemaining" id="creditsRemaining" value={formData.creditsRemaining} onChange={handleChange} required min="0" disabled={true} className={`${inputStyle} disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed`} />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">New enrollments start with 0 credits. Add credits via the Revenue page or "Manage Credits".</p>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select name="status" id="status" value={formData.status} onChange={handleChange} className={inputStyle}>
                {Object.values(EnrollmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Save Enrollment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollmentFormModal;