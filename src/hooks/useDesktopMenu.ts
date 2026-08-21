import { useEffect } from 'react';
import type { Tab, TabKind } from '../types';

export function useDesktopMenu({
  enabled,
  open,
  close,
  activeId,
  tabs,
  setActiveId,
}: {
  enabled: boolean;
  open: (k: TabKind) => void;
  close: (id: string) => void;
  activeId: string;
  tabs: Tab[];
  setActiveId: (id: string) => void;
}) {
  useEffect(() => {
    if (!enabled || !window.maiDesktop) return;

    const a = window.maiDesktop.onMenuNewTab(() => open('home'));
    const b = window.maiDesktop.onMenuNewTerminal(() => open('terminal'));
    const c = window.maiDesktop.onMenuCloseTab(() => close(activeId));

    const d = window.maiDesktop.onMenuSelectTab((idx: number) => {
      if (idx === 8) {
        const last = tabs[tabs.length - 1];
        if (last) setActiveId(last.id);
        return;
      }
      const target = tabs[idx];
      if (target) setActiveId(target.id);
    });

    const e = window.maiDesktop.onMenuNextTab(() => {
      const cur = tabs.findIndex((t) => t.id === activeId);
      if (cur < 0 || !tabs.length) return;
      const next = tabs[(cur + 1) % tabs.length];
      if (next) setActiveId(next.id);
    });

    const f = window.maiDesktop.onMenuPrevTab(() => {
      const cur = tabs.findIndex((t) => t.id === activeId);
      if (cur < 0 || !tabs.length) return;
      const prev = tabs[(cur - 1 + tabs.length) % tabs.length];
      if (prev) setActiveId(prev.id);
    });

    return () => {
      a();
      b();
      c();
      d();
      e();
      f();
    };
  }, [enabled, open, close, activeId, tabs, setActiveId]);
}
