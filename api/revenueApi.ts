import { RevenueTransaction } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';

// --- Revenue Transaction Functions ---
export const getRevenueTransactions = async (): Promise<RevenueTransaction[]> => {
    const response = await fetch(`${API_BASE_URL}/revenue_transactions`, { headers: getAuthHeaders() });
    return handleResponse<RevenueTransaction[]>(response);
};

export const saveRevenueTransactions = async (transactions: RevenueTransaction[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/revenue_transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(transactions),
    });
    await handleResponse(response);
};
