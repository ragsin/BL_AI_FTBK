import React, { useState, useEffect, useMemo } from 'react';
import { RevenueTransaction, RevenueTransactionType, Enrollment, User, Program, Role } from '../types';
import { XIcon } from './icons/Icons';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';

interface RevenueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<RevenueTransaction, 'id' | 'enrollmentId'> & { studentId: string; programId: string; teacherId: string }, isEditing: boolean, originalTransaction: RevenueTransaction | null) => void;
  transaction: RevenueTransaction | null;
  enrollments: Enrollment[];
  users: User[];
  programs: Program[];
  students: User[];
  teachers: User[];
}

const currencies = ['INR', 'USD', 'CAD', 'EUR', 'GBP'];

const RevenueFormModal: React.FC<RevenueFormModalProps> = ({ isOpen, onClose, onSave, transaction, enrollments, users, programs, students, teachers }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    salesPersonId: '',
    studentId: '',
    programId: '',
    teacherId: '',
    credits: 0,
    price: 0,
    currency: settings.primaryCurrency,
    conversionRate: 1,
    type: RevenueTransactionType.REVENUE,
    notes: '',
  });
  const [showConversion, setShowConversion] = useState(false);
  const { addToast } = useToast();

  const salesPeople = useMemo(() => users.filter(u => u.role === Role.SALES || u.role === Role.ADMIN), [users]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`])), [users]);
  const programMap = useMemo(() => new Map(programs.map(p => [p.id, p.title])), [programs]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (transaction) {
      const enrollment = enrollments.find(e => e.id === transaction.enrollmentId);
      setFormData({
        date: transaction.date,
        salesPersonId: transaction.salesPersonId,
        studentId: enrollment?.studentId || '',
        programId: enrollment?.programId || '',
        teacherId: enrollment?.teacherId || '',
        credits: Math.abs(transaction.credits),
        price: Math.abs(transaction.price),
        currency: transaction.currency,
        conversionRate: transaction.conversionRate || 1,
        type: transaction.type,
        notes: transaction.notes || '',
      });
      setShowConversion(transaction.currency !== settings.primaryCurrency);
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        salesPersonId: salesPeople.length > 0 ? salesPeople[0].id : '',
        studentId: students.length > 0 ? students[0].id : '',
        programId: programs.length > 0 ? programs[0].id : '',
        teacherId: teachers.length > 0 ? teachers[0].id : '',
        credits: 24,
        price: 0,
        currency: settings.primaryCurrency,
        conversionRate: 1,
        type: RevenueTransactionType.REVENUE,
        notes: '',
      });
      setShowConversion(false);
    }
  }, [transaction, isOpen, enrollments, salesPeople, settings.primaryCurrency, students, programs, teachers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | number = value;
    if (type === 'number') {
        finalValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));

    if (name === 'currency') {
      setShowConversion(value !== settings.primaryCurrency);
      if (value === settings.primaryCurrency) {
        setFormData(prev => ({ ...prev, conversionRate: 1 }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || !formData.programId || !formData.teacherId || !formData.salesPersonId) {
        addToast('Please fill all required fields.', 'error');
        return;
    }
    if (formData.price < 0 || formData.credits <= 0) {
        addToast('Price must be zero or positive, and Credits must be positive.', 'error');
        return;
    }

    // @ts-ignore
    onSave(formData, !!transaction, transaction);
  };

  if (!isOpen) return null;

  const inputStyle = "block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  const disabledInputStyle = "disabled:bg-gray-100 dark:disabled:bg-gray-600/50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{transaction ? 'Edit Revenue Entry' : 'Add New Revenue Entry'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Date</label>
                <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className={`${inputStyle} mt-1`} />
              </div>
              <div>
                <label htmlFor="salesPersonId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sales Person</label>
                <select name="salesPersonId" id="salesPersonId" value={formData.salesPersonId} onChange={handleChange} required className={`${inputStyle} mt-1`}>
                  {salesPeople.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student</label>
              <select name="studentId" id="studentId" value={formData.studentId} onChange={handleChange} required className={`${inputStyle} mt-1 ${disabledInputStyle}`} disabled={!!transaction}>
                {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="programId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Program</label>
                    <select name="programId" id="programId" value={formData.programId} onChange={handleChange} required className={`${inputStyle} mt-1 ${disabledInputStyle}`} disabled={!!transaction}>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teacher</label>
                    <select name="teacherId" id="teacherId" value={formData.teacherId} onChange={handleChange} required className={`${inputStyle} mt-1 ${disabledInputStyle}`} disabled={!!transaction}>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="credits" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credits</label>
                <input type="number" name="credits" id="credits" value={formData.credits} onChange={handleChange} required min="0" className={`${inputStyle} mt-1 ${disabledInputStyle}`} disabled={!!transaction}/>
              </div>
               <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" className={`${inputStyle} mt-1`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                    <select name="currency" id="currency" value={formData.currency} onChange={handleChange} required className={`${inputStyle} mt-1`}>
                        {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {showConversion && (
                    <div>
                        <label htmlFor="conversionRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conversion Rate to {settings.primaryCurrency}</label>
                        <input type="number" name="conversionRate" id="conversionRate" value={formData.conversionRate} onChange={handleChange} required min="0" step="0.0001" className={`${inputStyle} mt-1`} />
                    </div>
                )}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Save Transaction</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevenueFormModal;
