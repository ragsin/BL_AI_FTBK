import React from 'react';
import { PlusIcon } from './icons/Icons';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  message: string;
  action?: {
    text: string;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, message, action }) => {
  return (
    <div className="text-center py-16 px-6">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {action && (
        <div className="mt-6">
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            {action.text}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
