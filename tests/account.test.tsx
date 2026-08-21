import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccount } from '../src/services/account';

describe('useAccount', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('charge null si aucun compte stocké', () => {
    const { result } = renderHook(() => useAccount());
    expect(result.current.account).toBeNull();
    expect(result.current.phase).toBe('idle');
  });

  it('reste idle si startLogin échoue (fetch 500)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Erreur serveur' }),
    } as Response);

    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.startLogin('a@b.c', 'pass');
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.error).toContain('Erreur');
  });

  it('passe en otp sur verification_required', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'verification_required' }),
    } as unknown as Response);

    const { result } = renderHook(() => useAccount());
    await act(async () => {
      await result.current.startLogin('test@example.com', 'secret');
    });
    expect(result.current.phase).toBe('otp');
    expect(result.current.pendingEmail).toBe('test@example.com');
  });

  it('submitOtp construit le compte et persiste', async () => {
    // Mock post /login -> verification_required, then /verify-login -> success
    const fetchMock = vi.fn();
    // First call: login
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'verification_required' }),
    } as unknown as Response);
    // Second: verify-login
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, token: 'tok123' }),
    } as unknown as Response);
    // Third: /usage
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tier: 'Plus', email: 'test@example.com', username: 'tester' }),
    } as unknown as Response);
    // Fourth: /api-keys
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: [{ request_count: 42 }] }),
    } as unknown as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useAccount());

    await act(async () => {
      await result.current.startLogin('test@example.com', 'pwd');
    });
    expect(result.current.phase).toBe('otp');

    await act(async () => {
      await result.current.submitOtp('123456');
    });

    await waitFor(() => expect(result.current.account).not.toBeNull());
    expect(result.current.account?.email).toBe('test@example.com');
    expect(result.current.account?.tier).toBe('Plus');
    expect(result.current.account?.requestUsed).toBe(42);
    expect(result.current.phase).toBe('idle');
    // persisted
    expect(localStorage.getItem('mai.account')).toContain('tok123');
  });

  it('logout efface le compte', async () => {
    localStorage.setItem(
      'mai.account',
      JSON.stringify({
        token: 'x',
        email: 'a@b.c',
        username: 'u',
        tier: 'Free',
        requestUsed: 0,
        requestLimit: 500,
      })
    );
    const { result } = renderHook(() => useAccount());
    // initial load should have account
    expect(result.current.account).not.toBeNull();
    act(() => {
      result.current.logout();
    });
    expect(result.current.account).toBeNull();
    expect(localStorage.getItem('mai.account')).toBeNull();
  });
});
