import React, { useState, useEffect } from 'react';
import { Session } from '../types';
import { XIcon, XCircleIcon } from './icons/Icons';

interface PreSessionQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Session) => void;
  session: Session | null;
  onRequestCancel: () => void;
}

const PreSessionQuestionModal: React.FC<PreSessionQuestionModalProps> = ({ isOpen, onClose, onSave, session, onRequestCancel }) => {
  const [questions, setQuestions] = useState('');

  useEffect(() => {
    if (session) {
      setQuestions(session.preSessionQuestions || '');
    }
  }, [session]);

  if (!isOpen || !session) return null;

  const handleSubmit = () => {
    onSave({ ...session, preSessionQuestions: questions });
  };
  
  const sessionDate = new Date(session.start).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center font-student" aria-modal="true" role="dialog">
      <div className="scroll-modal w-full max-w-lg m-4 transform transition-all animate-fade-in-up">
        <div className="scroll-header">
          <h2>Prepare for Your Adventure!</h2>
        </div>
        <div className="p-6">
            <div className="p-3 mb-4 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
                <p className="font-bold">{session.title}</p>
                <p className="text-sm opacity-80">{sessionDate}</p>
            </div>
            <div>
              <label htmlFor="questions" className="block text-sm font-bold mb-2">
                What would you like to cover?
              </label>
              <textarea
                id="questions"
                name="questions"
                rows={5}
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder="Let your teacher know if you have any questions or specific topics you'd like to review..."
                className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 ring-inset focus:ring-amber-600 sm:text-sm"
              />
               <p className="mt-2 text-xs opacity-70">
                Your teacher will review your questions before the session.
              </p>
            </div>
        </div>
        <div className="px-6 py-3 flex justify-between items-end">
            <div>
                 <button
                    type="button"
                    onClick={onRequestCancel}
                    className="text-xs font-semibold text-rose-500 dark:text-rose-400 hover:underline"
                >
                    Need to cancel this adventure?
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This will send a request to an administrator.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary px-4 py-2 text-sm"
              >
                Save Questions
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PreSessionQuestionModal;