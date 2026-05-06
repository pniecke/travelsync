import {createContext, ReactNode, useContext} from 'react';
import {getLoggedInUser} from '@/services/userService';
import {User} from "@/types/models/User";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import apiClient from "@/services/apiClient";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    refetch: () => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    refetch: () => {},
    logout: async () => {}
});

export function AuthProvider({children}: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const {data, isLoading, isError, refetch: queryRefetch} = useQuery<User, Error>({
        queryKey: ['user', 'me'],
        queryFn: () => getLoggedInUser(),
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    const refetch = () => {
        queryRefetch();
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear all queries and redirect
            queryClient.clear();
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user: isError ? null : data ?? null,
                loading: isLoading,
                refetch,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

