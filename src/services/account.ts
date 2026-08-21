import { useCallback, useState } from 'react';

const BASE = 'https://mai.val.run';

export type Tier = 'Free' | 'Plus' | 'Pro' | 'Max';
export type Account = {
  token: string;
  email: string;
  username: string;
  tier: Tier;
  avatarUrl?: string | null;
  requestUsed: number;
  requestLimit: number;
  resetAt?: string;
};

const TIER_REQUEST_LIMITS: Record<string, number> = {
  Free: 500,
  Plus: 1000,
  Pro: 2000,
  Max: 5000,
};
const STORE_KEY = 'mai.account';

function load(): Account | null {
  try {
    const r = localStorage.getItem(STORE_KEY);
    return r ? (JSON.parse(r) as Account) : null;
  } catch {
    return null;
  }
}
function save(a: Account | null) {
  try {
    a ? localStorage.setItem(STORE_KEY, JSON.stringify(a)) : localStorage.removeItem(STORE_KEY);
  } catch {}
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Erreur ${res.status}`);
  return data as Record<string, unknown>;
}
async function authedGet(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Erreur ${res.status}`);
  return data as Record<string, unknown>;
}

async function fetchUsage(token: string) {
  try {
    return await authedGet('/usage', token);
  } catch {
    return null;
  }
}
async function fetchApiKeys(token: string): Promise<{ request_count: number }[]> {
  try {
    const d = await authedGet('/api-keys', token);
    const keys = (d as { keys?: { request_count: number }[] }).keys;
    return Array.isArray(keys) ? keys : [];
  } catch {
    return [];
  }
}

async function buildAccount(
  token: string,
  fallbackEmail: string,
  fallbackUsername: string
): Promise<Account> {
  const [usageRaw, keys] = await Promise.all([fetchUsage(token), fetchApiKeys(token)]);
  const usage = usageRaw as {
    tier?: Tier;
    email?: string;
    username?: string;
    avatarUrl?: string | null;
    resetAt?: string;
  } | null;
  const tier: Tier = (usage?.tier as Tier) || 'Free';
  const used = keys.reduce((s: number, x) => s + (x.request_count || 0), 0);
  return {
    token,
    email: usage?.email || fallbackEmail,
    username: usage?.username || fallbackUsername || (fallbackEmail.split('@')[0] ?? fallbackEmail),
    tier,
    avatarUrl: usage?.avatarUrl || null,
    requestUsed: used,
    requestLimit: TIER_REQUEST_LIMITS[tier] ?? 500,
    resetAt: usage?.resetAt,
  };
}

export type AccountApi = {
  account: Account | null;
  phase: 'idle' | 'otp' | 'busy';
  error: string;
  pendingEmail: string;
  pendingAction: 'login' | 'register';
  startLogin: (email: string, password: string) => Promise<void>;
  startRegister: (email: string, username: string, password: string) => Promise<void>;
  submitOtp: (code: string) => Promise<void>;
  resend: () => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

export function useAccount(): AccountApi {
  const [account, setAccount] = useState<Account | null>(() => load());
  const [phase, setPhase] = useState<'idle' | 'otp' | 'busy'>('idle');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{
    action: 'login' | 'register';
    email: string;
    password: string;
    username: string;
  } | null>(null);

  const startLogin = useCallback(async (email: string, password: string) => {
    setError('');
    setPhase('busy');
    try {
      const r = await post('/login', { email, password });
      if ((r as { status?: string }).status === 'verification_required') {
        setPending({ action: 'login', email, password, username: '' });
        setPhase('otp');
      } else throw new Error('Réponse inattendue du serveur.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, []);

  const startRegister = useCallback(async (email: string, username: string, password: string) => {
    setError('');
    setPhase('busy');
    try {
      const r = await post('/register', { email, username, password });
      if ((r as { status?: string }).status === 'verification_required') {
        setPending({ action: 'register', email, password, username });
        setPhase('otp');
      } else throw new Error('Réponse inattendue du serveur.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, []);

  const submitOtp = useCallback(
    async (code: string) => {
      if (!pending) return;
      setError('');
      setPhase('busy');
      try {
        const r =
          pending.action === 'register'
            ? await post('/verify-register', {
                email: pending.email,
                username: pending.username,
                password: pending.password,
                code,
              })
            : await post('/verify-login', { email: pending.email, code });
        const token = (r as { token?: string; success?: boolean }).token;
        const success = (r as { success?: boolean }).success;
        if (!success || !token) throw new Error('Vérification échouée.');
        const acc = await buildAccount(token, pending.email, pending.username);
        save(acc);
        setAccount(acc);
        setPending(null);
        setPhase('idle');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase('otp');
      }
    },
    [pending]
  );

  const resend = useCallback(async () => {
    if (!pending) return;
    setError('');
    try {
      await post('/resend-code', {
        email: pending.email,
        action: pending.action,
      });
      setError('Code renvoyé par e-mail.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [pending]);

  const logout = useCallback(() => {
    save(null);
    setAccount(null);
    setPending(null);
    setPhase('idle');
  }, []);

  const refresh = useCallback(async () => {
    setAccount((prev) => {
      if (!prev) return prev;
      void buildAccount(prev.token, prev.email, prev.username).then((acc) => {
        save(acc);
        setAccount(acc);
      });
      return prev;
    });
  }, []);

  return {
    account,
    phase,
    error,
    pendingEmail: pending?.email || '',
    pendingAction: pending?.action || 'login',
    startLogin,
    startRegister,
    submitOtp,
    resend,
    logout,
    refresh,
  };
}
