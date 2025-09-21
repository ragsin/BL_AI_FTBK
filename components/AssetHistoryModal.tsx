import React from 'react';
import { Asset } from '../types';
import { XIcon } from './icons/Icons';

interface AssetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

const AssetHistoryModal: React.FC<AssetHistoryModalProps> = ({ isOpen, onClose, asset }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change History for "{asset.name}"</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          <ul className="space-y-4">
            {asset.history.length > 0 ? (
                [...asset.history].reverse().map(entry => (
                    <li key={entry.id} className="relative pl-8">
                        <div className="absolute top-1 left-0 h-full w-px bg-gray-200 dark:bg-gray-600"></div>
                        <div className="absolute top-1 left-0 -ml-1.5 h-3 w-3 rounded-full bg-primary-500 border-2 border-white dark:border-gray-800"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{entry.change}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(entry.timestamp).toLocaleString()} by {entry.changedBy}
                        </p>
                    </li>
                ))
            ) : (
                <p className="text-center text-gray-500">No history available for this asset.</p>
            )}
          </ul>
        </div>
         <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetHistoryModal;
