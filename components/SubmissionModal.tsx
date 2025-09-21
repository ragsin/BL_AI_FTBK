import React, { useState, useEffect } from 'react';
import { Assignment, AssignmentStatus, ResourceLink } from '../types';
import { XIcon, LinkIcon, CheckCircleIcon } from './icons/Icons';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (submissionContent: string) => void;
  assignment: Assignment | null;
  resources?: ResourceLink[];
  modalTitleOverride?: string;
  submitButtonTextOverride?: string;
}

const TimelineStep: React.FC<{ status: string; date?: string; isCompleted: boolean; isLast?: boolean }> = ({ status, date, isCompleted, isLast = false }) => (
    <div className="relative flex items-start">
        {!isLast && <div className={`absolute top-5 left-[11px] h-full w-0.5 ${isCompleted ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>}
        <div className={`flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full ${isCompleted ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'} z-10`}>
            {isCompleted && <CheckCircleIcon className="h-4 w-4 text-white" />}
        </div>
        <div className="ml-4">
            <h4 className={`font-semibold ${isCompleted ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{status}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{date || 'Pending'}</p>
        </div>
    </div>
);


const SubmissionModal: React.FC<SubmissionModalProps> = ({ isOpen, onClose, onConfirm, assignment, resources, modalTitleOverride, submitButtonTextOverride }) => {
  const [submissionContent, setSubmissionContent] = useState('');
  
  useEffect(() => {
      if(assignment) {
          setSubmissionContent(assignment.submissionContent || '');
      }
  }, [assignment]);

  if (!isOpen || !assignment) return null;

  const isSubmittable = assignment.status === AssignmentStatus.NOT_SUBMITTED;
  const modalTitle = modalTitleOverride || (isSubmittable ? 'Submit Quest' : 'View Quest Details');
  const submitButtonText = submitButtonTextOverride || 'Submit Quest';

  const submissionHistory = [
      { status: 'Assigned', date: `Due ${assignment.dueDate}`, completed: true },
      { status: 'Submitted', date: assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleString() : undefined, completed: !!assignment.submittedAt },
      { status: 'Graded', date: assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleString() : undefined, completed: assignment.status === AssignmentStatus.GRADED },
  ];
  
  const isLink = (content: string) => content.startsWith('http://') || content.startsWith('https://');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all">
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{modalTitle}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
            <XIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{assignment.title}</h3>
            
            {assignment.instructions && (
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Instructions</p>
                    <p className="text-slate-800 dark:text-white p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">{assignment.instructions}</p>
                </div>
            )}

            {resources && resources.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Learning Resources</h4>
                    <div className="mt-2 space-y-2">
                        {resources.map(res => (
                            <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sky-500 hover:underline">
                                <LinkIcon className="h-4 w-4" />
                                <span>{res.title}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="mt-4 pt-4 border-t dark:border-slate-700">
                {isSubmittable ? (
                    <div>
                        <label htmlFor="submissionContent" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Your Submission</label>
                        <textarea
                            id="submissionContent"
                            rows={4}
                            value={submissionContent}
                            onChange={(e) => setSubmissionContent(e.target.value)}
                            placeholder="Paste a link to your work (e.g., Google Docs) or type your answer here..."
                            className="mt-1 block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Submission History</h4>
                            <div className="space-y-4">
                                {submissionHistory.map((step, index) => (
                                    <TimelineStep key={step.status} status={step.status} date={step.date} isCompleted={step.completed} isLast={index === submissionHistory.length - 1} />
                                ))}
                            </div>
                        </div>

                        {assignment.submissionContent && (
                             <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">What You Submitted</p>
                                <div className="text-slate-800 dark:text-white p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">
                                    {isLink(assignment.submissionContent) ? (
                                        <a href={assignment.submissionContent} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline break-all">{assignment.submissionContent}</a>
                                    ) : assignment.submissionContent}
                                </div>
                            </div>
                        )}

                        {assignment.feedback && (
                             <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Teacher Feedback</p>
                                <p className="text-slate-800 dark:text-white p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">{assignment.feedback}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-3 flex justify-end space-x-3">
          {isSubmittable ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white dark:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(submissionContent)}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-md shadow-sm hover:bg-sky-700"
              >
                {submitButtonText}
              </button>
            </>
          ) : (
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 border border-transparent rounded-md shadow-sm hover:bg-sky-700"
            >
                Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionModal;