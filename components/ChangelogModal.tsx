import React from 'react';
// FIX: Replaced non-existent BugAntIcon with CogIcon to resolve import error.
import { XIcon, SparklesIcon, ArrowUpIcon, CogIcon, GiftIcon } from './icons/Icons';
import { changelogData } from '../data/changelog';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tagColors: Record<string, string> = {
    'New': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Improvement': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Fix': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const tagIcons: Record<string, React.ElementType> = {
    'New': SparklesIcon,
    'Improvement': ArrowUpIcon,
    // FIX: Replaced non-existent BugAntIcon with CogIcon.
    'Fix': CogIcon,
};


const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const latestUpdate = changelogData[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg m-4 transform transition-all animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center bg-primary-500 rounded-t-2xl relative">
            <div className="absolute top-4 right-4">
                 <button onClick={onClose} className="p-1 rounded-full bg-white/20 hover:bg-white/40 text-white">
                    <XIcon className="h-5 w-5" />
                </button>
            </div>
            <GiftIcon className="h-16 w-16 text-white mx-auto" />
            <h2 className="text-2xl font-bold text-white mt-2">What's New?</h2>
            <p className="text-sm text-white/80">Version {latestUpdate.version} - {latestUpdate.date}</p>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{latestUpdate.title}</h3>
          {Object.entries(latestUpdate.changes).map(([category, items]) => {
            const Icon = tagIcons[category] || SparklesIcon;
            return (
              <div key={category}>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${tagColors[category]}`}>
                    <Icon className="h-4 w-4 mr-2" />
                    {category}
                </div>
                <ul className="mt-2 ml-4 list-disc list-outside space-y-1 text-gray-600 dark:text-gray-300">
                  {(items as string[]).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;