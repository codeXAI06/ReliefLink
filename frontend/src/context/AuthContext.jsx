import { createContext, useContext, useState, useEffect } from 'react';
import { loginHelper, registerHelper as apiRegisterHelper, getHelper } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [helper, setHelper] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const helperId = localStorage.getItem('helperId');
    const helperData = localStorage.getItem('helperData');
    const token = localStorage.getItem('authToken');
    
    if (helperId && helperData && token) {
      try {
        const data = JSON.parse(helperData);
        setUser(data);
        setHelper(data);
      } catch (e) {
        localStorage.removeItem('helperId');
        localStorage.removeItem('helperData');
        localStorage.removeItem('authToken');
      }
    }
    setLoading(false);
  }, []);

  const login = async (phone) => {
    try {
      const response = await loginHelper(phone);
      if (response && response.success && response.helper) {
        // Store JWT token
        if (response.access_token) {
          localStorage.setItem('authToken', response.access_token);
        }
        localStorage.setItem('helperId', response.helper.id.toString());
        localStorage.setItem('helperData', JSON.stringify(response.helper));
        setUser(response.helper);
        setHelper(response.helper);
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed. Phone not registered.' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiRegisterHelper(userData);
      if (response && response.id) {
        const helperData = {
          id: response.id,
          name: response.name,
          phone: userData.phone,
          organization: response.organization,
          can_help_with: response.can_help_with
        };
        localStorage.setItem('helperId', response.id.toString());
        localStorage.setItem('helperData', JSON.stringify(helperData));
        setUser(helperData);
        setHelper(helperData);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('helperId');
    localStorage.removeItem('helperData');
    localStorage.removeItem('authToken');
    setUser(null);
    setHelper(null);
  };

  const refreshUser = async () => {
    const helperId = localStorage.getItem('helperId');
    if (helperId) {
      try {
        const response = await getHelper(helperId);
        localStorage.setItem('helperData', JSON.stringify(response));
        setUser(response);
        setHelper(response);
      } catch (e) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      helper,
      loading, 
      login, 
      register, 
      logout,
      refreshUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
