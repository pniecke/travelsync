import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor to handle errors globally
apiClient.interceptors.response.use(
    response => response,
    error => {
        const url = error.config?.url || '';
        const isBrowser = typeof window !== 'undefined';

        if (error.response?.status === 401 && !url.endsWith('/user/me')) {
            console.error('Unauthorized access');

            if (isBrowser) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error)
    }
);

export default apiClient;