import React, { useState, useEffect } from 'react';
import { Program, ProgramStatus } from '../types';
import { XIcon } from './icons/Icons';
import { useSettings } from '../contexts/SettingsContext';

interface ProgramFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (program: Program) => void;
  program: Program | null;
}

const grades = ['K', ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())];

const ProgramFormModal: React.FC<ProgramFormModalProps> = ({ isOpen, onClose, onSave, program }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    targetGradeLevel: [] as string[],
    status: ProgramStatus.DRAFT,
  });

  useEffect(() => {
    if (program) {
      setFormData({
        title: program.title,
        description: program.description,
        categoryId: program.categoryId || '',
        targetGradeLevel: program.targetGradeLevel,
        status: program.status,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        categoryId: '',
        targetGradeLevel: [],
        status: ProgramStatus.DRAFT,
      });
    }
  }, [program, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
        const newGrades = [...prev.targetGradeLevel];
        if (checked) {
            if (!newGrades.includes(value)) {
                newGrades.push(value);
            }
        } else {
            const index = newGrades.indexOf(value);
            if (index > -1) {
                newGrades.splice(index, 1);
            }
        }
        return { ...prev, targetGradeLevel: newGrades };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProgram: Program = {
      // Use existing program data if available, otherwise create new
      id: program?.id || `p-${Date.now()}`,
      ...formData,
      // On creation, force status to DRAFT. On edit, use the form's status.
      status: program ? formData.status : ProgramStatus.DRAFT,
      // Use existing counts or default to 0
      studentCount: program?.studentCount || 0,
      teacherCount: program?.teacherCount || 0,
      // Use existing date or create new
      dateAdded: program?.dateAdded || new Date().toISOString().split('T')[0],
      // IMPORTANT: Initialize structure for new programs, preserve for existing
      structure: program?.structure || [],
    };
    onSave(finalProgram);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{program ? 'Edit Program' : 'Add New Program'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Program Title</label>
              <input
                type="text"
                name="title"
                id="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
             <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
             <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select
                    name="categoryId"
                    id="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                    <option value="" disabled>Select a category...</option>
                    {settings.programCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Grade Level</label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 border border-gray-300 dark:border-gray-600 rounded-md p-3">
                {grades.map(g => (
                    <div key={g} className="flex items-center">
                        <input
                            id={`grade-${g}`}
                            name="targetGradeLevel"
                            type="checkbox"
                            value={g}
                            checked={formData.targetGradeLevel.includes(g)}
                            onChange={handleGradeChange}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`grade-${g}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
                        </label>
                    </div>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              {program ? (
                <>
                  <select
                    name="status"
                    id="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={!program.structure || program.structure.length === 0}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                  >
                    {Object.values(ProgramStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {(!program.structure || program.structure.length === 0) && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Add curriculum content to this program before changing its status from Draft.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-1 block w-full px-3 py-2 bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm sm:text-sm text-gray-500 dark:text-gray-400">
                    Draft
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    New programs are created as Drafts. Add curriculum to activate.
                  </p>
                </>
              )}
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
              Save Program
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgramFormModal;