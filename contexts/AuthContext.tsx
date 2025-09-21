import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Role } from '../types';
import { useNavigate } from 'react-router-dom';
import { getUsers, saveUsers } from '../api/userApi';
import { API_BASE_URL } from '../config';

// Helper to decode JWT - in a real app, use a library like jwt-decode
function decodeJwt(token: string): any {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}


interface AuthContextType {
  user: User | null;
  originalUser: User | null;
  login: (emailOrUsername: string, password: string) => Promise<User>;
  logout: () => void;
  findUserById: (id: string) => Promise<User | undefined>;
  impersonate: (userToImpersonate: User) => void;
  stopImpersonating: () => void;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [originalUser, setOriginalUser] = useState<User | null>(() => {
    const savedOriginalUser = sessionStorage.getItem('originalUser');
    return savedOriginalUser ? JSON.parse(savedOriginalUser) : null;
  });

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
    }
  }, [user]);

  useEffect(() => {
    if (originalUser) {
      sessionStorage.setItem('originalUser', JSON.stringify(originalUser));
    } else {
      sessionStorage.removeItem('originalUser');
    }
  }, [originalUser]);

  const login = async (emailOrUsername: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
    }

    const { token, user: loggedInUser } = await response.json();

    sessionStorage.setItem('authToken', token);
    setUser(loggedInUser);
    setOriginalUser(null);
    return loggedInUser;
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('originalUser');
    sessionStorage.removeItem('authToken');
    setUser(null);
    setOriginalUser(null);
    navigate('/login');
  };
  
  const findUserById = async (id: string) => {
    // In a real app this would be a GET /api/users/:id call
    const allUsers = await getUsers();
    return allUsers.find(u => u.id === id);
  }

  const updateUser = async (updatedUser: User) => {
    const allUsers = await getUsers();
    const newUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    await saveUsers(newUsers);

    if(user?.id === updatedUser.id) {
        setUser(updatedUser);
    }
    if(originalUser?.id === updatedUser.id) {
        setOriginalUser(updatedUser);
    }
  };

  const impersonate = (userToImpersonate: User) => {
    if (user && (user.role === Role.ADMIN || user.role === Role.PARENT || originalUser)) {
        const actingUser = originalUser || user;
        
        sessionStorage.setItem('originalUser', JSON.stringify(actingUser));
        sessionStorage.setItem('user', JSON.stringify(userToImpersonate));
        
        let path = '/';
        switch (userToImpersonate.role) {
            case Role.TEACHER: path = '/teacher/dashboard'; break;
            case Role.PARENT: path = '/parent/dashboard'; break;
            case Role.STUDENT: path = '/student/dashboard'; break;
            default: path = '/admin/dashboard'; break;
        }
        
        window.location.hash = path;
        window.location.reload();
    }
  };

  const stopImpersonating = () => {
    if (originalUser) {
        sessionStorage.setItem('user', JSON.stringify(originalUser));
        sessionStorage.removeItem('originalUser');
        
        let returnPath = '/';
        switch (originalUser.role) {
            case Role.PARENT:
                returnPath = '/parent/dashboard';
                break;
            case Role.ADMIN:
            case Role.FINANCE:
            case Role.SALES:
            case Role.SCHEDULER:
                returnPath = '/admin/dashboard';
                break;
            default:
                returnPath = '/login';
                break;
        }
        
        window.location.hash = returnPath;
        window.location.reload();
    }
  };


  return (
    <AuthContext.Provider value={{ user, originalUser, login, logout, findUserById, updateUser, impersonate, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
};
