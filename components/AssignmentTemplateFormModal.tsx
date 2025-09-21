

import React, { useState, useEffect } from 'react';
import { AssignmentTemplate } from '../types';
import { XIcon } from './icons/Icons';

interface AssignmentTemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: { title: string, url: string, instructions?: string }) => void;
  template: AssignmentTemplate | null;
}

const AssignmentTemplateFormModal: React.FC<AssignmentTemplateFormModalProps> = ({ isOpen, onClose, onSave, template }) => {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    instructions: '',
  });

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title,
        url: template.url,
        instructions: template.instructions || '',
      });
    } else {
      setFormData({
        title: '',
        url: '',
        instructions: '',
      });
    }
  }, [template, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{template ? 'Edit Assignment' : 'Add New Assignment'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assignment Title</label>
              <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
             <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assignment URL</label>
              <input type="url" name="url" id="url" value={formData.url} onChange={handleChange} required placeholder="https://example.com/assignment.pdf" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructions</label>
              <textarea name="instructions" id="instructions" rows={3} value={formData.instructions} onChange={handleChange} placeholder="e.g., Complete all questions. Show your work." className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Save Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentTemplateFormModal;