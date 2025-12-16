import axios from 'axios';

const API_URL = 'http://localhost:8000/api/auth';

export const authService = {
    login: async (username: string, password: string) => {
        const response = await axios.post(`${API_URL}/token/`, {
            username,
            password
        });
        if (response.data.access) {
            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
            return response.data;
        }
        return null;
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
    },

    getToken: () => {
        return localStorage.getItem('accessToken');
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('accessToken');
    }
};
