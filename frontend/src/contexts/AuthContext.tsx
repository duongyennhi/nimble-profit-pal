import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage:', e);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const setAuthUser = useCallback((userData: UserType | null) => {
    setUser(userData);

    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  }, []);

  const isAdmin = useMemo(() => {
    return user?.role_code === 'admin' || user?.roleCode === 'admin';
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