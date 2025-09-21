import { Asset } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';

export const getAssets = async (): Promise<Asset[]> => {
    const response = await fetch(`${API_BASE_URL}/assets`, { headers: getAuthHeaders() });
    return handleResponse<Asset[]>(response);
};

export const saveAssets = async (assets: Asset[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/assets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(assets),
    });
    await handleResponse(response);
};
