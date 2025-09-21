import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Program, ProgramStatus } from '../../types';
import { SearchIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon, EyeIcon, ViewGridIcon, DotsVerticalIcon, UsersIcon, AcademicCapIcon, DocumentDuplicateIcon } from '../../components/icons/Icons';
import ProgramFormModal from '../../components/ProgramFormModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { getPrograms, savePrograms } from '../../api/programApi';
import { logAction } from '../../api/auditApi';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import SkeletonLoader from '../../components/SkeletonLoader';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';

type SortConfig = {
    key: keyof Program | 'categoryName';
    direction: 'ascending' | 'descending';
} | null;

const StatusBadge: React.FC<{ status: ProgramStatus }> = ({ status }) => {
    const statusColors: Record<ProgramStatus, string> = {
        [ProgramStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        [ProgramStatus.DRAFT]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        [ProgramStatus.ARCHIVED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>{status}</span>
};

const ProgramCard: React.FC<{
    program: Program & { categoryName?: string };
    onEdit: (program: Program) => void;
    onDelete: (program: Program) => void;
    onClone: (program: Program) => void;
    onManageCurriculum: (programId: string) => void;
}> = ({ program, onEdit, onDelete, onClone, onManageCurriculum }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useOutsideClick(() => setIsMenuOpen(false));

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };
    
    const statusBorderColors: Record<ProgramStatus, string> = {
        [ProgramStatus.ACTIVE]: 'border-t-4 border-green-500',
        [ProgramStatus.DRAFT]: 'border-t-4 border-yellow-500',
        [ProgramStatus.ARCHIVED]: 'border-t-4 border-gray-400',
    };

    return (
        <div 
            onClick={() => onManageCurriculum(program.id)}
            className={`group bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col cursor-pointer ${statusBorderColors[program.status]}`}
        >
            <div className="p-5 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={program.status} />
                        {program.categoryName && <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">{program.categoryName}</span>}
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button onClick={handleMenuToggle} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <DotsVerticalIcon className="h-5 w-5" />
                        </button>
                        {isMenuOpen && (
                            <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg z-10 border dark:border-gray-700"
                            >
                                <button onClick={() => { onEdit(program); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><PencilIcon className="h-4 w-4 mr-2" />Edit</button>
                                <button onClick={() => { onClone(program); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><DocumentDuplicateIcon className="h-4 w-4 mr-2" />Clone</button>
                                <button onClick={() => { onDelete(program); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"><TrashIcon className="h-4 w-4 mr-2" />Delete</button>
                            </div>
                        )}
                    </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{program.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{program.targetGradeLevel.join(', ')}</p>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 flex-grow">
                    {program.description}
                </p>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                 <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center"><UsersIcon className="h-5 w-5 mr-1.5" />{program.studentCount} Students</span>
                    <span className="flex items-center"><AcademicCapIcon className="h-5 w-5 mr-1.5" />{program.teacherCount} Teachers</span>
                 </div>
            </div>
        </div>
    );
};


const ProgramsPage: React.FC = () => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProgramStatus | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dateAdded', direction: 'descending'});
    const { addToast } = useToast();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { user: adminUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
    
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const programsPerPage = 9;

    const fetchPrograms = async () => {
        setIsLoading(true);
        const programsData = await getPrograms();
        setPrograms(programsData);
        setIsLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPrograms();
        }, 750);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, categoryFilter]);

    const updatePrograms = async (newPrograms: Program[]) => {
        setPrograms(newPrograms);
        await savePrograms(newPrograms);
    };

    const categoryMap = useMemo(() => new Map(settings.programCategories.map(c => [c.id, c.name])), [settings.programCategories]);

    const filteredPrograms = useMemo(() => {
        let filtered = programs.map(p => ({
            ...p,
            categoryName: p.categoryId ? categoryMap.get(p.categoryId) || 'Uncategorized' : 'Uncategorized',
        })).filter(program =>
            (program.title.toLowerCase().includes(searchTerm.toLowerCase()) || program.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'all' || program.status === statusFilter) &&
            (categoryFilter === 'all' || program.categoryId === categoryFilter)
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const key = sortConfig.key as keyof typeof a;
                if (a[key] < b[key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[key] > b[key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [programs, searchTerm, statusFilter, categoryFilter, sortConfig, categoryMap]);

    const totalPages = Math.ceil(filteredPrograms.length / programsPerPage);
    const paginatedPrograms = useMemo(() => {
        const startIndex = (currentPage - 1) * programsPerPage;
        return filteredPrograms.slice(startIndex, startIndex + programsPerPage);
    }, [filteredPrograms, currentPage, programsPerPage]);

    const requestSort = (key: keyof Program | 'categoryName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Program | 'categoryName') => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ChevronDownIcon className="h-4 w-4 opacity-30" />;
        }
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />;
    };
    
    const SortableHeader: React.FC<{ sortKey: keyof Program | 'categoryName'; children: React.ReactNode }> = ({ sortKey, children }) => (
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <span className="ml-1">{getSortIcon(sortKey)}</span>
            </div>
        </th>
    );

    const handleOpenModal = (program: Program | null = null) => {
        setEditingProgram(program);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProgram(null);
    };

    const handleSaveProgram = async (programToSave: Program) => {
        const isEditing = !!editingProgram;
        let newPrograms;
        if (isEditing && editingProgram) {
            const originalProgram = programs.find(p => p.id === editingProgram.id);
            newPrograms = programs.map(p => (p.id === programToSave.id ? programToSave : p));
            await logAction(adminUser, 'PROGRAM_UPDATED', 'Program', programToSave.id, { previousState: originalProgram, changes: programToSave });
        } else {
            newPrograms = [programToSave, ...programs];
            await logAction(adminUser, 'PROGRAM_CREATED', 'Program', programToSave.id, { program: programToSave });
        }
        await updatePrograms(newPrograms);
        addToast(`Program ${isEditing ? 'updated' : 'created'} successfully!`);
        handleCloseModal();
    };

    const handleDeleteClick = (program: Program) => {
        setProgramToDelete(program);
        setIsConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (programToDelete) {
            await updatePrograms(programs.filter(p => p.id !== programToDelete.id));
            addToast(`Program "${programToDelete.title}" deleted successfully.`);
            await logAction(adminUser, 'PROGRAM_DELETED', 'Program', programToDelete.id, { title: programToDelete.title });
        }
        setIsConfirmOpen(false);
        setProgramToDelete(null);
    };

    const handleCloneProgram = async (programToClone: Program) => {
        const newProgram: Program = {
            ...programToClone,
            id: `p-${Date.now()}`,
            title: `${programToClone.title} (Copy)`,
            status: ProgramStatus.DRAFT,
            studentCount: 0,
            teacherCount: 0,
            dateAdded: new Date().toISOString().split('T')[0],
            structure: programToClone.structure ? JSON.parse(JSON.stringify(programToClone.structure)) : [],
        };
        
        await updatePrograms([newProgram, ...programs]);
        addToast(`Program "${programToClone.title}" cloned successfully!`);
        await logAction(adminUser, 'PROGRAM_CLONED', 'Program', newProgram.id, { from: programToClone.id });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 mb-4">
                     <div className="w-full md:w-1/3">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search programs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                     <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Categories</option>
                            {settings.programCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ProgramStatus | 'all')}
                            className="text-sm bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 py-2 px-3"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(ProgramStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                         <div className="flex items-center rounded-lg border p-1 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                            <button title="Grid View" onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary-500 text-white shadow' : 'text-gray-500 hover:bg-white dark:hover:bg-gray-600'}`}>
                                <ViewGridIcon className="h-5 w-5" />
                            </button>
                            <button title="List View" onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary-500 text-white shadow' : 'text-gray-500 hover:bg-white dark:hover:bg-gray-600'}`}>
                                <EyeIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Add Program
                        </button>
                    </div>
                </div>
                {isLoading ? (
                    <SkeletonLoader type={viewMode === 'grid' ? 'program_grid' : 'table'} rows={9} />
                ) : filteredPrograms.length === 0 ? (
                    <EmptyState 
                        icon={AcademicCapIcon}
                        title="No programs found"
                        message="Try adjusting your search or filters, or add a new program to get started."
                        action={{ text: "Add Program", onClick: () => handleOpenModal() }}
                    />
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                                {paginatedPrograms.map(program => (
                                <ProgramCard 
                                        key={program.id}
                                        program={program}
                                        onEdit={handleOpenModal}
                                        onDelete={handleDeleteClick}
                                        onClone={handleCloneProgram}
                                        onManageCurriculum={(id) => navigate(`/admin/programs/${id}`)}
                                />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto mt-6">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <SortableHeader sortKey="title">Program</SortableHeader>
                                            <SortableHeader sortKey="categoryName">Category</SortableHeader>
                                            <SortableHeader sortKey="status">Status</SortableHeader>
                                            <SortableHeader sortKey="studentCount">Students</SortableHeader>
                                            <SortableHeader sortKey="teacherCount">Teachers</SortableHeader>
                                            <SortableHeader sortKey="dateAdded">Date Added</SortableHeader>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {paginatedPrograms.map(program => (
                                            <tr key={program.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{program.title}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{program.targetGradeLevel.join(', ')}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{program.categoryName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusBadge status={program.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{program.studentCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{program.teacherCount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{program.dateAdded}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center space-x-3">
                                                        <button onClick={() => navigate(`/admin/programs/${program.id}`)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" aria-label={`View Details for ${program.title}`}><EyeIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => handleOpenModal(program)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" aria-label={`Edit ${program.title}`}><PencilIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => handleCloneProgram(program)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200" aria-label={`Clone ${program.title}`}><DocumentDuplicateIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => handleDeleteClick(program)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" aria-label={`Delete ${program.title}`}><TrashIcon className="h-5 w-5"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {totalPages > 1 && (
                            <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                totalItems={filteredPrograms.length}
                                itemsPerPage={programsPerPage}
                            />
                        )}
                    </>
                )}
            </div>
             <ProgramFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveProgram}
                program={editingProgram}
            />
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Program"
                message={`Are you sure you want to delete the program "${programToDelete?.title}"? This will also remove its curriculum. This action cannot be undone.`}
            />
        </>
    );
};

export default ProgramsPage;