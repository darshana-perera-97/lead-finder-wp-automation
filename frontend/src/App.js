import React, { useEffect, useState } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import LoginScreen from './components/auth/LoginScreen';

function App() {
  const [accessToken, setAccessToken] = useState(() => {
    try {
      return localStorage.getItem('accessToken');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Keep state in sync if token is modified in another tab.
    const onStorage = (e) => {
      if (e.key === 'accessToken') setAccessToken(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogin = (token) => {
    setAccessToken(token);
    try {
      localStorage.setItem('accessToken', token);
    } catch {
      // Ignore storage failures (e.g. privacy mode).
    }
  };

  const handleLogout = () => {
    setAccessToken(null);
    try {
      localStorage.removeItem('accessToken');
    } catch {
      // Ignore storage failures (e.g. privacy mode).
    }
  };

  if (!accessToken) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard onLogout={handleLogout} />;
}

export default App;
