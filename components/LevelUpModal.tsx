import React from 'react';
import { TrophyIcon } from './icons/Icons';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  title: string;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ isOpen, onClose, level, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center font-student" aria-modal="true" role="dialog">
      <div className="scroll-modal w-full max-w-lg m-4 transform transition-all animate-fade-in-up">
        <div className="scroll-header">
          <h2>You've Leveled Up!</h2>
        </div>
        <div className="p-6 text-center space-y-4">
          <TrophyIcon className="h-24 w-24 mx-auto text-amber-500" />
          <p className="text-5xl font-extrabold text-amber-600 dark:text-amber-400">
            Level {level}
          </p>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
            You've earned the title: <span className="text-amber-700 dark:text-amber-300">{title}</span>!
          </p>
          <p>
            Your hard work has paid off. Keep up the amazing progress on your learning adventure!
          </p>
        </div>
        <div className="px-6 py-4 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-8 py-3 text-lg"
          >
            Continue Adventure
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;