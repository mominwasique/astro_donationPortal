import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated, logoutUser } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const checkAuth = () => {
            if (isAuthenticated()) {
                setUser(getCurrentUser());
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        await logoutUser();
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        setUser: login,
        logout,
        isLoading,
        isAuthenticated: !!user
    };

    if (isLoading) {
        return <div>Loading...</div>; // Or your loading component
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        // Return default values for SSR
        return {
            user: null,
            setUser: () => {},
            logout: () => {},
            isLoading: false,
            isAuthenticated: false
        };
    }
    return context;
};