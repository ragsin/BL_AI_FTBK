
import React, { useState, useEffect } from 'react';
import { CurriculumItem } from '../types';
import { XIcon } from './icons/Icons';

interface CurriculumItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: { title: string }) => void;
  item: CurriculumItem | null;
  itemType?: 'Chapter' | 'Topic' | 'Sub-Topic';
}

const CurriculumItemFormModal: React.FC<CurriculumItemFormModalProps> = ({ isOpen, onClose, onSave, item, itemType }) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
    } else {
      setTitle('');
    }
  }, [item, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        alert('Title cannot be empty.');
        return;
    }
    onSave({ title });
  };

  if (!isOpen) return null;

  const typeName = item?.type || itemType;
  const actionName = item ? 'Edit' : 'Add';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 transform transition-all">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{actionName} {typeName}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{typeName} Title</label>
              <input
                type="text"
                name="title"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Save {typeName}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CurriculumItemFormModal;