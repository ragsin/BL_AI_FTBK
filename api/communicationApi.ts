import { Message, Conversation, Announcement, Notification } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';

// --- Message Functions ---
export const getMessages = async (): Promise<Message[]> => {
    const response = await fetch(`${API_BASE_URL}/messages`, { headers: getAuthHeaders() });
    return handleResponse<Message[]>(response);
};

export const saveMessages = async (messages: Message[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(messages),
    });
    await handleResponse(response);
};

// --- Conversation Functions ---
export const getConversations = async (): Promise<Conversation[]> => {
    const response = await fetch(`${API_BASE_URL}/conversations`, { headers: getAuthHeaders() });
    return handleResponse<Conversation[]>(response);
};

export const saveConversations = async (conversations: Conversation[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(conversations),
    });
    await handleResponse(response);
};

// --- Announcement Functions ---
export const getAnnouncements = async (): Promise<Announcement[]> => {
    const response = await fetch(`${API_BASE_URL}/announcements`, { headers: getAuthHeaders() });
    return handleResponse<Announcement[]>(response);
};

export const saveAnnouncements = async (announcements: Announcement[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/announcements`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(announcements),
    });
    await handleResponse(response);
};

// --- Notification Functions ---
// Note: In a real app, notifications would likely be generated on the backend
// and fetched via a dedicated endpoint, possibly with websockets.
// For now, we continue to generate them on the client based on fetched data.

export const getNotifications = async (): Promise<Notification[]> => {
    // This is a client-side only concept for the demo.
    return [];
};

export const saveNotifications = async (notifications: Notification[]): Promise<void> => {
    // This is a client-side only concept for the demo.
};

export const getNotificationsForUser = async (userId: string): Promise<Notification[]> => {
    // This function can remain client-side for now, as it composes data from other API calls.
    // A more advanced implementation would move this logic to the backend.
    return [];
};
