import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Program, CurriculumItem, CurriculumStatus, AssignmentTemplate, ResourceLink } from '../../types';
import { PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon, LinkIcon, DocumentTextIcon, DocumentDownloadIcon, ArrowUpTrayIcon, DotsVerticalIcon, SelectorIcon, BookOpenIcon } from '../../components/icons/Icons';
import CurriculumItemFormModal from '../../components/CurriculumItemFormModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import ResourceLinkFormModal from '../../components/ResourceLinkFormModal';
import AssignmentTemplateFormModal from '../../components/AssignmentTemplateFormModal';
import { useToast } from '../../contexts/ToastContext';
// FIX: Update imports from `mockData` to the correct API file.
import { getPrograms, savePrograms } from '../../api/programApi';
import { useOutsideClick } from '../../hooks/useOutsideClick';

const CurriculumBuilderPage: React.FC = () => {
    const { programId } = useParams<{ programId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    // FIX: Fetch data asynchronously using `useState` and `useEffect`.
    const [programs, setPrograms] = useState<Program[]>([]);
    const program = useMemo(() => programs.find(p => p.id === programId), [programs, programId]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CurriculumItem | null>(null);
    const [itemToCreate, setItemToCreate] = useState<{ type: 'Chapter' | 'Topic' | 'Sub-Topic'; parentId?: string; } | null>(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [contentToDelete, setContentToDelete] = useState<{type: 'studentResource' | 'teacherResource' | 'assignment', id: string} | null>(null);

    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<ResourceLink | null>(null);
    const [resourceType, setResourceType] = useState<'student' | 'teacher' | null>(null);

    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<AssignmentTemplate | null>(null);
    
    const [currentItemForContent, setCurrentItemForContent] = useState<CurriculumItem | null>(null);
    
    const [csvDataToImport, setCsvDataToImport] = useState<CurriculumItem[] | null>(null);

    const [draggedItem, setDraggedItem] = useState<{ id: string, parentId?: string } | null>(null);
    const [dragOverItem, setDragOverItem] = useState<{ id: string, parentId?: string } | null>(null);

    // FIX: Fetch data asynchronously.
    useEffect(() => {
        getPrograms().then(setPrograms);
    }, []);

    useEffect(() => {
        if (!currentItemForContent && program?.structure && program.structure.length > 0) {
            setCurrentItemForContent(program.structure[0]);
        }
    }, [program, currentItemForContent]);
    
    const findItemById = (items: CurriculumItem[], id: string): CurriculumItem | null => {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = findItemById(item.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const updateProgramStructure = async (newStructure: CurriculumItem[]) => {
        if (program) {
            const newPrograms = programs.map(p => 
                p.id === program.id ? { ...p, structure: newStructure } : p
            );
            setPrograms(newPrograms);
            await savePrograms(newPrograms);
        }
    };

    const findAndModifyItem = (items: CurriculumItem[], action: (item: CurriculumItem) => CurriculumItem | null): CurriculumItem[] => {
        return items.reduce((acc: CurriculumItem[], item) => {
            const result = action(item);
            if (result === null) return acc; // Delete case
            
            const newItem = { ...result };
            if (newItem.children) {
                newItem.children = findAndModifyItem(newItem.children, action);
            }
            acc.push(newItem);
            return acc;
        }, []);
    };
    
    const handleSaveItem = (itemData: { title: string }) => {
        if (!program) return;
        const structure = program.structure || [];
        let savedItemId: string | null = null;
        let newStructure: CurriculumItem[];

        if (editingItem) { // Editing
            savedItemId = editingItem.id;
            newStructure = findAndModifyItem(structure, item => item.id === editingItem.id ? { ...item, ...itemData } : item);
            addToast('Item updated successfully!');
        } else if (itemToCreate) { // Creating
            const newItem: CurriculumItem = { id: Date.now().toString(), ...itemData, type: itemToCreate.type, status: CurriculumStatus.LOCKED, children: [], studentResources: [], teacherResources: [], assignments: [] };
            savedItemId = newItem.id;
            if (!itemToCreate.parentId) { // New Chapter
                newStructure = [...structure, newItem];
            } else { // New Topic or Sub-Topic
                newStructure = findAndModifyItem(structure, item => {
                    if (item.id === itemToCreate.parentId) {
                        return { ...item, children: [...(item.children || []), newItem] };
                    }
                    return item;
                });
            }
            addToast('Item created successfully!');
        } else {
            return;
        }

        updateProgramStructure(newStructure);
        if (savedItemId) {
            const updatedItem = findItemById(newStructure, savedItemId);
            if (updatedItem) setCurrentItemForContent(updatedItem);
        }
        closeItemModal();
    };

    const handleDeleteClick = (itemId: string) => {
        setItemToDelete(itemId);
        setIsConfirmOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (contentToDelete) {
            handleDeleteContent(contentToDelete.type, contentToDelete.id);
            setContentToDelete(null);
        } else if (itemToDelete) {
            if (!program) return;
            const newStructure = findAndModifyItem(program.structure || [], item => item.id === itemToDelete ? null : item);
            updateProgramStructure(newStructure);
            if (currentItemForContent?.id === itemToDelete) {
                setCurrentItemForContent(null);
            }
            addToast('Item deleted successfully.');
            setItemToDelete(null);
        }
        setIsConfirmOpen(false);
    };

    const openItemModalForCreate = (type: 'Chapter' | 'Topic' | 'Sub-Topic', parentId?: string) => {
        setItemToCreate({ type, parentId });
        setEditingItem(null);
        setIsItemModalOpen(true);
    };

    const openItemModalForEdit = (item: CurriculumItem) => {
        setEditingItem(item);
        setItemToCreate(null);
        setIsItemModalOpen(true);
    };

    const closeItemModal = () => {
        setIsItemModalOpen(false);
        setEditingItem(null);
        setItemToCreate(null);
    };

    const openResourceModal = (type: 'student' | 'teacher', resource: ResourceLink | null = null) => {
        setResourceType(type);
        setEditingResource(resource);
        setIsResourceModalOpen(true);
    };

    const handleSaveResource = (data: ResourceLink) => {
        if (!program || !currentItemForContent || !resourceType) return;
        const key = resourceType === 'student' ? 'studentResources' : 'teacherResources';
        
        const newStructure = findAndModifyItem(program.structure || [], item => {
            if (item.id === currentItemForContent.id) {
                const contentArray = item[key] || [];
                const isEditing = !!editingResource;
                const newContent = isEditing
                    ? contentArray.map(c => c.id === data.id ? data : c)
                    : [...contentArray, { ...data, id: Date.now().toString() }];
                return { ...item, [key]: newContent };
            }
            return item;
        });
        
        updateProgramStructure(newStructure);
        const updatedCurrentItem = findItemById(newStructure, currentItemForContent.id);
        if (updatedCurrentItem) setCurrentItemForContent(updatedCurrentItem);
        
        addToast('Resource saved.');
        setIsResourceModalOpen(false);
        setEditingResource(null);
        setResourceType(null);
    };

    const handleSaveAssignment = (data: AssignmentTemplate) => {
        if (!program || !currentItemForContent) return;
        const key = 'assignments';
        
        const newStructure = findAndModifyItem(program.structure || [], item => {
            if (item.id === currentItemForContent.id) {
                const contentArray = item[key] || [];
                const isEditing = !!editingAssignment;
                const newContent = isEditing
                    ? contentArray.map(c => c.id === data.id ? data : c)
                    : [...contentArray, { ...data, id: Date.now().toString() }];
                return { ...item, [key]: newContent };
            }
            return item;
        });
        
        updateProgramStructure(newStructure);
        const updatedCurrentItem = findItemById(newStructure, currentItemForContent.id);
        if (updatedCurrentItem) setCurrentItemForContent(updatedCurrentItem);
        
        addToast('Assignment saved.');
        setIsAssignmentModalOpen(false);
        setEditingAssignment(null);
    };

    const handleDeleteContent = (type: 'studentResource' | 'teacherResource' | 'assignment', contentId: string) => {
        if (!program || !currentItemForContent) return;
        const key = type === 'studentResource' ? 'studentResources' : type === 'teacherResource' ? 'teacherResources' : 'assignments';

        const newStructure = findAndModifyItem(program.structure || [], item => {
            if (item.id === currentItemForContent.id) {
                const contentArray = (item[key as keyof CurriculumItem] as any[] || []).filter(c => c.id !== contentId);
                return { ...item, [key]: contentArray };
            }
            return item;
        });

        updateProgramStructure(newStructure);
        const updatedCurrentItem = findItemById(newStructure, currentItemForContent.id);
        if (updatedCurrentItem) setCurrentItemForContent(updatedCurrentItem);
        addToast(`${type.replace('Resource', ' resource')} removed.`);
    };

    const handleDragStart = (e: React.DragEvent, id: string, parentId?: string) => { /* ... */ };
    const handleDragEnter = (e: React.DragEvent, id: string, parentId?: string) => { /* ... */ };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDragLeave = () => setDragOverItem(null);
    const handleDragEnd = () => { /* ... */ };
    const handleDrop = (e: React.DragEvent, dropTargetId: string, parentId?: string) => { /* ... */ };

    // --- CSV Helper Functions ---
    const escapeCSV = (field: any) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const flattenStructureForExport = (items: CurriculumItem[]): any[] => {
        let flatList: any[] = [];
        const processItem = (item: CurriculumItem, parentTitle: string | null) => {
            flatList.push({ id: item.id, parentTitle: parentTitle || '', record_type: item.type, title: item.title, url: '', instructions: '' });
            (item.studentResources || []).forEach(res => flatList.push({ id: res.id, parentTitle: item.title, record_type: 'StudentResource', title: res.title, url: res.url, instructions: '' }));
            (item.teacherResources || []).forEach(res => flatList.push({ id: res.id, parentTitle: item.title, record_type: 'TeacherResource', title: res.title, url: res.url, instructions: '' }));
            (item.assignments || []).forEach(assign => flatList.push({ id: assign.id, parentTitle: item.title, record_type: 'Assignment', title: assign.title, url: assign.url, instructions: assign.instructions || '' }));
            if (item.children) {
                item.children.forEach(child => processItem(child, item.title));
            }
        };
        items.forEach(item => processItem(item, null));
        return flatList;
    };

    const parseCsv = (csvText: string): Record<string, any>[] => {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const csvRegex = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(?:\s*,\s*|\s*$)/g;

        return lines.slice(1).map(line => {
            if (!line.trim()) return null;

            const values = [];
            let match;
            csvRegex.lastIndex = 0;
            while ((match = csvRegex.exec(line)) && match[0] !== '') {
                const value = match[1] !== undefined 
                    ? match[1].replace(/""/g, '"')
                    : match[2];
                values.push(value);
            }
            
            const obj: Record<string, any> = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] ?? '';
            });
            return obj;
        }).filter((item): item is Record<string, any> => item !== null);
    };
    
    const buildTreeFromFlatData = (flatData: any[]): CurriculumItem[] => {
        const idToItemMap = new Map<string, CurriculumItem>();
        const titleToItemMap = new Map<string, CurriculumItem>();
        const newStructure: CurriculumItem[] = [];

        // First pass: create all curriculum items and map them by ID (if provided) and Title
        flatData.forEach((itemData, i) => {
            const type = itemData.record_type;
            if (type === 'Chapter' || type === 'Topic' || type === 'Sub-Topic') {
                const id = itemData.id || `item-${Date.now()}-${i}`;
                if(!itemData.title) {
                    addToast(`Skipping row with missing title.`, 'info');
                    return;
                }
                const newItem: CurriculumItem = {
                    id: id,
                    title: itemData.title,
                    type: type,
                    status: CurriculumStatus.LOCKED,
                    children: [], studentResources: [], teacherResources: [], assignments: [],
                };
                idToItemMap.set(id, newItem);
                titleToItemMap.set(itemData.title, newItem);
            }
        });

        // Second pass: link children and attach resources/assignments
        flatData.forEach(itemData => {
            const type = itemData.record_type;
            const parentTitle = itemData.parentTitle;
            const parentItem = parentTitle ? titleToItemMap.get(parentTitle) : null;

            if (type === 'Chapter' || type === 'Topic' || type === 'Sub-Topic') {
                const currentItem = titleToItemMap.get(itemData.title);
                if (currentItem) {
                    if (parentItem) {
                        parentItem.children?.push(currentItem);
                    } else if (currentItem.type === 'Chapter') {
                        newStructure.push(currentItem);
                    }
                }
            } else if (parentItem) {
                const id = itemData.id || `content-${Date.now()}-${Math.random()}`;
                if (type === 'StudentResource') parentItem.studentResources?.push({ id, title: itemData.title, url: itemData.url });
                else if (type === 'TeacherResource') parentItem.teacherResources?.push({ id, title: itemData.title, url: itemData.url });
                else if (type === 'Assignment') parentItem.assignments?.push({ id, title: itemData.title, url: itemData.url, instructions: itemData.instructions });
            }
        });

        return newStructure;
    };

    const handleDownloadCSV = () => {
        if (!program?.structure || program.structure.length === 0) {
            addToast('No curriculum to export.', 'info');
            return;
        }
        const flatData = flattenStructureForExport(program.structure);
        const headers = ['id', 'parentTitle', 'record_type', 'title', 'url', 'instructions'];
        
        const csvRows = flatData.map(row => headers.map(header => escapeCSV(row[header])).join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${program.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_curriculum.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('Curriculum exported successfully!');
    };
    
    const handleDownloadTemplate = () => {
        const headers = ['id', 'parentTitle', 'record_type', 'title', 'url', 'instructions'];
        
        const exampleRows = [
            { id: '', parentTitle: '', record_type: 'Chapter', title: 'Chapter 1: Getting Started', url: '', instructions: '' },
            { id: '', parentTitle: 'Chapter 1: Getting Started', record_type: 'Topic', title: 'Topic 1.1: First Steps', url: '', instructions: '' },
            { id: '', parentTitle: 'Topic 1.1: First Steps', record_type: 'StudentResource', title: 'Intro Video', url: 'https://example.com/video1', instructions: '' },
            { id: '', parentTitle: 'Topic 1.1: First Steps', record_type: 'TeacherResource', title: 'Teacher Notes for 1.1', url: 'https://example.com/notes1', instructions: '' },
            { id: '', parentTitle: 'Topic 1.1: First Steps', record_type: 'Sub-Topic', title: 'Sub-Topic 1.1.1: Your First Assignment', url: '', instructions: '' },
            { id: '', parentTitle: 'Sub-Topic 1.1.1: Your First Assignment', record_type: 'Assignment', title: 'Worksheet 1', url: 'https://example.com/worksheet1.pdf', instructions: 'Complete all questions.' },
            { id: '', parentTitle: 'Chapter 1: Getting Started', record_type: 'Topic', title: 'Topic 1.2: Advanced Concepts', url: '', instructions: '' },
            { id: '', parentTitle: '', record_type: 'Chapter', title: 'Chapter 2: Moving Forward', url: '', instructions: '' },
        ];

        const csvRows = exampleRows.map(row => headers.map(header => escapeCSV(row[header as keyof typeof row])).join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `curriculum_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('Curriculum template downloaded!');
    };

    const handleUploadCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const parsedData = parseCsv(text);
                const newStructure = buildTreeFromFlatData(parsedData);
                setCsvDataToImport(newStructure);
            } catch (error) {
                addToast('Failed to process CSV file. Please check the format.', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    };

    const handleImportConfirm = () => {
        if (csvDataToImport) {
            updateProgramStructure(csvDataToImport);
            addToast('Curriculum imported successfully, overwriting previous structure.');
        }
        setCsvDataToImport(null);
    };

    if (!program) return <div className="text-center p-8">Program not found.</div>;
    
    const ResourceSection: React.FC<{title: string; resources: ResourceLink[] | undefined; onAdd: () => void; onEdit: (res: ResourceLink) => void; onDelete: (id: string) => void;}> = ({ title, resources, onAdd, onEdit, onDelete }) => (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-600 dark:text-gray-300 flex items-center"><LinkIcon className="h-5 w-5 mr-2" />{title}</h4>
                <button onClick={onAdd} className="btn-secondary-sm">Add</button>
            </div>
            <div className="p-2 border dark:border-gray-700 rounded-md space-y-2 min-h-[4rem]">
                {resources && resources.length > 0 ? (
                    resources.map(res => (
                        <div key={res.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate" title={res.url}>{res.title}</a>
                            <div className="flex space-x-2 flex-shrink-0 ml-2">
                                <button onClick={() => onEdit(res)}><PencilIcon className="h-4 w-4 text-gray-500 hover:text-indigo-500" /></button>
                                <button onClick={() => { setContentToDelete({ type: title.includes('Student') ? 'studentResource' : 'teacherResource', id: res.id}); setIsConfirmOpen(true); }}><TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-500" /></button>
                            </div>
                        </div>
                    ))
                ) : <p className="text-xs text-gray-400 italic px-2">No resources for this item.</p>}
            </div>
        </div>
    );
    
    const AssignmentSection: React.FC<{assignments: AssignmentTemplate[] | undefined; onAdd: () => void; onEdit: (ass: AssignmentTemplate) => void; onDelete: (id: string) => void;}> = ({ assignments, onAdd, onEdit, onDelete }) => (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-600 dark:text-gray-300 flex items-center"><DocumentTextIcon className="h-5 w-5 mr-2" />Assignments</h4>
                <button onClick={onAdd} className="btn-secondary-sm">Add</button>
            </div>
             <div className="p-2 border dark:border-gray-700 rounded-md space-y-2 min-h-[4rem]">
                {assignments && assignments.length > 0 ? (
                    assignments.map(ass => (
                         <div key={ass.id} className="text-sm p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold text-gray-800 dark:text-white">{ass.title}</p>
                                <div className="flex space-x-2 flex-shrink-0 ml-2">
                                    <button onClick={() => onEdit(ass)}><PencilIcon className="h-4 w-4 text-gray-500 hover:text-indigo-500" /></button>
                                    <button onClick={() => { setContentToDelete({ type: 'assignment', id: ass.id}); setIsConfirmOpen(true); }}><TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-500" /></button>
                                </div>
                            </div>
                            <p className="text-xs text-blue-500 hover:underline cursor-pointer truncate" title={ass.url} onClick={() => window.open(ass.url, '_blank')}>{ass.url}</p>
                            {ass.instructions && <blockquote className="mt-2 text-xs border-l-2 border-gray-300 pl-2 italic text-gray-600 dark:text-gray-300">{ass.instructions}</blockquote>}
                        </div>
                    ))
                ) : <p className="text-xs text-gray-400 italic px-2">No assignments for this item.</p>}
            </div>
        </div>
    );

    const ContentPane: React.FC = () => {
        if (!currentItemForContent) {
            return (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center justify-center h-full min-h-[300px]">
                    <BookOpenIcon className="h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Select an Item</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose a chapter or topic from the left to manage its content.</p>
                </div>
            );
        }
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-6 sticky top-6">
                <div>
                    <p className="text-sm font-semibold text-primary-500">{currentItemForContent.type}</p>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{currentItemForContent.title}</h2>
                </div>
                <ResourceSection 
                    title="Student Resources" 
                    resources={currentItemForContent.studentResources} 
                    onAdd={() => openResourceModal('student')} 
                    onEdit={(res) => openResourceModal('student', res)} 
                    onDelete={(id) => handleDeleteContent('studentResource', id)} 
                />
                <ResourceSection 
                    title="Teacher Resources" 
                    resources={currentItemForContent.teacherResources} 
                    onAdd={() => openResourceModal('teacher')} 
                    onEdit={(res) => openResourceModal('teacher', res)} 
                    onDelete={(id) => handleDeleteContent('teacherResource', id)} 
                />
                <AssignmentSection 
                    assignments={currentItemForContent.assignments}
                    onAdd={() => { setEditingAssignment(null); setIsAssignmentModalOpen(true); }}
                    onEdit={(ass) => { setEditingAssignment(ass); setIsAssignmentModalOpen(true); }}
                    onDelete={(id) => handleDeleteContent('assignment', id)}
                />
            </div>
        );
    }
    
    const CurriculumNode: React.FC<{ item: CurriculumItem, parentId?: string, level: number }> = ({ item, parentId, level }) => {
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const menuRef = useOutsideClick(() => setIsMenuOpen(false));
        const canHaveChildren = item.type !== 'Sub-Topic';
        const childType: 'Topic' | 'Sub-Topic' = item.type === 'Chapter' ? 'Topic' : 'Sub-Topic';

        return (
            <div className="relative" style={{ paddingLeft: `${level * 1}rem` }}>
                <div 
                    onClick={() => setCurrentItemForContent(item)}
                    className={`flex items-center space-x-2 p-2 rounded-lg border-l-4 cursor-pointer transition-colors ${currentItemForContent?.id === item.id ? 'bg-primary-50 dark:bg-primary-900/30' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    style={{ borderColor: currentItemForContent?.id === item.id ? 'rgb(var(--color-primary-500))' : 'transparent' }}
                >
                    <SelectorIcon className="h-5 w-5 text-gray-400 cursor-grab" />
                    <span className="font-semibold text-gray-800 dark:text-white flex-grow">{item.title}</span>
                    <div className="relative" ref={menuRef}>
                        <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <DotsVerticalIcon className="h-5 w-5 text-gray-500" />
                        </button>
                        {isMenuOpen && (
                            <div onClick={e => e.stopPropagation()} className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700">
                                {canHaveChildren && <button onClick={() => { openItemModalForCreate(childType, item.id); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusIcon className="h-4 w-4 mr-2" />Add {childType}</button>}
                                <button onClick={() => { openItemModalForEdit(item); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><PencilIcon className="h-4 w-4 mr-2" />Edit</button>
                                <button onClick={() => { handleDeleteClick(item.id); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"><TrashIcon className="h-4 w-4 mr-2" />Delete</button>
                            </div>
                        )}
                    </div>
                </div>
                {item.children && item.children.map(child => <CurriculumNode key={child.id} item={child} parentId={item.id} level={level + 1} />)}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                     <div>
                        <div className="flex items-center space-x-3">
                            <button onClick={() => navigate(`/admin/programs/${program.id}`)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Go back to program details">
                                <ArrowLeftIcon className="h-6 w-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Curriculum Builder</h1>
                                <p className="text-gray-500 dark:text-gray-400">{program.title}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 self-start md:self-center ml-11 md:ml-0">
                        <button className="btn-secondary" onClick={handleDownloadTemplate}>
                            <DocumentDownloadIcon className="h-5 w-5 mr-2" />
                            Download Template
                        </button>
                        <button className="btn-secondary" onClick={handleDownloadCSV}>
                            <DocumentDownloadIcon className="h-5 w-5 mr-2" />
                            Export Current
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleUploadCSV} accept=".csv" className="hidden" />
                        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                            Import
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md space-y-2 h-fit max-h-[70vh] overflow-y-auto">
                    {(program.structure || []).map(chapter => <CurriculumNode key={chapter.id} item={chapter} level={0} />)}
                    <button onClick={() => openItemModalForCreate('Chapter')} className="w-full flex items-center justify-center p-2 mt-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg">
                        <PlusIcon className="h-5 w-5 mr-1"/> Add Chapter
                    </button>
                </div>

                <div className="lg:col-span-7">
                    <ContentPane />
                </div>
            </div>

            <CurriculumItemFormModal isOpen={isItemModalOpen} onClose={closeItemModal} onSave={handleSaveItem} item={editingItem} itemType={itemToCreate?.type} />
            <ConfirmationModal 
                isOpen={isConfirmOpen} 
                onClose={() => setIsConfirmOpen(false)} 
                onConfirm={handleDeleteConfirm} 
                title="Delete Item" 
                message="Are you sure you want to delete this item and all its contents? This action cannot be undone." 
            />
            <ConfirmationModal 
                isOpen={!!csvDataToImport}
                onClose={() => setCsvDataToImport(null)}
                onConfirm={handleImportConfirm}
                title="Overwrite Curriculum?"
                message="Are you sure you want to import this CSV? This will replace the entire existing curriculum for this program. This action cannot be undone."
            />
            {currentItemForContent && <ResourceLinkFormModal isOpen={isResourceModalOpen} onClose={() => setIsResourceModalOpen(false)} onSave={handleSaveResource} link={editingResource} />}
            {currentItemForContent && <AssignmentTemplateFormModal isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)} onSave={handleSaveAssignment} template={editingAssignment} />}
            <style>{`.btn-secondary { @apply flex items-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600; } .btn-secondary-sm { @apply flex items-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-md text-xs font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600; }`}</style>
        </div>
    );
};
export default CurriculumBuilderPage;