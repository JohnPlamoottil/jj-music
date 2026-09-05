import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { messageFor } from '../services/apiError';

/** Sign in and register share one screen; the server enforces the real rules. */
export function SignIn() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'up' && password.length < 10) {
      setError('Use at least 10 characters for your password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl leading-none">
          JJ<span className="text-glow">.</span>Music
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Your own records, on your own storage, playing on whatever you have with you.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-line bg-panel px-3 py-3 text-[15px] focus:border-glow"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Password</span>
            <input
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-line bg-panel px-3 py-3 text-[15px] focus:border-glow"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-heart/40 bg-heart/10 px-3 py-2.5 text-sm" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'One moment' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          className="mt-5 rounded-md text-sm text-muted hover:text-glow"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
          }}
        >
          {mode === 'in' ? 'Set up a new library' : 'I already have a library'}
        </button>
      </div>
    </div>
  );
}
