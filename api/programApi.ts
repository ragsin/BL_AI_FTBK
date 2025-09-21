import { Program, CurriculumProgress } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';

// --- Program Functions ---
export const getPrograms = async (): Promise<Program[]> => {
    const response = await fetch(`${API_BASE_URL}/programs`, { headers: getAuthHeaders() });
    return handleResponse<Program[]>(response);
};

export const savePrograms = async (programs: Program[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/programs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(programs),
    });
    await handleResponse(response);
};

// --- Curriculum Progress Functions ---
export const getCurriculumProgress = async (): Promise<Record<string, CurriculumProgress>> => {
    const response = await fetch(`${API_BASE_URL}/curriculum_progress`, { headers: getAuthHeaders() });
    return handleResponse<Record<string, CurriculumProgress>>(response);
};

export const saveCurriculumProgress = async (progress: Record<string, CurriculumProgress>): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/curriculum_progress`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(progress),
    });
    await handleResponse(response);
};
