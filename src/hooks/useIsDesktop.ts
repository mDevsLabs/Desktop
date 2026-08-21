import { useMemo } from 'react';

export function useIsDesktop(): boolean {
  return useMemo(() => Boolean(window.maiDesktop), []);
}

// Also export non-hook helper for places where hook can't be used (module-level)
export const isDesktop = Boolean(window.maiDesktop);
