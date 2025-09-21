import React, { useState, useMemo } from 'react';
import { AssignmentTemplate } from '../types';
import { XIcon, SearchIcon } from './icons/Icons';

interface AttachTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (template: AssignmentTemplate) => void;
  allTemplates: AssignmentTemplate[];
  attachedTemplateIds: string[];
}

const AttachTemplateModal: React.FC<AttachTemplateModalProps> = ({ isOpen, onClose, onAttach, allTemplates, attachedTemplateIds }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const availableTemplates = useMemo(() => {
    return allTemplates.filter(t => 
        !attachedTemplateIds.includes(t.id) &&
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTemplates, attachedTemplateIds, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attach Assignment Template</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XIcon className="h-6 w-6" /></button>
        </div>
        <div className="p-4 border-b dark:border-gray-700">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>
        </div>
        <div className="p-4 flex-grow overflow-y-auto">
            <div className="space-y-2">
                {availableTemplates.map(template => (
                    <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{template.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-sm">{template.url}</p>
                        </div>
                        <button onClick={() => onAttach(template)} className="px-3 py-1 text-xs font-semibold text-white bg-primary-500 rounded-full hover:bg-primary-600">Attach</button>
                    </div>
                ))}
            </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Done</button>
        </div>
      </div>
    </div>
  );
};

export default AttachTemplateModal;