import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { auth } from '../services/api';
import { AUTH_EXPIRED_EVENT } from '../services/http';
import type { User } from '../types';

type Status = 'checking' | 'signed-in' | 'signed-out';

interface AuthValue {
  user: User | null;
  status: Status;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('signed-in');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('signed-out');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any 401 from anywhere in the app drops us back to the sign-in screen.
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setStatus('signed-out');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const me = await auth.login(email, password);
    setUser(me);
    setStatus('signed-in');
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const me = await auth.register(email, password);
    setUser(me);
    setStatus('signed-in');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setUser(null);
      setStatus('signed-out');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, signIn, signUp, signOut }),
    [user, status, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
