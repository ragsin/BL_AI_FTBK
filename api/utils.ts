import { API_BASE_URL } from '../config';

export const getAuthHeaders = () => {
    const token = sessionStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    // Handle cases with no content
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

export const uploadFile = async (file: File): Promise<{ filePath: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = sessionStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        // Omitting 'Content-Type' lets the browser set it with the correct boundary for FormData
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    return handleResponse<{ filePath: string }>(response);
};
