import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Role, UserStatus } from '../types';
import { XIcon } from './icons/Icons';
import { getUsers } from '../api/userApi';
import { logAction } from '../api/auditApi';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  user: User | null;
}

const countryCodes = [
    { name: 'USA', code: '+1' },
    { name: 'UK', code: '+44' },
    { name: 'Australia', code: '+61' },
    { name: 'Germany', code: '+49' },
    { name: 'India', code: '+91' },
];

const timezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'
];

const grades = ['K', ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())];
const ages = Array.from({ length: 15 }, (_, i) => (i + 4).toString()); // 4 to 18

const generateUsername = (firstName: string, lastName: string, allUsers: User[]): string => {
    if (!firstName || !lastName) return '';
    let base = `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}`;
    let username = base;
    let counter = 1;
    while(allUsers.some(u => u.username === username)) {
        username = `${base}${counter++}`;
    }
    return username;
};

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, user }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneCode: '+1',
    phoneNumber: '',
    role: Role.STUDENT,
    status: UserStatus.ACTIVE,
    timezone: 'America/New_York',
    username: '',
    password: '',
    confirmPassword: '',
    // Student fields
    grade: '',
    age: '',
    parentId: '',
    // Teacher fields
    expertise: '',
    // Welcome email
    sendWelcomeEmail: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { addToast } = useToast();
  const { user: currentUser } = useAuth();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const parents = useMemo(() => allUsers.filter(u => u.role === Role.PARENT), [allUsers]);
  
  useEffect(() => {
    if (isOpen) {
        getUsers().then(setAllUsers);
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
        let phoneCode = '+1';
        let phoneNumber = '';
        if (user.phone) {
            const parts = user.phone.split(' ');
            if (parts.length > 1 && parts[0].startsWith('+')) {
                phoneCode = parts[0];
                phoneNumber = parts.slice(1).join(' ');
            } else {
                phoneNumber = user.phone;
            }
        }
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneCode: phoneCode,
        phoneNumber: phoneNumber,
        role: user.role,
        status: user.status,
        timezone: user.timezone || 'America/New_York',
        username: user.username || '',
        password: '',
        confirmPassword: '',
        grade: user.grade || '',
        age: user.age?.toString() || '',
        parentId: user.parentId || '',
        expertise: user.expertise || '',
        sendWelcomeEmail: false,
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneCode: '+1',
        phoneNumber: '',
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        timezone: 'America/New_York',
        username: '',
        password: '',
        confirmPassword: '',
        grade: '',
        age: '',
        parentId: '',
        expertise: '',
        sendWelcomeEmail: true,
      });
    }
    setErrors({});
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => {
            firstInputRef.current?.focus();
        }, 100);
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required.';
    if (!formData.lastName) newErrors.lastName = 'Last name is required.';
    if (!formData.email) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid.';
    else {
        const isEmailInUse = allUsers.some(u => u.email === formData.email && u.id !== user?.id);
        if (isEmailInUse) newErrors.email = 'This email is already in use.';
    }

    if (!user && !formData.username) newErrors.username = 'Username is required.';
    else if (!user && allUsers.some(u => u.username === formData.username)) newErrors.username = 'Username is already taken.';
    
    if (!user) { // Only validate password for new users
        if (!formData.password) {
            newErrors.password = 'Password is required for new users.';
        } else {
            if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
            if (formData.password !== formData.confirmPassword) newErrors.password = 'Passwords do not match.';
        }
    }

    if (formData.role === Role.STUDENT) {
        if (!formData.grade) newErrors.grade = 'Grade is required.';
        if (!formData.age) newErrors.age = 'Age is required.';
        else if (isNaN(Number(formData.age)) || Number(formData.age) <= 0) newErrors.age = 'Age must be a positive number.';
        if (!formData.parentId) newErrors.parentId = 'Parent is required.';
    }

    if (formData.role === Role.TEACHER) {
        if (!formData.expertise) newErrors.expertise = 'Expertise is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    // @ts-ignore
    const val = isCheckbox ? e.target.checked : value;

    if (name === 'firstName' || name === 'lastName') {
        const newFirstName = name === 'firstName' ? value : formData.firstName;
        const newLastName = name === 'lastName' ? value : formData.lastName;
        if (!user && formData.role === Role.STUDENT) { // Only auto-suggest for new students
            const suggestedUsername = generateUsername(newFirstName, newLastName, allUsers);
            setFormData(prev => ({ ...prev, [name]: val, username: suggestedUsername }));
            return;
        }
    }
    
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please fix the errors before saving.', 'error');
      return;
    }

    const finalUser: User = {
      ...user,
      id: user?.id || `new-${Date.now()}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      username: formData.username,
      password: user?.password || formData.password,
      phone: formData.phoneNumber ? `${formData.phoneCode} ${formData.phoneNumber}`.trim() : undefined,
      role: formData.role,
      status: formData.status,
      timezone: formData.timezone,
      avatar: user?.avatar || `https://picsum.photos/seed/${formData.firstName}/100/100`,
      lastLogin: user?.lastLogin || new Date().toLocaleString(),
      dateAdded: user?.dateAdded || new Date().toISOString().split('T')[0],
      grade: formData.role === Role.STUDENT ? formData.grade : undefined,
      age: formData.role === Role.STUDENT ? Number(formData.age) : undefined,
      parentId: formData.role === Role.STUDENT ? formData.parentId : undefined,
      expertise: formData.role === Role.TEACHER ? formData.expertise : undefined,
    };
    
    onSave(finalUser);
  };

  if (!isOpen) return null;

  const commonInputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  const disabledInputClasses = "disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{user ? 'Edit User' : 'Create New User'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="firstName">First Name *</label><input ref={firstInputRef} type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className={`${commonInputClasses} ${errors.firstName ? 'border-red-500' : ''}`} />{errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}</div>
                <div><label htmlFor="lastName">Last Name *</label><input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className={`${commonInputClasses} ${errors.lastName ? 'border-red-500' : ''}`} />{errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}</div>
            </div>
             <div><label htmlFor="email">Email Address *</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required disabled={!!user} className={`${commonInputClasses} ${disabledInputClasses} ${errors.email ? 'border-red-500' : ''}`} />{errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}</div>
             <div><label htmlFor="username">Username *</label><input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required disabled={!!user} className={`${commonInputClasses} ${disabledInputClasses} ${errors.username ? 'border-red-500' : ''}`} />{errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}</div>
             
             {!user && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label htmlFor="password">Password *</label><input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required className={`${commonInputClasses} ${errors.password ? 'border-red-500' : ''}`} />{errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}</div>
                    <div><label htmlFor="confirmPassword">Confirm Password *</label><input type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className={`${commonInputClasses} ${errors.password ? 'border-red-500' : ''}`} /></div>
                </div>
             )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role *</label>
                    <select name="role" id="role" value={formData.role} onChange={handleChange} className={commonInputClasses}>
                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                    <select name="timezone" id="timezone" value={formData.timezone} onChange={handleChange} className={commonInputClasses}>
                        {timezones.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
                    </select>
                </div>
            </div>

            {formData.role === Role.STUDENT && (
                <div className="p-4 border-t dark:border-gray-600 space-y-4">
                    <h3 className="font-semibold">Student Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grade *</label>
                            <select name="grade" id="grade" value={formData.grade} onChange={handleChange} required className={`${commonInputClasses} ${errors.grade ? 'border-red-500' : ''}`}>
                                <option value="">Select a grade...</option>
                                {grades.map(g => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>)}
                            </select>
                            {errors.grade && <p className="mt-1 text-xs text-red-500">{errors.grade}</p>}
                        </div>
                        <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age *</label>
                            <select name="age" id="age" value={formData.age} onChange={handleChange} required className={`${commonInputClasses} ${errors.age ? 'border-red-500' : ''}`}>
                                <option value="">Select an age...</option>
                                {ages.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            {errors.age && <p className="mt-1 text-xs text-red-500">{errors.age}</p>}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Parent *</label>
                        <select name="parentId" id="parentId" value={formData.parentId} onChange={handleChange} required className={`${commonInputClasses} ${errors.parentId ? 'border-red-500' : ''}`}>
                            <option value="">Select a parent...</option>
                            {parents.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                        </select>
                         {errors.parentId && <p className="mt-1 text-xs text-red-500">{errors.parentId}</p>}
                    </div>
                </div>
            )}

            {formData.role === Role.TEACHER && (
                <div className="p-4 border-t dark:border-gray-600 space-y-4">
                    <h3 className="font-semibold">Teacher Details</h3>
                    <div><label htmlFor="expertise">Expertise</label><input type="text" name="expertise" id="expertise" value={formData.expertise} onChange={handleChange} className={`${commonInputClasses} ${errors.expertise ? 'border-red-500' : ''}`} />{errors.expertise && <p className="text-xs text-red-500 mt-1">{errors.expertise}</p>}</div>
                </div>
            )}
            
            {!user && (
                 <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input id="sendWelcomeEmail" name="sendWelcomeEmail" type="checkbox" checked={formData.sendWelcomeEmail} onChange={handleChange} className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="sendWelcomeEmail" className="font-medium text-gray-700 dark:text-gray-300">Send welcome email with username and temporary password</label>
                    </div>
                </div>
            )}

          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Save User</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
