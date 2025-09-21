import { User, AvailabilitySlot, Unavailability, Role } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';

// --- User Functions ---
export const getUsers = async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
    return handleResponse<User[]>(response);
};

export const saveUsers = async (users: User[]): Promise<void> => {
    // Note: This endpoint is a simplified "bulk save" for mock API parity.
    // A real-world app would have more granular POST/PUT/DELETE endpoints per user.
    const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(users),
    });
    await handleResponse(response);
};

export const addExperiencePoints = async (studentId: string, points: number): Promise<void> => {
    // This would be a dedicated endpoint in a real app, e.g., POST /api/students/{id}/xp
    // For now, we'll fetch, modify, and save.
    const users = await getUsers();
    const newUsers = users.map(u => {
        if (u.id === studentId && u.role === Role.STUDENT) {
            return {
                ...u,
                experiencePoints: (u.experiencePoints || 0) + points,
            };
        }
        return u;
    });
    await saveUsers(newUsers);
};

// --- Availability Functions ---
export const getAvailability = async (): Promise<AvailabilitySlot[]> => {
    const response = await fetch(`${API_BASE_URL}/availability_slots`, { headers: getAuthHeaders() });
    return handleResponse<AvailabilitySlot[]>(response);
};

export const saveAvailability = async (availability: AvailabilitySlot[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/availability_slots`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(availability),
    });
    await handleResponse(response);
};

export const getUnavailability = async (): Promise<Unavailability[]> => {
    const response = await fetch(`${API_BASE_URL}/unavailability`, { headers: getAuthHeaders() });
    return handleResponse<Unavailability[]>(response);
};

export const saveUnavailability = async (unavailability: Unavailability[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/unavailability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(unavailability),
    });
    await handleResponse(response);
};
