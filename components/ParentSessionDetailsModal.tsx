
import React from 'react';
import { Session } from '../types';
import { XIcon } from './icons/Icons';

interface ParentSessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  onRequestCancel: () => void;
  isCancellationPending: boolean;
}

const ParentSessionDetailsModal: React.FC<ParentSessionDetailsModalProps> = ({ isOpen, onClose, session, onRequestCancel, isCancellationPending }) => {
  if (!isOpen || !session) return null;

  const sessionDate = new Date(session.start).toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center font-student" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg m-4 transform transition-all animate-fade-in-up">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Session Details</h2>
           <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-6">
            <div className="p-3 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="font-bold text-gray-900 dark:text-white">{session.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{sessionDate}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                You can request to cancel this session. An administrator and the teacher will review your request. Cancellations are subject to policy and may not result in a credit refund if made too close to the session time.
            </p>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end items-center space-x-3 rounded-b-2xl">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500"
            >
                Close
            </button>
            {isCancellationPending ? (
                <span className="px-4 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 border border-transparent rounded-md">
                    Cancellation Pending
                </span>
            ) : (
                <button
                    type="button"
                    onClick={onRequestCancel}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700"
                >
                    Request Cancellation
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ParentSessionDetailsModal;
