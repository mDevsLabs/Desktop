import { useCallback, useMemo, useRef, useState } from 'react';
import { SERVICES, type Tab, type TabKind } from '../types';

const titleFor = (k: TabKind): string => (k === 'home' ? 'Accueil' : SERVICES[k].title);

export const makeTab = (kind: TabKind): Tab => ({
  id: crypto.randomUUID(),
  kind,
  title: titleFor(kind),
});

export function useTabs() {
  const first = useRef<Tab>(makeTab('home')).current;
  const [tabs, setTabs] = useState<Tab[]>([first]);
  const [activeId, setActiveId] = useState<string>(first.id);
  const drag = useRef<string | undefined>(undefined);

  const active = useMemo(() => tabs.find((t) => t.id === activeId) ?? tabs[0]!, [tabs, activeId]);

  const isDesktop = Boolean(window.maiDesktop);

  const open = useCallback(
    (kind: TabKind, newWindow = false) => {
      if (newWindow && isDesktop) {
        void window.maiDesktop!.newWindow(kind);
        return;
      }
      const t = makeTab(kind);
      if (!isDesktop) {
        setTabs([t]);
        setActiveId(t.id);
        return;
      }
      setTabs((x) => [...x, t]);
      setActiveId(t.id);
    },
    [isDesktop]
  );

  const close = useCallback(
    (id: string) => {
      const index = tabs.findIndex((t) => t.id === id);
      const next = tabs.filter((t) => t.id !== id);
      if (!next.length) {
        const h = makeTab('home');
        setTabs([h]);
        setActiveId(h.id);
        return;
      }
      setTabs(next);
      if (id === activeId) {
        const fallback = next[Math.min(index, next.length - 1)];
        if (fallback) setActiveId(fallback.id);
      }
    },
    [tabs, activeId]
  );

  const rename = useCallback((id: string, title: string) => {
    setTabs((x) => x.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  const duplicate = useCallback((tab: Tab) => {
    const t: Tab = {
      ...tab,
      id: crypto.randomUUID(),
      title: tab.kind === 'terminal' ? `${tab.title} (copie)` : tab.title,
    };
    setTabs((x) => [...x, t]);
    setActiveId(t.id);
  }, []);

  const moveTab = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setTabs((x) => {
      const a = x.findIndex((t) => t.id === fromId);
      const b = x.findIndex((t) => t.id === toId);
      if (a < 0 || b < 0) return x;
      const n = [...x];
      const [m] = n.splice(a, 1);
      if (!m) return x;
      n.splice(b, 0, m);
      return n;
    });
  }, []);

  return {
    tabs,
    setTabs,
    activeId,
    setActiveId,
    active,
    open,
    close,
    rename,
    duplicate,
    moveTab,
    drag,
  };
}
