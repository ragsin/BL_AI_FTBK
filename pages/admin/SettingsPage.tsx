import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PlatformSettings, CompanyPhoneNumber, ProgramCategory, Program, Asset, AssetType, MessageTemplate } from '../../types';
import { BuildingOfficeIcon, BellAlertIcon, BanknotesIcon, ArrowUpTrayIcon, PlusIcon, TrashIcon, SparklesIcon, ClipboardListIcon, PencilIcon, PencilSquareIcon, XIcon } from '../../components/icons/Icons';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getPrograms } from '../../api/programApi';
import { getAssets } from '../../api/assetApi';
import { logAction } from '../../api/auditApi';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useAuth } from '../../contexts/AuthContext';

const countryCodes = [
    { name: 'USA', code: '+1' }, { name: 'UK', code: '+44' }, { name: 'Australia', code: '+61' },
    { name: 'Germany', code: '+49' }, { name: 'India', code: '+91' },
];

const currencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD'];
const aiModels = {
    gemini: ['gemini-2.5-flash'],
};

type TabName = 'general' | 'financial' | 'alerts' | 'ai' | 'categories' | 'assetTypes' | 'templates';

const SettingsCard: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode; tabName: TabName; editingTab: string | null; onEdit: (tab: TabName) => void; onSave: () => void; onCancel: () => void; }> = ({ icon: Icon, title, children, tabName, editingTab, onEdit, onSave, onCancel }) => {
    const isEditing = editingTab === tabName;
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full mr-4">
                        <Icon className="h-6 w-6 text-primary-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
                    <div className="ml-auto">
                        {isEditing ? (
                            <div className="flex items-center space-x-2">
                                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Save</button>
                            </div>
                        ) : (
                            <button type="button" onClick={() => onEdit(tabName)} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Edit</button>
                        )}
                    </div>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </form>
    );
};

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; name: string; disabled?: boolean; }> = ({ enabled, onChange, name, disabled }) => (
    <label htmlFor={name} className={`inline-flex relative items-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <input type="checkbox" checked={enabled} onChange={e => onChange(e.target.checked)} id={name} name={name} className="sr-only peer" disabled={disabled}/>
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
    </label>
);

const SettingsPage: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { user: adminUser } = useAuth();
    const [draftSettings, setDraftSettings] = useState<PlatformSettings>(settings);
    const [activeTab, setActiveTab] = useState<TabName>('general');
    const [editingTab, setEditingTab] = useState<string | null>(null);
    const { addToast } = useToast();
    const logoInputRef = useRef<HTMLInputElement>(null);
    
    const [allPrograms, setAllPrograms] = useState<Program[]>([]);
    const [allAssets, setAllAssets] = useState<Asset[]>([]);

    useEffect(() => {
        getPrograms().then(setAllPrograms);
        getAssets().then(setAllAssets);
    }, []);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ProgramCategory | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<ProgramCategory | null>(null);

    const [isAssetTypeModalOpen, setIsAssetTypeModalOpen] = useState(false);
    const [editingAssetType, setEditingAssetType] = useState<AssetType | null>(null);
    const [assetTypeName, setAssetTypeName] = useState('');
    const [isConfirmDeleteAssetTypeOpen, setIsConfirmDeleteAssetTypeOpen] = useState(false);
    const [assetTypeToDelete, setAssetTypeToDelete] = useState<AssetType | null>(null);
    
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
    const [templateTitle, setTemplateTitle] = useState('');
    const [templateContent, setTemplateContent] = useState('');
    const [isConfirmDeleteTemplateOpen, setIsConfirmDeleteTemplateOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);

    useEffect(() => {
        setDraftSettings(settings);
    }, [settings]);


    const handleEdit = (tabName: TabName) => {
        setDraftSettings(settings);
        setEditingTab(tabName);
    };

    const handleCancel = () => {
        setDraftSettings(settings);
        setEditingTab(null);
    };

    const handleSave = () => {
        if (adminUser) {
            logAction(adminUser, 'SETTINGS_UPDATED', 'PlatformSettings', 'global', { previousState: settings, changes: draftSettings });
        }
        updateSettings(draftSettings);
        setEditingTab(null);
        addToast('Settings saved successfully!');
    };
    
    const handleSettingsChange = (path: string, value: any) => {
        setDraftSettings(prev => {
            const keys = path.split('.');
            const newSettings = JSON.parse(JSON.stringify(prev));
            let currentLevel: any = newSettings;
    
            for (let i = 0; i < keys.length - 1; i++) {
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;

            if (path === 'aiProvider.provider') {
                if (value === 'gemini') {
                    newSettings.aiProvider.model = aiModels.gemini[0];
                } else if (value === 'openrouter') {
                    newSettings.aiProvider.model = '';
                }
            }
            
            return newSettings;
        });
    };
    
    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                handleSettingsChange('companyLogoUrl', dataUrl);
            };
            reader.readAsDataURL(file);
        } else if (file) {
            addToast('Please select a valid image file.', 'error');
        }
    };
    
    const handleAddPhoneNumber = () => setDraftSettings(p => ({ ...p, companyPhoneNumbers: [...p.companyPhoneNumbers, { id: `phone-${Date.now()}`, code: '+1', number: '' }] }));
    const handleRemovePhoneNumber = (id: string) => setDraftSettings(p => ({ ...p, companyPhoneNumbers: p.companyPhoneNumbers.filter(ph => ph.id !== id) }));
    const handlePhoneNumberChange = (id: string, field: 'code' | 'number', value: string) => {
        setDraftSettings(p => ({ ...p, companyPhoneNumbers: p.companyPhoneNumbers.map(ph => ph.id === id ? { ...ph, [field]: value } : ph) }));
    };

    const handleOpenCategoryModal = (category: ProgramCategory | null) => {
        setEditingCategory(category);
        setCategoryName(category ? category.name : '');
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = () => {
        if (!categoryName.trim()) {
            addToast('Category name cannot be empty.', 'error');
            return;
        }

        const isDuplicate = draftSettings.programCategories.some(
            cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase() && cat.id !== editingCategory?.id
        );
        if (isDuplicate) {
            addToast('A category with this name already exists.', 'error');
            return;
        }

        if (editingCategory) {
            const updatedCategories = draftSettings.programCategories.map(cat =>
                cat.id === editingCategory.id ? { ...cat, name: categoryName.trim() } : cat
            );
            handleSettingsChange('programCategories', updatedCategories);
        } else {
            const newCategory: ProgramCategory = {
                id: `cat-${Date.now()}`,
                name: categoryName.trim(),
            };
            handleSettingsChange('programCategories', [...draftSettings.programCategories, newCategory]);
        }
        setIsCategoryModalOpen(false);
    };

    const handleDeleteCategoryClick = (category: ProgramCategory) => {
        const isUsed = allPrograms.some(p => p.categoryId === category.id);
        if (isUsed) {
            addToast(`Cannot delete "${category.name}" as it is currently used by one or more programs.`, 'error');
            return;
        }
        setCategoryToDelete(category);
        setIsConfirmDeleteOpen(true);
    };

    const handleDeleteCategoryConfirm = () => {
        if (!categoryToDelete) return;
        const updatedCategories = draftSettings.programCategories.filter(cat => cat.id !== categoryToDelete.id);
        handleSettingsChange('programCategories', updatedCategories);
        setIsConfirmDeleteOpen(false);
        setCategoryToDelete(null);
    };

    const handleOpenAssetTypeModal = (assetType: AssetType | null) => {
        setEditingAssetType(assetType);
        setAssetTypeName(assetType ? assetType.name : '');
        setIsAssetTypeModalOpen(true);
    };

    const handleSaveAssetType = () => {
        if (!assetTypeName.trim()) {
            addToast('Asset Type name cannot be empty.', 'error');
            return;
        }

        const isDuplicate = draftSettings.assetTypes.some(
            at => at.name.toLowerCase() === assetTypeName.trim().toLowerCase() && at.id !== editingAssetType?.id
        );
        if (isDuplicate) {
            addToast('An asset type with this name already exists.', 'error');
            return;
        }

        if (editingAssetType) {
            const updatedAssetTypes = draftSettings.assetTypes.map(at =>
                at.id === editingAssetType.id ? { ...at, name: assetTypeName.trim() } : at
            );
            handleSettingsChange('assetTypes', updatedAssetTypes);
        } else { 
            const newAssetType: AssetType = {
                id: `at-${Date.now()}`,
                name: assetTypeName.trim(),
            };
            handleSettingsChange('assetTypes', [...draftSettings.assetTypes, newAssetType]);
        }
        setIsAssetTypeModalOpen(false);
    };

    const handleDeleteAssetTypeClick = (assetType: AssetType) => {
        const isUsed = allAssets.some(a => a.typeId === assetType.id);
        if (isUsed) {
            addToast(`Cannot delete "${assetType.name}" as it is currently used by one or more assets.`, 'error');
            return;
        }
        setAssetTypeToDelete(assetType);
        setIsConfirmDeleteAssetTypeOpen(true);
    };

    const handleDeleteAssetTypeConfirm = () => {
        if (!assetTypeToDelete) return;
        const updatedAssetTypes = draftSettings.assetTypes.filter(at => at.id !== assetTypeToDelete.id);
        handleSettingsChange('assetTypes', updatedAssetTypes);
        setIsConfirmDeleteAssetTypeOpen(false);
        setAssetTypeToDelete(null);
    };
    
    const handleOpenTemplateModal = (template: MessageTemplate | null) => {
        setEditingTemplate(template);
        setTemplateTitle(template ? template.title : '');
        setTemplateContent(template ? template.content : '');
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplate = () => {
        if (!templateTitle.trim() || !templateContent.trim()) {
            addToast('Template title and content cannot be empty.', 'error');
            return;
        }

        const isDuplicate = draftSettings.messageTemplates.some(
            t => t.title.toLowerCase() === templateTitle.trim().toLowerCase() && t.id !== editingTemplate?.id
        );
        if (isDuplicate) {
            addToast('A template with this title already exists.', 'error');
            return;
        }

        if (editingTemplate) {
            const updatedTemplates = draftSettings.messageTemplates.map(t =>
                t.id === editingTemplate.id ? { ...t, title: templateTitle.trim(), content: templateContent.trim() } : t
            );
            handleSettingsChange('messageTemplates', updatedTemplates);
        } else {
            const newTemplate: MessageTemplate = {
                id: `mt-${Date.now()}`,
                title: templateTitle.trim(),
                content: templateContent.trim(),
            };
            handleSettingsChange('messageTemplates', [...draftSettings.messageTemplates, newTemplate]);
        }
        setIsTemplateModalOpen(false);
    };

    const handleDeleteTemplateClick = (template: MessageTemplate) => {
        setTemplateToDelete(template);
        setIsConfirmDeleteTemplateOpen(true);
    };

    const handleDeleteTemplateConfirm = () => {
        if (!templateToDelete) return;
        const updatedTemplates = draftSettings.messageTemplates.filter(t => t.id !== templateToDelete.id);
        handleSettingsChange('messageTemplates', updatedTemplates);
        setIsConfirmDeleteTemplateOpen(false);
        setTemplateToDelete(null);
    };
    
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed";
    const TabButton: React.FC<{ tabName: TabName; label: string }> = ({ tabName, label }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tabName ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Platform Settings</h1>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-2">
                <div className="flex flex-wrap gap-2">
                    <TabButton tabName="general" label="General" />
                    <TabButton tabName="financial" label="Financial" />
                    <TabButton tabName="alerts" label="Alerts & Sessions" />
                    <TabButton tabName="ai" label="AI Configuration" />
                    <TabButton tabName="categories" label="Program Categories" />
                    <TabButton tabName="assetTypes" label="Asset Types" />
                    <TabButton tabName="templates" label="Message Templates" />
                </div>
            </div>

            {activeTab === 'general' && (
                <SettingsCard icon={BuildingOfficeIcon} title="General Company Settings" tabName="general" editingTab={editingTab} onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="companyName" className={labelClasses}>Company Name</label>
                            <input type="text" name="companyName" id="companyName" value={draftSettings.companyName} onChange={(e) => handleSettingsChange('companyName', e.target.value)} disabled={editingTab !== 'general'} className={inputClasses}/>
                        </div>
                        <div>
                            <label htmlFor="companyEmail" className={labelClasses}>Company Email</label>
                            <input type="email" name="companyEmail" id="companyEmail" value={draftSettings.companyEmail} onChange={(e) => handleSettingsChange('companyEmail', e.target.value)} disabled={editingTab !== 'general'} className={inputClasses}/>
                        </div>
                         <div>
                            <label className={labelClasses}>Company Logo</label>
                            <div className="mt-1 flex items-center space-x-4">
                                {draftSettings.companyLogoUrl ? (<img src={draftSettings.companyLogoUrl} alt="Company Logo" className="h-12 w-auto bg-gray-100 dark:bg-gray-700 p-1 rounded" />) : (<div className="h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">No Logo</div>)}
                                <input type="file" ref={logoInputRef} onChange={handleLogoFileChange} accept="image/*" className="hidden"/>
                                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={editingTab !== 'general'} className="flex items-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-md text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                                    <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                                    Change Logo
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className={labelClasses}>Mascot Enabled</label>
                             <div className="mt-2"><ToggleSwitch enabled={draftSettings.mascotEnabled} onChange={(val) => handleSettingsChange('mascotEnabled', val)} name="mascotEnabled" disabled={editingTab !== 'general'}/></div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <label className={labelClasses}>Company Phone Numbers</label>
                            <div className="mt-2 space-y-2">
                                {draftSettings.companyPhoneNumbers.map((phone, index) => (
                                <div key={phone.id} className="flex items-center space-x-2">
                                    <select value={phone.code} onChange={(e) => handlePhoneNumberChange(phone.id, 'code', e.target.value)} disabled={editingTab !== 'general'} className="block w-auto pl-3 pr-8 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100">
                                        {countryCodes.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                                    </select>
                                    <input type="tel" value={phone.number} onChange={(e) => handlePhoneNumberChange(phone.id, 'number', e.target.value)} disabled={editingTab !== 'general'} className="flex-1 min-w-0 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-100"/>
                                    {editingTab === 'general' && <button type="button" onClick={() => handleRemovePhoneNumber(phone.id)} disabled={draftSettings.companyPhoneNumbers.length <= 1} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:opacity-50"><TrashIcon className="h-5 w-5"/></button>}
                                </div>
                                ))}
                                {editingTab === 'general' && <button type="button" onClick={handleAddPhoneNumber} className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 mt-2"><PlusIcon className="h-4 w-4 mr-1"/> Add Number</button>}
                            </div>
                        </div>
                    </div>
                </SettingsCard>
            )}

            {activeTab === 'financial' && (
                 <SettingsCard icon={BanknotesIcon} title="Financial Settings" tabName="financial" editingTab={editingTab} onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="primaryCurrency" className={labelClasses}>Primary Currency</label>
                            <select name="primaryCurrency" id="primaryCurrency" value={draftSettings.primaryCurrency} onChange={(e) => handleSettingsChange('primaryCurrency', e.target.value)} disabled={editingTab !== 'financial'} className={inputClasses}>
                                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </SettingsCard>
            )}
            {activeTab === 'alerts' && (
                 <SettingsCard icon={BellAlertIcon} title="Alerts & Session Settings" tabName="alerts" editingTab={editingTab} onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Parent Low Credit Alert */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-gray-800 dark:text-white">Parent Low Credit Alert</h4>
                                <ToggleSwitch enabled={draftSettings.parentLowCreditAlerts.enabled} onChange={(val) => handleSettingsChange('parentLowCreditAlerts.enabled', val)} name="parentLowCreditAlertsEnabled" disabled={editingTab !== 'alerts'}/>
                            </div>
                            <div className="mt-2"><label htmlFor="parentLowCreditThreshold" className="text-xs text-gray-500 dark:text-gray-400">Threshold</label><input type="number" id="parentLowCreditThreshold" value={draftSettings.parentLowCreditAlerts.threshold} onChange={(e) => handleSettingsChange('parentLowCreditAlerts.threshold', parseInt(e.target.value, 10))} disabled={editingTab !== 'alerts' || !draftSettings.parentLowCreditAlerts.enabled} className={`${inputClasses} text-sm`}/></div>
                        </div>
                        {/* Sales Low Credit Alert */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                             <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-gray-800 dark:text-white">Sales Low Credit Alert</h4>
                                <ToggleSwitch enabled={draftSettings.salesLowCreditAlerts.enabled} onChange={(val) => handleSettingsChange('salesLowCreditAlerts.enabled', val)} name="salesLowCreditAlertsEnabled" disabled={editingTab !== 'alerts'}/>
                            </div>
                            <div className="mt-2"><label htmlFor="salesLowCreditThreshold" className="text-xs text-gray-500 dark:text-gray-400">Threshold</label><input type="number" id="salesLowCreditThreshold" value={draftSettings.salesLowCreditAlerts.threshold} onChange={(e) => handleSettingsChange('salesLowCreditAlerts.threshold', parseInt(e.target.value, 10))} disabled={editingTab !== 'alerts' || !draftSettings.salesLowCreditAlerts.enabled} className={`${inputClasses} text-sm`}/></div>
                        </div>
                         {/* Session Join Window */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 col-span-1 md:col-span-2">
                             <h4 className="font-semibold text-gray-800 dark:text-white">Session Join Window</h4>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Define how early/late users can join a session from its start time.</p>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div><label htmlFor="joinBufferMinutesBefore" className="text-xs text-gray-500 dark:text-gray-400">Join Before (minutes)</label><input type="number" id="joinBufferMinutesBefore" value={draftSettings.sessionJoinWindow.joinBufferMinutesBefore} onChange={(e) => handleSettingsChange('sessionJoinWindow.joinBufferMinutesBefore', parseInt(e.target.value, 10))} disabled={editingTab !== 'alerts'} className={`${inputClasses} text-sm`}/></div>
                                <div><label htmlFor="joinBufferMinutesAfter" className="text-xs text-gray-500 dark:text-gray-400">Join After (minutes)</label><input type="number" id="joinBufferMinutesAfter" value={draftSettings.sessionJoinWindow.joinBufferMinutesAfter} onChange={(e) => handleSettingsChange('sessionJoinWindow.joinBufferMinutesAfter', parseInt(e.target.value, 10))} disabled={editingTab !== 'alerts'} className={`${inputClasses} text-sm`}/></div>
                            </div>
                        </div>
                     </div>
                 </SettingsCard>
            )}
             {activeTab === 'ai' && (
                 <SettingsCard icon={SparklesIcon} title="AI Configuration" tabName="ai" editingTab={editingTab} onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Global AI */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 col-span-1 md:col-span-2">
                             <div className="flex justify-between items-center"><h4 className="font-semibold text-gray-800 dark:text-white">Enable AI Features</h4><ToggleSwitch enabled={draftSettings.aiProvider.enabled} onChange={(val) => handleSettingsChange('aiProvider.enabled', val)} name="aiProviderEnabled" disabled={editingTab !== 'ai'}/></div>
                        </div>
                        {/* Provider Settings */}
                        <div>
                            <label htmlFor="aiProvider" className={labelClasses}>AI Provider</label>
                            <select name="aiProvider" id="aiProvider" value={draftSettings.aiProvider.provider} onChange={(e) => handleSettingsChange('aiProvider.provider', e.target.value)} disabled={editingTab !== 'ai' || !draftSettings.aiProvider.enabled} className={inputClasses}>
                                <option value="gemini">Google Gemini</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aiModel" className={labelClasses}>Model</label>
                            <select name="aiModel" id="aiModel" value={draftSettings.aiProvider.model} onChange={(e) => handleSettingsChange('aiProvider.model', e.target.value)} disabled={editingTab !== 'ai' || !draftSettings.aiProvider.enabled} className={inputClasses}>
                                 {aiModels.gemini.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                             <p className="text-sm text-gray-500 dark:text-gray-400">The API Key is managed via secure environment variables on the server and is not configurable here.</p>
                        </div>
                        {/* Feature Toggles */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"><div className="flex justify-between items-center"><h4 className="font-semibold text-gray-800 dark:text-white">AI Daily Briefing</h4><ToggleSwitch enabled={draftSettings.aiBriefing.enabled} onChange={(val) => handleSettingsChange('aiBriefing.enabled', val)} name="aiBriefingEnabled" disabled={editingTab !== 'ai' || !draftSettings.aiProvider.enabled}/></div></div>
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"><div className="flex justify-between items-center"><h4 className="font-semibold text-gray-800 dark:text-white">AI Assistant Chat</h4><ToggleSwitch enabled={draftSettings.aiChat.enabled} onChange={(val) => handleSettingsChange('aiChat.enabled', val)} name="aiChatEnabled" disabled={editingTab !== 'ai' || !draftSettings.aiProvider.enabled}/></div></div>
                    </div>
                </SettingsCard>
            )}
            {activeTab === 'categories' && (
                <SettingsCard icon={ClipboardListIcon} title="Program Categories" tabName="categories" editingTab={editingTab} onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage the categories used to organize your programs. Deleting a category will mark associated programs as 'Uncategorized'.
                        </p>
                        <div className="space-y-2">
                            {draftSettings.programCategories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{cat.name}</span>
                                    {editingTab === 'categories' && (
                                        <div className="flex items-center space-x-3">
                                            <button type="button" onClick={() => handleOpenCategoryModal(cat)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="h-5 w-5" /></button>
                                            <button type="button" onClick={() => handleDeleteCategoryClick(cat)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {editingTab === 'categories' && (
                            <button type="button" onClick={() => handleOpenCategoryModal(null)} className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 mt-2">
                                <PlusIcon className="h-4 w-4 mr-1"/> Add Category
                            </button>
                        )}
                    </div>
                </SettingsCard>
            )}
             {activeTab === 'assetTypes' && (
                <SettingsCard icon={ClipboardListIcon} title="Asset Types" tabName="assetTypes" editingTab={editingTab} onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}>
                   <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage the types used to classify your assets (e.g., Software License, Meeting Account).
                        </p>
                        <div className="space-y-2">
                            {draftSettings.assetTypes.map(at => (
                                <div key={at.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{at.name}</span>
                                    {editingTab === 'assetTypes' && (
                                        <div className="flex items-center space-x-3">
                                            <button type="button" onClick={() => handleOpenAssetTypeModal(at)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="h-5 w-5" /></button>
                                            <button type="button" onClick={() => handleDeleteAssetTypeClick(at)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {editingTab === 'assetTypes' && (
                            <button type="button" onClick={() => handleOpenAssetTypeModal(null)} className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 mt-2">
                                <PlusIcon className="h-4 w-4 mr-1"/> Add Asset Type
                            </button>
                        )}
                    </div>
                </SettingsCard>
            )}
            {activeTab === 'templates' && (
                 <SettingsCard icon={PencilSquareIcon} title="Message Templates" tabName="templates" editingTab={editingTab} onEdit={handleEdit} onSave={handleSave} onCancel={handleCancel}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Create and manage reusable message templates for announcements and automated alerts.
                        </p>
                        <div className="space-y-3">
                            {draftSettings.messageTemplates.map(template => (
                                <div key={template.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{template.title}</span>
                                        {editingTab === 'templates' && (
                                            <div className="flex items-center space-x-3">
                                                <button type="button" onClick={() => handleOpenTemplateModal(template)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="h-5 w-5" /></button>
                                                <button type="button" onClick={() => handleDeleteTemplateClick(template)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5" /></button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{template.content}</p>
                                </div>
                            ))}
                        </div>
                        {editingTab === 'templates' && (
                            <button type="button" onClick={() => handleOpenTemplateModal(null)} className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 mt-2">
                                <PlusIcon className="h-4 w-4 mr-1"/> Add Template
                            </button>
                        )}
                    </div>
                 </SettingsCard>
            )}

            {/* Modals */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}>
                            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{editingCategory ? 'Edit' : 'Add'} Category</h3>
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XIcon className="h-5 w-5"/></button>
                            </div>
                            <div className="p-6">
                                <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category Name</label>
                                <input type="text" id="categoryName" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required className={inputClasses} />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmationModal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} onConfirm={handleDeleteCategoryConfirm} title="Delete Category" message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}/>

            {isAssetTypeModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveAssetType(); }}>
                            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{editingAssetType ? 'Edit' : 'Add'} Asset Type</h3>
                                <button type="button" onClick={() => setIsAssetTypeModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XIcon className="h-5 w-5"/></button>
                            </div>
                            <div className="p-6">
                                <label htmlFor="assetTypeName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type Name</label>
                                <input type="text" id="assetTypeName" value={assetTypeName} onChange={(e) => setAssetTypeName(e.target.value)} required className={inputClasses} />
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsAssetTypeModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmationModal isOpen={isConfirmDeleteAssetTypeOpen} onClose={() => setIsConfirmDeleteAssetTypeOpen(false)} onConfirm={handleDeleteAssetTypeConfirm} title="Delete Asset Type" message={`Are you sure you want to delete the asset type "${assetTypeToDelete?.name}"? This action cannot be undone.`}/>

            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveTemplate(); }}>
                            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{editingTemplate ? 'Edit' : 'Add'} Message Template</h3>
                                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><XIcon className="h-5 w-5"/></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label htmlFor="templateTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Title</label>
                                    <input type="text" id="templateTitle" value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} required className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="templateContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Content</label>
                                    <textarea id="templateContent" value={templateContent} onChange={(e) => setTemplateContent(e.target.value)} required rows={6} className={inputClasses}></textarea>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmationModal isOpen={isConfirmDeleteTemplateOpen} onClose={() => setIsConfirmDeleteTemplateOpen(false)} onConfirm={handleDeleteTemplateConfirm} title="Delete Template" message={`Are you sure you want to delete the template "${templateToDelete?.title}"?`}/>

        </div>
    );
};

export default SettingsPage;