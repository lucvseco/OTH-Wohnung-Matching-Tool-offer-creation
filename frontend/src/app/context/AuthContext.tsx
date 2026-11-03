import { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  gender: 'male' | 'female' | 'diverse';
  dateOfBirth: string;
  role: 'student' | 'worker';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - simulates SSO from university portal
    await new Promise(resolve => setTimeout(resolve, 800));

    // Normalize inputs to prevent whitespace or case-sensitivity mismatch bugs
    const trimmedEmail = email.trim().toLowerCase();

    // Condition validation matching your clean data.sql values
    if (trimmedEmail === 'max.mustermann@stud.oth-regensburg.de' && password === 'password123') {
      setUser({
        id: '1',
        email: trimmedEmail,
        name: 'Max Mustermann',
        gender: 'male',
        dateOfBirth: '2000-03-15',
        role: 'student',
      });
    } else if (trimmedEmail === 'anna.schmidt@stud.oth-regensburg.de' && password === 'secure456') {
      setUser({
        id: '2',
        email: trimmedEmail,
        name: 'Anna Schmidt',
        gender: 'female',
        dateOfBirth: '2001-07-22',
        role: 'student',
      });
    } else {
      // This error instance gets handled directly inside the catch block of your LoginPage.tsx
      throw new Error('Invalid OTH Portal credentials. Please check your email or password.');
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
      <AuthContext.Provider
          value={{
            user,
            login,
            logout,
            isAuthenticated: !!user,
          }}
      >
        {children}
      </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}