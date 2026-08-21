import { useEffect, useMemo, useRef, useState } from 'react';
import type { Tab } from '../types';
import { TerminalIcon } from './Icons';

type Props = {
  open: boolean;
  onClose: () => void;
  tabs: Tab[];
  activeId: string;
  onSelect: (tabId: string) => void;
  onSearchTerminal: () => void;
};

export function CommandPalette({
  open,
  onClose,
  tabs,
  activeId,
  onSelect,
  onSearchTerminal,
}: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeId);
  const isTerminal = activeTab?.kind === 'terminal';

  const filtered = useMemo(() => {
    if (!query.trim()) return tabs;
    const q = query.toLowerCase();
    return tabs.filter(
      (t) => t.title.toLowerCase().includes(q) || t.kind.toLowerCase().includes(q)
    );
  }, [tabs, query]);

  // Build combined items: tabs + action
  const items: Array<{
    id: string;
    label: string;
    sub?: string;
    kind: 'tab' | 'action';
    tabId?: string;
  }> = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      sub?: string;
      kind: 'tab' | 'action';
      tabId?: string;
    }> = filtered.map((t) => ({
      id: `tab-${t.id}`,
      label: t.title,
      sub: String(t.kind),
      kind: 'tab' as const,
      tabId: t.id,
    }));
    if (isTerminal) {
      const searchMatch =
        !query ||
        'rechercher'.includes(query.toLowerCase()) ||
        'terminal'.includes(query.toLowerCase());
      if (searchMatch) {
        list.unshift({
          id: 'action-search-terminal',
          label: 'Rechercher dans le terminal',
          sub: '⌘K → Recherche terminale',
          kind: 'action',
        });
      }
    }
    return list;
  }, [filtered, isTerminal, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setFocused(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((f) => Math.min(f + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((f) => Math.max(f - 1, 0));
      } else if (e.key === 'Enter') {
        const it = items[focused];
        if (!it) return;
        if (it.kind === 'tab' && it.tabId) onSelect(it.tabId);
        else if (it.id === 'action-search-terminal') onSearchTerminal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, focused, onClose, onSelect, onSearchTerminal]);

  // Global hotkey Cmd/Ctrl+K to open
  useEffect(() => {
    const onGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!open) {
          // We can't toggle from here without prop setter, so dispatch event
          window.dispatchEvent(new CustomEvent('mai:open-palette'));
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onGlobal);
    return () => window.removeEventListener('keydown', onGlobal);
  }, [open, onClose]);

  // Listen for external open event (from App)
  useEffect(() => {
    const h = () => {
      if (!open) {
        // App handles via state, but we also need to trigger - we dispatch custom to App via parent
        // No-op: App listens separately
      }
    };
    window.addEventListener('mai:open-palette' as never, h as never);
    return () => window.removeEventListener('mai:open-palette' as never, h as never);
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <section
        className="dialog"
        style={{
          width: 'min(640px, 90vw)',
          maxHeight: 'min(70vh, 560px)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <SearchIcon style={{ width: 18, height: 18, color: 'var(--muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocused(0);
            }}
            placeholder="Rechercher onglets ou action terminal… (Échap pour fermer)"
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              color: 'inherit',
              fontSize: 14,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '2px 6px',
            }}
          >
            ⌘K
          </span>
        </div>

        <div style={{ overflowY: 'auto', padding: 8 }}>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Aucun résultat
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((it, idx) => (
                <li key={it.id}>
                  <button
                    onClick={() => {
                      if (it.kind === 'tab' && it.tabId) onSelect(it.tabId);
                      else if (it.id === 'action-search-terminal') onSearchTerminal();
                    }}
                    onMouseEnter={() => setFocused(idx)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: 0,
                      background: idx === focused ? 'rgba(255,255,255,0.07)' : 'transparent',
                      color: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 7,
                        background: 'rgba(255,255,255,0.06)',
                        flex: '0 0 auto',
                      }}
                    >
                      {it.id === 'action-search-terminal' ? (
                        <TerminalIcon style={{ width: 16 }} />
                      ) : (
                        <SearchIcon style={{ width: 16 }} />
                      )}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {it.label}
                      </div>
                      {it.sub && (
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{it.sub}</div>
                      )}
                    </span>
                    {it.kind === 'tab' && it.tabId === activeId && (
                      <span style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 600 }}>
                        Actif
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--line)',
            fontSize: 11,
            color: 'var(--muted)',
            display: 'flex',
            gap: 12,
          }}
        >
          <span>↑↓ Naviguer</span>
          <span>↵ Sélectionner</span>
          <span>Échap Fermer</span>
        </div>
      </section>
    </div>
  );
}

// Add SearchIcon fallback if not exported
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <circle cx={11} cy={11} r={7} />
      <path d="m20 20-3-3" />
    </svg>
  );
}
