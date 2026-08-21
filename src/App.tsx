import { useCallback, useEffect, useState } from 'react';
import { Home } from './components/Home';
import { TerminalPanel } from './components/TerminalPanel';
import { WebPanel } from './components/WebPanel';
import { DownloadsPanel } from './components/DownloadsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Titlebar } from './components/Titlebar';
import { MobileShell } from './components/MobileShell';
import { CommandPalette } from './components/CommandPalette';
import { SERVICES, type Tab } from './types';
import { useAccount } from './services/account';
import { useTabs } from './hooks/useTabs';
import { usePreferences } from './hooks/usePreferences';
import { useWorkspace } from './hooks/useWorkspace';
import { useDesktopMenu } from './hooks/useDesktopMenu';
import { useMobileBack } from './hooks/useMobileBack';

const isDesktop = Boolean(window.maiDesktop);

export default function App() {
  const { tabs, setTabs, activeId, setActiveId, active, open, close, rename, duplicate, moveTab } =
    useTabs();
  const [prefs, setPrefs] = usePreferences();
  const { hydrated, restoredIds } = useWorkspace({
    tabs,
    setTabs,
    activeId,
    setActiveId,
    enabled: isDesktop,
  });

  const [settings, setSettings] = useState(false);
  const [downloads, setDownloads] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const account = useAccount();

  useDesktopMenu({ enabled: isDesktop, open, close, activeId, tabs, setActiveId });
  useMobileBack({
    enabled: isDesktop,
    activeKind: active.kind,
    openHome: useCallback(() => open('home'), [open]),
  });

  // Global search Cmd+K / Ctrl+K
  const handlePaletteSelect = useCallback(
    (tabId: string) => {
      setActiveId(tabId);
      setPaletteOpen(false);
    },
    [setActiveId]
  );

  const handlePaletteOpenTerminalSearch = useCallback(() => {
    // Focus terminal search - handled via event
    window.dispatchEvent(new CustomEvent('mai:focus-terminal-search'));
    setPaletteOpen(false);
  }, []);

  const render = useCallback(
    (tab: Tab) => {
      if (tab.kind === 'home') return <Home desktop={isDesktop} open={open} />;
      if (tab.kind === 'terminal') {
        return (
          <TerminalPanel
            title={tab.title}
            onRename={(v) => rename(tab.id, v)}
            onDuplicate={() => duplicate(tab)}
            restored={restoredIds.has(tab.id)}
            restoreMode={prefs.restoreTerminals}
            cliShell={prefs.cliShell}
          />
        );
      }
      return (
        <WebPanel
          desktop={isDesktop}
          title={SERVICES[tab.kind].title}
          url={SERVICES[tab.kind].url}
        />
      );
    },
    [open, rename, duplicate, restoredIds, prefs.restoreTerminals, prefs.cliShell]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mai:open-palette' as never, onOpen as never);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mai:open-palette' as never, onOpen as never);
    };
  }, []);

  if (!isDesktop) {
    return (
      <>
        <MobileShell
          activeKind={active.kind}
          onOpen={open}
          account={account.account}
          onOpenSettings={() => setSettings(true)}
        >
          <div key={active.id} style={{ height: '100%' }}>
            {render(active)}
          </div>
        </MobileShell>
        {settings && (
          <SettingsPanel
            value={prefs}
            onChange={setPrefs}
            onClose={() => setSettings(false)}
            account={account}
          />
        )}
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          tabs={tabs}
          activeId={activeId}
          onSelect={handlePaletteSelect}
          onSearchTerminal={handlePaletteOpenTerminalSearch}
        />
      </>
    );
  }

  // Desktop: gate on hydrated to avoid flash of empty workspace
  if (!hydrated) {
    return (
      <div className="app desktop-app">
        <div className="center-state">
          <div className="loader" />
          <h2>Chargement de l’espace de travail…</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app desktop-app">
      <Titlebar
        tabs={tabs}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={close}
        onNewTab={() => open('home')}
        onMove={moveTab}
        account={account.account}
        onOpenSettings={() => setSettings(true)}
        onOpenDownloads={() => setDownloads(true)}
      />

      <div className="desktop-content">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab-pane ${t.id === activeId ? 'active' : ''}`}
            role="tabpanel"
            aria-hidden={t.id !== activeId}
          >
            {render(t)}
          </div>
        ))}
      </div>

      {settings && (
        <SettingsPanel
          value={prefs}
          onChange={setPrefs}
          onClose={() => setSettings(false)}
          account={account}
        />
      )}
      {downloads && <DownloadsPanel onClose={() => setDownloads(false)} />}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        tabs={tabs}
        activeId={activeId}
        onSelect={handlePaletteSelect}
        onSearchTerminal={handlePaletteOpenTerminalSearch}
      />
    </div>
  );
}
