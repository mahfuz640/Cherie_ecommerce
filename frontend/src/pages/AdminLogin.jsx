import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Brand from '../components/Brand';

export default function AdminLogin() {
  const navigate = useNavigate(), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const password = new FormData(event.currentTarget).get('password');
      const result = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      localStorage.setItem('cherie-token', result.token); navigate('/admin');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return <main className="admin-login"><Brand /><form onSubmit={login}><p className="eyebrow">ADMIN ACCESS</p><h1>Welcome back</h1><input aria-label="Admin email" className="fixed-email" readOnly tabIndex="-1" type="email" value="admin@cherie.com" /><input autoComplete="current-password" required name="password" type="password" placeholder="Password" />{error && <p className="error">{error}</p>}<button disabled={busy} className="button">{busy ? 'Signing in...' : 'Sign in'}</button></form></main>;
}
