export {};
type TabKind = 'home' | 'terminal' | 'web' | 'website';
type SavedTab = { id: string; kind: TabKind; title: string };
type SavedWindow = { id: string; tabs: SavedTab[]; activeId: string };
type DownloadInfo = {
  id: string;
  filename: string;
  path: string;
  received: number;
  total: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
};
declare global {
  interface Window {
    maiDesktop?: {
      platform: string;
      newWindow(kind?: TabKind): Promise<void>;
      openExternal(url: string): Promise<void>;
      cliStatus(): Promise<{ mai: boolean; npm: boolean }>;
      startTerminal(id: string, mode: 'mai' | 'install', shell?: string): Promise<string>;
      writeTerminal(id: string, data: string): void;
      resizeTerminal(id: string, cols: number, rows: number): void;
      killTerminal(id: string): void;
      updateCli(): Promise<{ ok: boolean; output: string }>;
      onTerminalData(cb: (p: { id: string; data: string }) => void): () => void;
      onTerminalExit(cb: (p: { id: string; exitCode: number }) => void): () => void;
      getWorkspace(): Promise<SavedWindow | undefined>;
      saveWorkspace(s: SavedWindow): void;
      onWorkspaceRestored(cb: (s: SavedWindow) => void): () => void;
      setNotifications(enabled: boolean): void;
      listDownloads(): Promise<DownloadInfo[]>;
      downloadAction(id: string, action: 'cancel' | 'open' | 'show' | 'remove'): Promise<boolean>;
      onDownloadUpdate(cb: (d: DownloadInfo) => void): () => void;
      onDownloadRemove(cb: (id: string) => void): () => void;
      onMenuNewTab(cb: () => void): () => void;
      onMenuNewTerminal(cb: () => void): () => void;
      onMenuCloseTab(cb: () => void): () => void;
      onMenuSelectTab(cb: (idx: number) => void): () => void;
      onMenuNextTab(cb: () => void): () => void;
      onMenuPrevTab(cb: () => void): () => void;
      checkForUpdates(): Promise<{ checking?: boolean; disabled?: boolean }>;
      quitAndInstall(): Promise<void>;
      onUpdateAvailable(cb: () => void): () => void;
      onUpdateDownloaded(cb: () => void): () => void;
    };
  }
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
      };
    }
  }
}
