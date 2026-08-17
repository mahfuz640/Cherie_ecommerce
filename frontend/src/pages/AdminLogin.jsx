import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { hasActiveAdminSession, setAdminToken } from '../adminSession';
import Brand from '../components/Brand';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const password = new FormData(event.currentTarget).get('password');
      const result = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      setAdminToken(result.token); navigate('/admin', { replace: true });
  } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  if (hasActiveAdminSession()) return <Navigate replace to="/admin" />;
  return <main className="admin-login"><Brand /><form onSubmit={login}><p className="eyebrow">ADMIN ACCESS</p><h1>Welcome back</h1><input aria-label="Admin email" className="fixed-email" readOnly tabIndex="-1" type="email" value="admin@cherie.com" /><div className="password-field"><input autoComplete="current-password" required name="password" type={showPassword ? 'text' : 'password'} placeholder="Password" /><button aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="password-toggle" onClick={() => setShowPassword(value => !value)} type="button"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M2.5 12s3.4-6.25 9.5-6.25S21.5 12 21.5 12 18.1 18.25 12 18.25 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" />{showPassword && <path d="m4 4 16 16" />}</svg></button></div>{error && <p className="error">{error}</p>}<button disabled={busy} className="button">{busy ? 'Signing in...' : 'Sign in'}</button></form></main>;
}
