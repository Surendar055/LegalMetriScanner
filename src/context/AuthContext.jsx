import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';
import { getApiUrl } from '../config/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check existing session token on initial mount
  const checkAuth = useCallback(async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('lms_auth_token') : null;
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          setToken(storedToken);
          // Pass token to Socket.IO service for authenticated rooms
          if (socketService) {
            socketService.setAuthToken?.(storedToken, data.user);
          }
        } else {
          localStorage.removeItem('lms_auth_token');
          setUser(null);
          setToken(null);
        }
      } else {
        localStorage.removeItem('lms_auth_token');
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('[AuthContext] Session verification error:', err.message);
      // Fallback: if offline but token exists, read cached user if available
      try {
        const cachedUserStr = localStorage.getItem('lms_cached_user');
        const storedToken = localStorage.getItem('lms_auth_token');
        if (cachedUserStr && storedToken) {
          const cachedUser = JSON.parse(cachedUserStr);
          setUser(cachedUser);
          setToken(storedToken);
        }
      } catch (e) {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate inspector credentials.');
      }

      localStorage.setItem('lms_auth_token', data.token);
      localStorage.setItem('lms_cached_user', JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.token);

      if (socketService) {
        socketService.setAuthToken?.(data.token, data.user);
      }

      return data.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const register = async ({ name, email, password, confirmPassword }) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed. Please check form values.');
      }

      localStorage.setItem('lms_auth_token', data.token);
      localStorage.setItem('lms_cached_user', JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.token);

      if (socketService) {
        socketService.setAuthToken?.(data.token, data.user);
      }

      return data.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (token) {
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {}

    localStorage.removeItem('lms_auth_token');
    localStorage.removeItem('lms_cached_user');
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
