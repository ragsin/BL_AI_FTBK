import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Role, User } from '../types';
import { UserCircleIcon, KeyIcon, PencilIcon, UsersIcon, BellAlertIcon, StarIcon } from '../components/icons/Icons';
import { Link } from 'react-router-dom';
import ChildProfileModal from '../components/ChildProfileModal';

const countryCodes = [
    { name: 'USA', code: '+1' },
    { name: 'UK', code: '+44' },
    { name: 'Australia', code: '+61' },
    { name: 'Germany', code: '+49' },
    { name: 'India', code: '+91' },
];

const timezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'
];

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; name: string; disabled?: boolean; }> = ({ enabled, onChange, name, disabled }) => (
    <label htmlFor={name} className={`inline-flex relative items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <input type="checkbox" checked={enabled} onChange={e => onChange(e.target.checked)} id={name} name={name} className="sr-only peer" disabled={disabled}/>
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
    </label>
);

const ProfilePage: React.FC = () => {
    const { user, updateUser, findUserById } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newAvatar, setNewAvatar] = useState<string | null>(null);

    // Parent-specific state
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);
    const [editingChild, setEditingChild] = useState<User | null>(null);
    const [isNotificationsEditing, setIsNotificationsEditing] = useState(false);
    const [draftNotificationPrefs, setDraftNotificationPrefs] = useState(user?.notificationPreferences);
    
    const parsePhoneNumber = (phone?: string) => {
        if (!phone) return { phoneCode: '+1', phoneNumber: '' };
        const parts = phone.split(' ');
        if (parts.length > 1 && parts[0].startsWith('+')) {
            const code = parts[0];
            const foundCode = countryCodes.find(c => c.code === code);
            if(foundCode) {
                return { phoneCode: code, phoneNumber: parts.slice(1).join(' ') };
            }
        }
        return { phoneCode: '+1', phoneNumber: phone };
    };
    
    const [profileData, setProfileData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phoneCode: parsePhoneNumber(user?.phone).phoneCode,
        phoneNumber: parsePhoneNumber(user?.phone).phoneNumber,
        timezone: user?.timezone || 'America/New_York',
    });
    
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    // FIX: Use state and effect to handle async fetching of children
    const [children, setChildren] = useState<User[]>([]);

    useEffect(() => {
        if (user?.childrenIds) {
            const fetchChildren = async () => {
                const users = await Promise.all(user.childrenIds!.map(id => findUserById(id)));
                setChildren(users.filter((u): u is User => !!u));
            };
            fetchChildren();
        }
    }, [user?.childrenIds, findUserById]);


    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };
    
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => { setNewAvatar(reader.result as string); setIsEditing(true); };
            reader.readAsDataURL(file);
        } else {
            addToast('Please select a valid image file.', 'error');
        }
    };

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user) {
            updateUser({ ...user, firstName: profileData.firstName, lastName: profileData.lastName, phone: `${profileData.phoneCode} ${profileData.phoneNumber}`.trim(), timezone: profileData.timezone, avatar: newAvatar || user.avatar });
            addToast('Profile updated successfully!');
            setIsEditing(false);
            setNewAvatar(null);
        }
    };
    
    const handleCancel = () => {
        if (user) {
            setProfileData({ firstName: user.firstName || '', lastName: user.lastName || '', phoneCode: parsePhoneNumber(user.phone).phoneCode, phoneNumber: parsePhoneNumber(user.phone).phoneNumber, timezone: user.timezone || 'America/New_York' });
        }
        setIsEditing(false);
        setNewAvatar(null);
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) { addToast('New passwords do not match.', 'error'); return; }
        if (passwordData.newPassword.length < 8) { addToast('Password must be at least 8 characters long.', 'error'); return; }
        addToast('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    const handleEditChild = (child: User) => {
        setEditingChild(child);
        setIsChildModalOpen(true);
    };

    const handleSaveChild = (updatedChild: User) => {
        updateUser(updatedChild);
        addToast(`${updatedChild.firstName}'s profile updated!`);
        setIsChildModalOpen(false);
    };
    
    const handleSaveNotifications = () => {
        if (user) {
            updateUser({ ...user, notificationPreferences: draftNotificationPrefs });
            addToast('Notification preferences saved!');
            setIsNotificationsEditing(false);
        }
    };

    const handleCancelNotifications = () => {
        setDraftNotificationPrefs(user?.notificationPreferences);
        setIsNotificationsEditing(false);
    };

    if (!user) return null;

    const TabButton: React.FC<{ tab: 'profile' | 'security' | 'notifications'; label: string; icon: React.ElementType }> = ({ tab, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <Icon className="h-5 w-5 mr-2" />
            {label}
        </button>
    );

    const inputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const disabledInputClass = "disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-400";


    return (
        <>
            <div className={`max-w-4xl mx-auto space-y-8 ${user.role === Role.STUDENT ? 'font-student' : ''}`}>
                 <div className="flex items-center space-x-4">
                    <div className="relative">
                        <img className="h-24 w-24 rounded-full object-cover" src={newAvatar || user.avatar} alt="Profile" />
                        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                        {user.role !== Role.STUDENT && <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" aria-label="Change profile picture"><PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" /></button>}
                    </div>
                    <div>
                        <h1 className={`text-3xl font-bold ${user.role === Role.STUDENT ? 'text-slate-800 dark:text-white' : 'text-gray-800 dark:text-white'}`}>{user.firstName} {user.lastName}</h1>
                        <p className={`${user.role === Role.STUDENT ? 'text-slate-500 dark:text-slate-400' : 'text-gray-500 dark:text-gray-400'}`}>{user.role}</p>
                    </div>
                </div>
                
                <div className={`${user.role === Role.STUDENT ? 'bg-white dark:bg-slate-800 rounded-2xl shadow-lg' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'}`}>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700"><div className="flex space-x-2">
                        <TabButton tab="profile" label="Profile Information" icon={UserCircleIcon} />
                        <TabButton tab="security" label="Security" icon={KeyIcon} />
                        {user.role === Role.PARENT && <TabButton tab="notifications" label="Notifications" icon={BellAlertIcon} />}
                    </div></div>

                    {activeTab === 'profile' && (<form onSubmit={handleProfileSubmit}>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label><input type="text" name="firstName" id="firstName" value={profileData.firstName} onChange={handleProfileChange} className={`${inputClass} ${disabledInputClass}`} disabled={!isEditing} /></div>
                                <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label><input type="text" name="lastName" id="lastName" value={profileData.lastName} onChange={handleProfileChange} className={`${inputClass} ${disabledInputClass}`} disabled={!isEditing} /></div>
                            </div>
                            <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label><input type="email" name="email" id="email" value={user.email} disabled className={`${inputClass} ${disabledInputClass}`} /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label><div className="mt-1 flex rounded-md shadow-sm">
                                <select name="phoneCode" value={profileData.phoneCode} onChange={handleProfileChange} className={`block w-auto pl-3 pr-8 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${disabledInputClass}`} disabled={!isEditing}>{countryCodes.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}</select>
                                <input type="tel" name="phoneNumber" value={profileData.phoneNumber} onChange={handleProfileChange} className={`flex-1 min-w-0 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm -ml-px ${disabledInputClass}`} disabled={!isEditing} />
                            </div></div>
                            <div><label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label><select name="timezone" id="timezone" value={profileData.timezone} onChange={handleProfileChange} className={`${inputClass} ${disabledInputClass}`} disabled={!isEditing}>{timezones.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}</select></div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">{isEditing ? (<><button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Save Changes</button></>) : (<button type="button" onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Edit Profile</button>)}</div>
                    </form>)}

                    {activeTab === 'security' && (<form onSubmit={handlePasswordSubmit}><div className="p-6 space-y-4">
                        <div><label htmlFor="currentPassword">Current Password</label><input type="password" name="currentPassword" id="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className={inputClass} /></div>
                        <div><label htmlFor="newPassword">New Password</label><input type="password" name="newPassword" id="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className={inputClass} /></div>
                        <div><label htmlFor="confirmPassword">Confirm New Password</label><input type="password" name="confirmPassword" id="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className={inputClass} /></div>
                    </div><div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end"><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Change Password</button></div></form>)}
                    
                    {activeTab === 'notifications' && (
                        <div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    <div><h4 className="font-semibold text-gray-800 dark:text-white">Session Summaries</h4><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive an alert when a teacher posts a new session summary.</p></div>
                                    <ToggleSwitch enabled={draftNotificationPrefs?.sessionSummaries ?? false} onChange={(val) => setDraftNotificationPrefs(p => ({...p!, sessionSummaries: val}))} name="sessionSummaries" disabled={!isNotificationsEditing}/>
                                </div>
                                 <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    <div><h4 className="font-semibold text-gray-800 dark:text-white">Assignment Graded</h4><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive an alert when an assignment is graded.</p></div>
                                    <ToggleSwitch enabled={draftNotificationPrefs?.assignmentGraded ?? false} onChange={(val) => setDraftNotificationPrefs(p => ({...p!, assignmentGraded: val}))} name="assignmentGraded" disabled={!isNotificationsEditing}/>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    <div><h4 className="font-semibold text-gray-800 dark:text-white">Low Credit Alerts</h4><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Receive an alert when a child's credit balance is low.</p></div>
                                    <ToggleSwitch enabled={draftNotificationPrefs?.lowCreditAlerts ?? false} onChange={(val) => setDraftNotificationPrefs(p => ({...p!, lowCreditAlerts: val}))} name="lowCreditAlerts" disabled={!isNotificationsEditing}/>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
                                {isNotificationsEditing ? (<><button type="button" onClick={handleCancelNotifications} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button><button type="button" onClick={handleSaveNotifications} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Save Preferences</button></>) : (<button type="button" onClick={() => setIsNotificationsEditing(true)} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Edit Preferences</button>)}
                            </div>
                        </div>
                    )}
                </div>
                {user.role === Role.PARENT && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <UsersIcon className="h-6 w-6 text-primary-500" />
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Manage Child Profiles</h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            {children.length > 0 ? (
                                children.map(child => (
                                    <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <img src={child.avatar} alt={child.firstName} className="h-10 w-10 rounded-full" />
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white">{child.firstName} {child.lastName}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Grade: {child.grade || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleEditChild(child)} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Edit</button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500">No children linked to this account.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {editingChild && (
                <ChildProfileModal
                    isOpen={isChildModalOpen}
                    onClose={() => setIsChildModalOpen(false)}
                    onSave={handleSaveChild}
                    child={editingChild}
                />
            )}
        </>
    );
};

export default ProfilePage;
