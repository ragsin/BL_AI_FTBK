

import React, { useState, useEffect } from 'react';
import { Announcement, Role, Program, MessageTemplate } from '../types';
import { useToast } from '../contexts/ToastContext';
import { XIcon } from './icons/Icons';
import MultiSelectDropdown from './MultiSelectDropdown';

interface AnnouncementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (announcement: Announcement) => void;
  programs: Program[];
  templates: MessageTemplate[];
}

const AnnouncementFormModal: React.FC<AnnouncementFormModalProps> = ({ isOpen, onClose, onSave, programs, templates }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRoles: [] as Role[],
    targetProgramIds: [] as string[],
  });
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        content: '',
        targetRoles: [],
        targetProgramIds: [],
      });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRolesChange = (selected: string[]) => {
    setFormData(prev => ({ ...prev, targetRoles: selected as Role[] }));
  };
  
  const handleProgramsChange = (selected: string[]) => {
    setFormData(prev => ({ ...prev, targetProgramIds: selected }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
        setFormData(prev => ({ ...prev, content: selectedTemplate.content }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      addToast('Title and content are required.', 'error');
      return;
    }
    if (formData.targetRoles.length === 0 && formData.targetProgramIds.length === 0) {
      addToast('Please select a target audience (at least one role or program).', 'error');
      return;
    }

    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      ...formData,
      dateSent: new Date().toISOString(),
      // In a real app, this would come from the logged-in user context
      sentById: 'admin-1', 
    };
    
    onSave(newAnnouncement);
    onClose();
  };

  if (!isOpen) return null;
  
  const roleOptions = Object.values(Role).map(role => ({ value: role, label: role }));
  const programOptions = programs.map(program => ({ value: program.id, label: program.title }));

  const inputStyle = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Announcement</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={inputStyle} />
            </div>
            <div>
                <label htmlFor="template" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Use Template (Optional)</label>
                <select id="template" onChange={handleTemplateChange} className={inputStyle}>
                    <option value="">Select a template...</option>
                    {templates.map(template => (
                        <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                </select>
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
              <textarea name="content" id="content" value={formData.content} onChange={handleChange} required rows={8} className={inputStyle}></textarea>
            </div>
            <div>
              <h3 className="text-md font-medium text-gray-800 dark:text-white mb-2">Target Audience</h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target User Roles</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Send to all users with the selected role(s).</p>
                    <MultiSelectDropdown options={roleOptions} selectedValues={formData.targetRoles} onChange={handleRolesChange} placeholder="Select roles..." />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Programs</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Send to all users (students, parents, teachers) associated with the selected program(s).</p>
                    <MultiSelectDropdown options={programOptions} selectedValues={formData.targetProgramIds} onChange={handleProgramsChange} placeholder="Select programs..." />
                 </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Send Announcement</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementFormModal;