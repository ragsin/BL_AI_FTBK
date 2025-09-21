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
