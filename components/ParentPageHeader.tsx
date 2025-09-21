import React from 'react';
import { useParentPortal } from '../contexts/ParentPortalContext';
import { UserCircleIcon, EyeIcon } from './icons/Icons';
import { useAuth } from '../contexts/AuthContext';

const ParentPageHeader: React.FC<{ title: string }> = ({ title }) => {
    const { children, selectedChild, selectedChildId, setSelectedChildId } = useParentPortal();
    const { impersonate } = useAuth();

    if (children.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
                <p className="mt-2 text-gray-500">No children are linked to this parent account.</p>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md mb-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2 text-lg">
                        <img src={selectedChild?.avatar} alt={selectedChild?.firstName} className="h-10 w-10 rounded-full" />
                        <div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Viewing for:</span>
                          <p className="font-bold text-xl leading-tight text-primary-600 dark:text-primary-400">{selectedChild?.firstName}</p>
                        </div>
                    </div>
                    {children.length > 1 && (
                         <select 
                            value={selectedChildId} 
                            onChange={(e) => setSelectedChildId(e.target.value)}
                            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                            aria-label="Select child to view"
                        >
                            {children.map(child => <option key={child.id} value={child.id}>{child.firstName} {child.lastName}</option>)}
                        </select>
                    )}
                    {selectedChild && (
                        <button 
                            onClick={() => impersonate(selectedChild)}
                            className="flex items-center bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
                        >
                            <EyeIcon className="h-5 w-5 mr-2" />
                            View as {selectedChild.firstName}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentPageHeader;