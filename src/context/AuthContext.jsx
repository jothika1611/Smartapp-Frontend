import { createContext, useContext, useMemo, useState } from 'react';
import client, { clearSession, saveSession, storedUser, unwrap } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storedUser());

  async function login(email, password) {
    const response = await client.post('/auth/login', { email, password });
    const data = unwrap(response);
    saveSession(data);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    await client.post('/auth/register', payload);
    return login(payload.email, payload.password);
  }

  async function logout() {
    try {
      await client.post('/auth/logout');
    } catch {
      // Local logout still completes if the token is already invalid.
    }
    clearSession();
    setUser(null);
  }

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    hasRole: (role) => Boolean(user?.roles?.includes(role)),
    login,
    register,
    logout
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
