import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { TabKind } from '../types';

export function useMobileBack({
  enabled,
  activeKind,
  openHome,
}: {
  enabled: boolean;
  activeKind: TabKind;
  openHome: () => void;
}) {
  useEffect(() => {
    if (enabled) return;
    const l = CapacitorApp.addListener('backButton', () => {
      if (activeKind !== 'home') openHome();
      else void CapacitorApp.exitApp();
    });
    return () => {
      void l.then((h) => h.remove());
    };
  }, [enabled, activeKind, openHome]);
}
