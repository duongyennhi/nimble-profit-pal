import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { getMeApi } from '@/services/authService';

type UserType = {
  id?: number;
  username?: string;
  full_name?: string;
  fullName?: string;
  role_code?: string;
  roleCode?: string;
  role_name?: string;
  roleName?: string;
  email?: string;
  phone?: string;
  status?: string;
};

interface AuthContextType {
  user: UserType | null;
  logout: () => void;
  isAdmin: boolean;
  setAuthUser: (userData: UserType | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  logout: () => {},
  isAdmin: false,
  setAuthUser: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

const USER_KEY = 'user';
const TOKEN_KEY = 'token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken) {
          try {
            // Xác minh token với server
            const response = await getMeApi(savedToken);
            const currentUser = response.user || response.data || response;
            setUser(currentUser);
            // Cập nhật user data từ server
            localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
          } catch (error) {
            console.error('Token verification failed:', error);
            // Token không hợp lệ, xóa auth
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
          }
        } else if (savedUser) {
          // Nếu có user nhưng không có token, xóa user
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error('Failed to restore auth:', e);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuth();
  }, []);

  const setAuthUser = useCallback((userData: UserType | null) => {
    setUser(userData);

    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
  }, []);

  const isAdmin = useMemo(() => {
    const role = user?.role_code || user?.roleCode || user?.role_name || user?.roleName;
    return role === 'admin' || role === 'ADMIN' || role === 'Quản trị';
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        isAdmin,
        setAuthUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};