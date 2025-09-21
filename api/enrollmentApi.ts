import { Enrollment, CreditTransaction } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';

// --- Enrollment Functions ---
export const getEnrollments = async (): Promise<Enrollment[]> => {
    const response = await fetch(`${API_BASE_URL}/enrollments`, { headers: getAuthHeaders() });
    return handleResponse<Enrollment[]>(response);
};

export const saveEnrollments = async (enrollments: Enrollment[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/enrollments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(enrollments),
    });
    await handleResponse(response);
};

// --- Credit Transaction Functions ---
export const getCreditTransactions = async (): Promise<CreditTransaction[]> => {
    const response = await fetch(`${API_BASE_URL}/credit_transactions`, { headers: getAuthHeaders() });
    return handleResponse<CreditTransaction[]>(response);
};

export const saveCreditTransactions = async (transactions: CreditTransaction[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/credit_transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(transactions),
    });
    await handleResponse(response);
};
