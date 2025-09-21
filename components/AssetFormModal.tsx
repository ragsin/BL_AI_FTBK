
import React, { useState, useEffect, useMemo } from 'react';
import { Asset, AssetStatus, User, Role } from '../types';
import { XIcon } from './icons/Icons';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { useSettings } from '../contexts/SettingsContext';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Omit<Asset, 'id' | 'dateAcquired' | 'history'>) => void;
  asset: Asset | null;
  assignableUsers: User[];
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({ isOpen, onClose, onSave, asset, assignableUsers }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    typeId: '',
    status: AssetStatus.AVAILABLE,
    assignedTo: [] as string[],
    details: '',
  });
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useOutsideClick(() => setIsDropdownOpen(false));

  const availableUsersToAdd = useMemo(() => {
    const assignedIds = new Set(formData.assignedTo);
    return assignableUsers.filter(u => !assignedIds.has(u.id));
  }, [assignableUsers, formData.assignedTo]);

  const groupedSearchedUsers = useMemo(() => {
    const filtered = searchTerm
      ? availableUsersToAdd.filter(user =>
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : availableUsersToAdd;

    const groups: { [key in Role]?: User[] } = {};
    for (const user of filtered) {
      if (!groups[user.role]) {
        groups[user.role] = [];
      }
      groups[user.role]?.push(user);
    }

    const roleOrder = [Role.ADMIN, Role.FINANCE, Role.SALES, Role.SCHEDULER, Role.TEACHER];
    return roleOrder
      .map(role => ([role, groups[role]]))
      .filter(([, usersInRole]) => usersInRole && usersInRole.length > 0) as [Role, User[]][];
  }, [availableUsersToAdd, searchTerm]);

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        typeId: asset.typeId,
        status: asset.status,
        assignedTo: asset.assignedTo,
        details: asset.details,
      });
    } else {
      setFormData({
        name: '',
        typeId: settings.assetTypes.length > 0 ? settings.assetTypes[0].id : '',
        status: AssetStatus.AVAILABLE,
        assignedTo: [],
        details: '',
      });
    }
    setSelectedUserId('');
    setSearchTerm('');
  }, [asset, isOpen, settings.assetTypes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = () => {
    if (selectedUserId && !formData.assignedTo.includes(selectedUserId)) {
        const newAssignedTo = [...formData.assignedTo, selectedUserId];
        setFormData(prev => ({
            ...prev,
            assignedTo: newAssignedTo,
            status: AssetStatus.ASSIGNED,
        }));
        setSelectedUserId('');
        setSearchTerm('');
    }
  };

  const handleRemoveUser = (userIdToRemove: string) => {
    const newAssignedTo = formData.assignedTo.filter(id => id !== userIdToRemove);
    setFormData(prev => ({
        ...prev,
        assignedTo: newAssignedTo,
        status: newAssignedTo.length > 0 ? AssetStatus.ASSIGNED : AssetStatus.AVAILABLE,
    }));
  };

  const handleUserSelect = (user: User) => {
    setSelectedUserId(user.id);
    setSearchTerm(`${user.firstName} ${user.lastName}`);
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
    setSelectedUserId(''); // Clear selection when user types
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{asset ? 'Edit Asset' : 'Add New Asset'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <XIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Name</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="typeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select name="typeId" id="typeId" value={formData.typeId} onChange={handleChange} required className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                    {settings.assetTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                  {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign to User</label>
              <div className="mt-1 flex items-center space-x-2">
                <div className="relative flex-grow" ref={searchRef}>
                  <input
                    type="text"
                    id="user-search"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Type to search for a user..."
                    autoComplete="off"
                    className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  />
                  {isDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      {groupedSearchedUsers.length > 0 ? (
                        groupedSearchedUsers.map(([role, usersInRole]) => (
                          <div key={role}>
                            <div className="text-xs font-bold uppercase text-gray-500 px-3 py-2">{role}</div>
                            {usersInRole.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(user => (
                              <div
                                key={user.id}
                                onClick={() => handleUserSelect(user)}
                                className="text-gray-900 dark:text-gray-200 cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                {user.firstName} {user.lastName}
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 cursor-default select-none relative py-2 px-3">
                          No users found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddUser}
                  disabled={!selectedUserId}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Allowed Users</label>
                <div className="mt-2 p-3 border border-gray-300 dark:border-gray-600 rounded-md min-h-[80px] bg-gray-50 dark:bg-gray-700/50">
                    {formData.assignedTo.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {formData.assignedTo.map(userId => {
                                const user = assignableUsers.find(u => u.id === userId);
                                return (
                                    <span key={userId} className="inline-flex items-center py-1 pl-3 pr-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-200 rounded-full text-sm font-medium">
                                        {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveUser(userId)}
                                            className="ml-2 flex-shrink-0 p-0.5 bg-primary-200 dark:bg-primary-700 text-primary-700 dark:text-primary-100 rounded-full hover:bg-primary-300 dark:hover:bg-primary-600"
                                            aria-label={`Remove ${user?.firstName} ${user?.lastName}`}
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No users assigned. Asset status will be "Available".</p>
                    )}
                </div>
            </div>
             <div>
              <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Details / Notes</label>
              <textarea name="details" id="details" rows={3} value={formData.details} onChange={handleChange} placeholder="e.g., URL, credentials, license key, notes..." className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3 sticky bottom-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Save Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetFormModal;
