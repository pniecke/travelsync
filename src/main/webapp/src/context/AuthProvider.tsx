import {createContext, ReactNode, useContext} from 'react';
import {getLoggedInUser} from '@/services/userService';
import {User} from "@/types/models/User";
import {useQuery} from "@tanstack/react-query";

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({user: null, loading: true});

export function AuthProvider({children}: { children: ReactNode }) {
    const {data, isLoading, isError} = useQuery<User, Error>({
        queryKey: ['user', 'me'],
        queryFn: getLoggedInUser,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

    return (
        <AuthContext.Provider
            value={{
                user: isError ? null : data ?? null,
                loading: isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}