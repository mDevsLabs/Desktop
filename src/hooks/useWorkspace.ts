import { useEffect, useState } from 'react';
import type { Tab } from '../types';

type UseWorkspaceOpts = {
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => void;
  activeId: string;
  setActiveId: (id: string) => void;
  enabled: boolean; // desktop only
};

export function useWorkspace({ tabs, setTabs, activeId, setActiveId, enabled }: UseWorkspaceOpts) {
  const [hydrated, setHydrated] = useState(!enabled);
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());

  // Restore on mount (desktop)
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void window
      .maiDesktop!.getWorkspace()
      .then((s) => {
        if (!live) return;
        if (s?.tabs?.length) {
          setTabs(s.tabs);
          const exists = s.tabs.some((t) => t.id === s.activeId);
          setActiveId(exists ? s.activeId : s.tabs[0]!.id);
          setRestoredIds(new Set(s.tabs.filter((t) => t.kind === 'terminal').map((t) => t.id)));
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!live) return;
        setHydrated(true);
      });
    return () => {
      live = false;
    };
  }, [enabled, setActiveId, setTabs]);

  // Persist on change (debounced in main process, but gate on hydrated)
  useEffect(() => {
    if (enabled && hydrated) {
      const win = new URLSearchParams(location.search).get('window') || '';
      window.maiDesktop!.saveWorkspace({ id: win, tabs, activeId });
    }
  }, [tabs, activeId, hydrated, enabled]);

  return { hydrated, restoredIds };
}
