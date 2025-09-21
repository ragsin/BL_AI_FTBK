import React from 'react';
import { Session } from '../types';
import { XIcon, ExclamationTriangleIcon } from './icons/Icons';

interface CancelSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (scope: 'single' | 'series') => void;
  session: Session | null;
}

const CancelSessionModal: React.FC<CancelSessionModalProps> = ({ isOpen, onClose, onConfirmCancel, session }) => {
  if (!isOpen || !session) return null;

  const isRecurring = !!session.recurringId;
  const sessionDate = new Date(session.start).toLocaleDateString();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 transform transition-all">
        <div className="p-6">
          <div className="flex items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                Cancel Session
              </h3>
              <div className="mt-2">
                {isRecurring ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        This session on {sessionDate} is part of a recurring series. Cancelling will refund one credit per session. How would you like to proceed?
                    </p>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to cancel this session? This action cannot be undone and will refund 1 credit to the student.
                    </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          {isRecurring ? (
            <>
                <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => onConfirmCancel('series')}
                >
                    This & All Future
                </button>
                 <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-yellow-500 text-base font-medium text-white hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => onConfirmCancel('single')}
                >
                    This Session Only
                </button>
            </>
          ) : (
             <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => onConfirmCancel('single')}
            >
                Confirm Cancellation
            </button>
          )}
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelSessionModal;
