import React, { useState } from 'react';
import { Enrollment, CreditTransaction } from '../types';
import { XIcon } from './icons/Icons';

interface CreditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (adjustment: { change: number; reason: string }) => void;
  enrollment: Enrollment;
  transactions: CreditTransaction[];
  userMap: Map<string, string>;
  programMap: Map<string, string>;
}

const CreditHistoryModal: React.FC<CreditHistoryModalProps> = ({ isOpen, onClose, onSave, enrollment, transactions, userMap, programMap }) => {
  const [change, setChange] = useState<number>(0);
  const [reason, setReason] = useState('');

  const studentName = userMap.get(enrollment.studentId) || 'Student';
  const programTitle = programMap.get(enrollment.programId) || 'Program';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (change === 0 || !reason.trim()) {
        alert('Please enter a non-zero credit amount and a reason.');
        return;
    }
    onSave({ change, reason });
    setChange(0);
    setReason('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 transform transition-all flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Credit History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{studentName} - {programTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">Transaction Log</h3>
            <div className="border rounded-lg dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Change</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reason</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Updated By</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                            <tr key={t.id}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{t.date}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${t.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {t.change > 0 ? `+${t.change}` : t.change}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{t.reason}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{t.adminName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 border-t dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-3">Manual Adjustment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                 <div className="md:col-span-1">
                    <label htmlFor="change" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (+/-)</label>
                    <input type="number" name="change" id="change" value={change} onChange={e => setChange(parseInt(e.target.value, 10) || 0)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                </div>
                <div className="md:col-span-2">
                     <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Adjustment</label>
                    <input type="text" name="reason" id="reason" value={reason} onChange={e => setReason(e.target.value)} required placeholder="e.g., Bonus for good performance" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                </div>
            </div>
             <div className="mt-4 flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Save Adjustment
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default CreditHistoryModal;