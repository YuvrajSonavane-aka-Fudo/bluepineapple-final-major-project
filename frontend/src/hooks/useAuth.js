// src/hooks/useAuth.js
import { createContext, useContext, useState, useCallback } from 'react';
import { loginWithEmail } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const stored = sessionStorage.getItem('session_id');
  const [session, setSession] = useState(
    stored ? {
      session_id: stored,
      user_id:    sessionStorage.getItem('user_id'),
      user_role:  sessionStorage.getItem('user_role'),
    } : null
  );

  const login = useCallback(async (email) => {
    const data = await loginWithEmail(email);
    sessionStorage.setItem('session_id', data.session_id);
    sessionStorage.setItem('user_id',    String(data.user_id));
    sessionStorage.setItem('user_role',  data.user_role);
    setSession(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
