import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { XIcon } from './icons/Icons';
import { useToast } from '../contexts/ToastContext';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (password: string) => void;
  user: User | null;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onSave, user }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    onSave(password);
  };

  if (!isOpen || !user) return null;

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Reset Password for {user.firstName} {user.lastName}</h3>
            <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XIcon className="h-5 w-5"/></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="new-password">New Password</label>
              <input 
                type="password" 
                id="new-password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className={`${inputClasses} ${error ? 'border-red-500' : ''}`}
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password">Confirm New Password</label>
              <input 
                type="password" 
                id="confirm-new-password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                className={`${inputClasses} ${error ? 'border-red-500' : ''}`}
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Save New Password</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
