import React, { useState, useEffect } from 'react';
import { Assignment, AssignmentStatus, StudentDetails } from '../types';
import { XIcon } from './icons/Icons';

interface AssignmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignment: Assignment) => void;
  mode: 'add' | 'edit' | 'grade';
  student: StudentDetails;
  assignment: Assignment | null;
}

const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({ isOpen, onClose, onSave, mode, student, assignment }) => {
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
    grade: '',
    feedback: '',
    url: '',
    instructions: '',
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        title: assignment.title,
        dueDate: assignment.dueDate,
        grade: assignment.grade || '',
        feedback: assignment.feedback || '',
        url: assignment.url || '',
        instructions: assignment.instructions || '',
      });
    } else {
        const today = new Date();
        today.setDate(today.getDate() + 7); // Default due date is one week from now
      setFormData({
        title: '',
        dueDate: today.toISOString().split('T')[0],
        grade: '',
        feedback: '',
        url: '',
        instructions: '',
      });
    }
  }, [assignment, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalAssignment: Assignment;

    if (mode === 'add') {
        finalAssignment = {
            id: `a-${Date.now()}`,
            title: formData.title,
            studentId: student.id,
            enrollmentId: student.enrollmentId,
            programId: student.programId,
            status: AssignmentStatus.NOT_SUBMITTED,
            submittedAt: '',
            dueDate: formData.dueDate,
            url: formData.url,
            instructions: formData.instructions,
        };
    } else if (assignment) { // Edit or Grade
        finalAssignment = {
            ...assignment,
            title: formData.title,
            dueDate: formData.dueDate,
            grade: formData.grade,
            feedback: formData.feedback,
            status: formData.grade ? AssignmentStatus.GRADED : assignment.status,
            url: formData.url,
            instructions: formData.instructions,
        };
    } else {
        return; // Should not happen
    }
    
    onSave(finalAssignment);
  };

  if (!isOpen) return null;
  
  const modalTitle = {
    add: `New Assignment for ${student.firstName} ${student.lastName}`,
    edit: `Edit Assignment`,
    grade: `Grade Assignment for ${student.firstName} ${student.lastName}`,
  }[mode];
  
  const saveButtonText = {
    add: 'Create Assignment',
    edit: 'Save Changes',
    grade: 'Save Grade'
  }[mode];
  
  const isLink = (content: string) => content.startsWith('http://') || content.startsWith('https://');

  const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  const btnPrimary = "px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500";
  const btnSecondary = "px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{modalTitle}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {mode !== 'grade' ? (
                <>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={commonInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                        <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} onChange={handleChange} required className={commonInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assignment URL (Optional)</label>
                        <input type="url" name="url" id="url" value={formData.url} onChange={handleChange} placeholder="https://example.com/assignment.pdf" className={commonInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructions (Optional)</label>
                        <textarea name="instructions" id="instructions" rows={3} value={formData.instructions} onChange={handleChange} placeholder="e.g., Complete all questions. Show your work." className={commonInputClasses} />
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
                        <p className="font-semibold text-gray-800 dark:text-white">{assignment?.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Due: {assignment?.dueDate} | Submitted: {assignment?.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : 'N/A'}</p>
                        {assignment?.url && <a href={assignment.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline break-all">{assignment.url}</a>}
                    </div>

                    {assignment?.submissionContent && (
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Student Submission</p>
                            <div className="text-gray-800 dark:text-white p-3 bg-gray-100 dark:bg-gray-700/50 rounded-md whitespace-pre-wrap">
                                {isLink(assignment.submissionContent) ? (
                                    <a href={assignment.submissionContent} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{assignment.submissionContent}</a>
                                ) : assignment.submissionContent}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {mode === 'grade' && (
                <>
                    <div>
                        <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grade</label>
                        <input type="text" name="grade" id="grade" placeholder="e.g., A+, 95%, 4/5" value={formData.grade} onChange={handleChange} className={commonInputClasses} />
                    </div>
                    <div>
                        <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Feedback</label>
                        <textarea name="feedback" id="feedback" rows={4} value={formData.feedback} onChange={handleChange} className={commonInputClasses} />
                    </div>
                </>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="submit" className={btnPrimary}>{saveButtonText}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentFormModal;