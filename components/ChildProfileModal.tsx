import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { XIcon } from './icons/Icons';

interface ChildProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (child: User) => void;
  child: User;
}

const grades = ['K', ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())];

const ChildProfileModal: React.FC<ChildProfileModalProps> = ({ isOpen, onClose, onSave, child }) => {
  const [formData, setFormData] = useState({
    grade: child.grade || '',
    dob: child.dob || '',
  });

  useEffect(() => {
    setFormData({
      grade: child.grade || '',
      dob: child.dob || '',
    });
  }, [child, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...child, ...formData });
  };

  if (!isOpen) return null;
  
  const inputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit {child.firstName}'s Profile</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Grade Level</label>
                <select name="grade" id="grade" value={formData.grade} onChange={handleChange} className={inputClass}>
                    <option value="">Select a grade...</option>
                    {grades.map(g => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                <input type="date" name="dob" id="dob" value={formData.dob} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChildProfileModal;