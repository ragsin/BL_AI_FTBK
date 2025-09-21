import { Session, CancellationRequest, Assignment, CurriculumItem, Program, Enrollment, AssignmentStatus, CurriculumStatus, EnrollmentStatus } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';
import { getCurriculumProgress, saveCurriculumProgress } from './programApi';
import { getEnrollments, saveEnrollments } from './enrollmentApi';

// --- Session Functions ---
export const getSessions = async (): Promise<Session[]> => {
    const response = await fetch(`${API_BASE_URL}/sessions`, { headers: getAuthHeaders() });
    return handleResponse<Session[]>(response);
};

export const saveSessions = async (sessions: Session[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(sessions),
    });
    await handleResponse(response);
};

// --- Cancellation Request Functions ---
export const getCancellationRequests = async (): Promise<CancellationRequest[]> => {
    const response = await fetch(`${API_BASE_URL}/cancellation_requests`, { headers: getAuthHeaders() });
    return handleResponse<CancellationRequest[]>(response);
};

export const saveCancellationRequests = async (requests: CancellationRequest[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/cancellation_requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requests),
    });
    await handleResponse(response);
};

// --- Assignment Functions ---
export const getAssignments = async (): Promise<Assignment[]> => {
    const response = await fetch(`${API_BASE_URL}/assignments`, { headers: getAuthHeaders() });
    return handleResponse<Assignment[]>(response);
};

export const saveAssignments = async (assignments: Assignment[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/assignments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(assignments),
    });
    await handleResponse(response);
};

// --- Business Logic ---
// Note: These business logic functions now modify data and save it back.
// In a real-world scenario, this logic would live on the backend.

const flattenCurriculum = (items: CurriculumItem[]): CurriculumItem[] => {
    const flat: CurriculumItem[] = [];
    items.forEach(item => {
        flat.push(item);
        if (item.children) {
            flat.push(...flattenCurriculum(item.children));
        }
    });
    return flat;
};

export const triggerNextAssignmentAfterSession = async (session: Session, program: Program, enrollment: Enrollment): Promise<string[]> => {
    const toastMessages: string[] = [];
    if (!program.structure || !session.curriculumItemId) return toastMessages;

    const flatCurriculum = flattenCurriculum(program.structure);
    const currentIndex = flatCurriculum.findIndex(item => item.id === session.curriculumItemId);

    if (currentIndex > -1 && currentIndex + 1 < flatCurriculum.length) {
        const nextItem = flatCurriculum[currentIndex + 1];
        if (nextItem.assignments && nextItem.assignments.length > 0) {
            const allAssignments = await getAssignments();
            const newAssignmentsToCreate: Assignment[] = [];
            
            nextItem.assignments.forEach(template => {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 7);

                const newAssignment: Assignment = {
                    id: `a-${Date.now()}-${template.id}`,
                    title: template.title,
                    studentId: session.studentId!,
                    enrollmentId: enrollment.id,
                    programId: program.id,
                    status: AssignmentStatus.NOT_SUBMITTED,
                    submittedAt: '',
                    dueDate: dueDate.toISOString().split('T')[0],
                    url: template.url,
                    instructions: template.instructions,
                    curriculumItemId: nextItem.id,
                };
                newAssignmentsToCreate.push(newAssignment);
                toastMessages.push(`Assigned "${template.title}" to student.`);
            });

            if (newAssignmentsToCreate.length > 0) {
                await saveAssignments([...allAssignments, ...newAssignmentsToCreate]);
            }
        }
    }
    return toastMessages;
};

export const updateCurriculumAfterSessionCompletion = async (session: Session, enrollment: Enrollment): Promise<{ programCompleted: boolean }> => {
    const allProgress = await getCurriculumProgress();
    const studentProgress = allProgress[enrollment.id];

    if (!studentProgress || !session.curriculumItemId) {
        return { programCompleted: false };
    }

    let itemUpdated = false;
    const updateStatusRecursive = (items: CurriculumItem[]): CurriculumItem[] => {
        return items.map(item => {
            if (item.id === session.curriculumItemId) {
                itemUpdated = true;
                return { ...item, status: CurriculumStatus.COMPLETED };
            }
            if (item.children) {
                return { ...item, children: updateStatusRecursive(item.children) };
            }
            return item;
        });
    };
    
    const newStructure = updateStatusRecursive(studentProgress.structure);

    if (itemUpdated) {
        const isAllCompleteRecursive = (items: CurriculumItem[]): boolean => {
            return items.every(item => 
                item.status === CurriculumStatus.COMPLETED && 
                (!item.children || item.children.length === 0 || isAllCompleteRecursive(item.children))
            );
        };

        const updatedProgress = { ...studentProgress, structure: newStructure };
        allProgress[enrollment.id] = updatedProgress;
        await saveCurriculumProgress(allProgress);
        
        if (isAllCompleteRecursive(newStructure)) {
            return { programCompleted: true };
        }
    }
    
    return { programCompleted: false };
};
