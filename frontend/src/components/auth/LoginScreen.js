import React, { useState } from 'react';
import AppFooter from '../common/AppFooter';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5656';

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        let msg = 'Login failed';
        try {
          const data = await res.json();
          if (data && data.message) msg = data.message;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data || !data.accessToken) {
        throw new Error('No access token returned');
      }

      onLogin(data.accessToken);
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] flex flex-col">
      <div className="flex-1 grid place-items-center p-4">
        <div className="w-full max-w-[420px] bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-green-500 grid place-items-center" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L14.5 8.2L21 9L16.1 13.1L17.7 20L12 16.7L6.3 20L7.9 13.1L3 9L9.5 8.2L12 2Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="m-0 text-[22px] font-bold tracking-tight">Login</h1>
              <p className="mt-1 text-[13px] text-gray-500">Sign in to your dashboard</p>
            </div>
          </div>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-[13px] text-gray-700">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                inputMode="text"
                placeholder="admin"
                required
                className="h-11 rounded-xl border border-gray-200 px-3 outline-none text-[14px] bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </label>

            <label className="flex flex-col gap-2 text-[13px] text-gray-700">
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="h-11 rounded-xl border border-gray-200 px-3 outline-none text-[14px] bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20"
              />
            </label>

            <button
              className="h-11 rounded-xl bg-blue-600 text-white font-bold text-[14px] px-4 cursor-pointer disabled:cursor-not-allowed disabled:bg-blue-300"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            {error ? (
              <div className="mt-1 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[13px]" role="alert">
                {error}
              </div>
            ) : null}
          </form>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

export default LoginScreen;

