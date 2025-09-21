import React, { useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XIcon } from './icons/Icons';
import { ToastType } from '../types';

const toastTypes: Record<ToastType, { icon: React.ElementType, bg: string, text: string }> = {
    success: { icon: CheckCircleIcon, bg: 'bg-success-100', text: 'text-success-800' },
    error: { icon: ExclamationTriangleIcon, bg: 'bg-danger-100', text: 'text-danger-800' },
    info: { icon: InformationCircleIcon, bg: 'bg-info-100', text: 'text-info-800' },
};

const ToastMessage: React.FC<{ message: string; type: ToastType; onDismiss: () => void }> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onDismiss]);

  const { icon: Icon, bg, text } = toastTypes[type];
  const darkText = text.replace('800', '200');

  return (
    <div className={`flex items-center w-full max-w-xs p-4 my-2 text-gray-500 bg-white rounded-lg shadow-lg dark:text-gray-400 dark:bg-gray-800 ring-1 ring-black ring-opacity-5 ${text} dark:${darkText}`} role="alert">
        <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 ${bg} rounded-lg`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="ml-3 text-sm font-normal">{message}</div>
        <button type="button" onClick={onDismiss} className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700">
            <span className="sr-only">Close</span>
            <XIcon className="w-5 h-5" />
        </button>
    </div>
  );
};


export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-5 right-5 z-50">
      {toasts.map(toast => (
        <ToastMessage
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};