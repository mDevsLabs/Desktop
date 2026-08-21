import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
  session,
  screen,
  Notification,
  type WebContents,
  type DownloadItem,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn as spawnProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as pty from 'node-pty';
import { autoUpdater } from 'electron-updater';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
type TabKind = 'home' | 'terminal' | 'web' | 'website';
type SavedTab = { id: string; kind: TabKind; title: string };
type SavedWindow = {
  id: string;
  tabs: SavedTab[];
  activeId: string;
  bounds?: Electron.Rectangle;
};
type SessionEntry = { process: pty.IPty; ownerId: number };
type DownloadState = {
  id: string;
  filename: string;
  path: string;
  received: number;
  total: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  item?: DownloadItem;
};
const terminals = new Map<string, SessionEntry>();
const windowStates = new Map<string, SavedWindow>();
const windowIds = new Map<number, string>();
const downloads = new Map<string, DownloadState>();
const allowedRemoteHosts = new Set(['mai-officiel.vercel.app', 'mai-devs.vercel.app']);
let workspaceFile = '';
let persistTimer: NodeJS.Timeout | undefined;
let notificationsEnabled = true;

const validKind = (v: unknown): v is TabKind =>
  ['home', 'terminal', 'web', 'website'].includes(String(v));
function isAllowedHttpUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && allowedRemoteHosts.has(u.hostname);
  } catch {
    return false;
  }
}
function validBounds(b?: Electron.Rectangle) {
  if (!b || b.width < 600 || b.height < 400) return undefined;
  const visible = screen
    .getAllDisplays()
    .some(
      (d) =>
        b.x < d.bounds.x + d.bounds.width &&
        b.x + b.width > d.bounds.x &&
        b.y < d.bounds.y + d.bounds.height &&
        b.y + b.height > d.bounds.y
    );
  return visible ? b : undefined;
}
const WORKSPACE_VERSION = 1;

function persistWorkspace() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      // Atomic write via temp file to avoid corruption on crash
      const tmp = `${workspaceFile}.tmp`;
      fs.writeFileSync(
        tmp,
        JSON.stringify({ version: WORKSPACE_VERSION, windows: [...windowStates.values()] }, null, 2)
      );
      fs.renameSync(tmp, workspaceFile);
    } catch (e) {
      console.error('Workspace save failed', e);
    }
  }, 150);
}

function migrateWorkspace(raw: unknown): { version: number; windows: SavedWindow[] } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { version?: unknown; windows?: unknown };
  // Legacy: no version field → assume v1
  const version = typeof r.version === 'number' ? r.version : 1;
  if (version > WORKSPACE_VERSION) {
    console.warn(
      `Workspace version ${version} newer than app ${WORKSPACE_VERSION}, attempting to read`
    );
  }
  if (!Array.isArray(r.windows)) return { version, windows: [] };
  return { version, windows: r.windows as SavedWindow[] };
}

function loadWorkspace(): SavedWindow[] {
  try {
    const content = fs.readFileSync(workspaceFile, 'utf8');
    const raw = JSON.parse(content);
    const migrated = migrateWorkspace(raw);
    if (!migrated) throw new Error('Invalid workspace structure');
    if (!Array.isArray(migrated.windows)) return [];
    return migrated.windows
      .slice(0, 8)
      .map((w: SavedWindow) => ({
        id: String(w.id || randomUUID()),
        tabs: Array.isArray(w.tabs) ? w.tabs.filter((t) => validKind(t.kind)).slice(0, 30) : [],
        activeId: String(w.activeId || ''),
        bounds: validBounds(w.bounds),
      }))
      .filter((w: SavedWindow) => w.tabs.length);
  } catch (e) {
    // Backup corrupted file (garder actuelle = ne pas perdre données)
    try {
      if (workspaceFile && fs.existsSync(workspaceFile)) {
        const bak = `${workspaceFile}.bak.${Date.now()}`;
        fs.copyFileSync(workspaceFile, bak);
        console.error(`Workspace corrupted, backup créé: ${bak}`, e);
      }
    } catch (bakErr) {
      console.error('Backup workspace failed', bakErr);
    }
    return [];
  }
}
function createWindow(initialTab: TabKind = 'home', saved?: SavedWindow) {
  const id = saved?.id || randomUUID();
  const bounds = validBounds(saved?.bounds);
  const win = new BrowserWindow({
    width: bounds?.width || 1240,
    height: bounds?.height || 800,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 760,
    minHeight: 520,
    title: 'mAI',
    backgroundColor: '#07090f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });
  windowIds.set(win.webContents.id, id);
  windowStates.set(
    id,
    saved || {
      id,
      tabs: [
        {
          id: randomUUID(),
          kind: initialTab,
          title:
            initialTab === 'home'
              ? 'Accueil'
              : initialTab === 'terminal'
                ? 'mAI CLI'
                : initialTab === 'web'
                  ? 'mAI Web'
                  : 'mAI Website',
        },
      ],
      activeId: '',
    }
  );
  const updateBounds = () => {
    const s = windowStates.get(id);
    if (s && !win.isMinimized() && !win.isMaximized()) {
      s.bounds = win.getBounds();
      persistWorkspace();
    }
  };
  win.on('resize', updateBounds);
  win.on('move', updateBounds);
  win.once('ready-to-show', () => {
    win.show();
    if (saved) win.webContents.send('workspace:restored', saved);
  });
  if (isDev) void win.loadURL(`${process.env.VITE_DEV_SERVER_URL}?window=${id}`);
  else
    void win.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { window: id },
    });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => {
    killOwnedTerminals(win.webContents.id);
    windowIds.delete(win.webContents.id);
    if (BrowserWindow.getAllWindows().length > 0) {
      windowStates.delete(id);
      persistWorkspace();
    }
  });
  persistWorkspace();
  return win;
}
function killOwnedTerminals(ownerId: number) {
  for (const [id, t] of terminals)
    if (t.ownerId === ownerId) {
      try {
        t.process.kill();
      } catch {}
      terminals.delete(id);
    }
}
function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const c = spawnProcess(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
      windowsHide: true,
    });
    c.once('error', () => resolve(false));
    c.once('close', (code) => resolve(code === 0));
  });
}
function shellSpec(shell?: string) {
  if (process.platform === 'win32') {
    if (shell === 'powershell') return { file: 'powershell.exe', args: [] as string[] };
    return { file: process.env.COMSPEC || 'cmd.exe', args: [] as string[] };
  }
  if (shell === 'bash') return { file: '/bin/bash', args: ['-l'] };
  if (shell === 'zsh') return { file: '/bin/zsh', args: ['-l'] };
  return {
    file: process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'),
    args: ['-l'],
  };
}
function startTerminal(sender: WebContents, id: string, mode: 'mai' | 'install', shell?: string) {
  if (!/^[\w-]{8,64}$/.test(id) || terminals.has(id))
    throw new Error('Identifiant de terminal invalide');
  const spec = shellSpec(shell);
  const proc = pty.spawn(spec.file, spec.args, {
    name: process.platform === 'win32' ? 'xterm-color' : 'xterm-256color',
    cols: 100,
    rows: 30,
    cwd: app.getPath('home'),
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    } as Record<string, string>,
  });
  terminals.set(id, { process: proc, ownerId: sender.id });
  proc.onData((data) => {
    if (!sender.isDestroyed()) sender.send('terminal:data', { id, data });
  });
  proc.onExit(({ exitCode }) => {
    terminals.delete(id);
    if (!sender.isDestroyed()) sender.send('terminal:exit', { id, exitCode });
  });
  const command = mode === 'install' ? 'npm install -g @mdevs/mai-cli && mai' : 'mai';
  setTimeout(() => proc.write(`${command}\r`), 80);
  return id;
}
function broadcast(channel: string, payload: unknown) {
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(channel, payload);
}
function uniqueDownloadPath(filename: string) {
  const dir = app.getPath('downloads');
  const ext = path.extname(filename),
    base = path.basename(filename, ext);
  let p = path.join(dir, filename),
    n = 1;
  while (fs.existsSync(p)) p = path.join(dir, `${base} (${n++})${ext}`);
  return p;
}
function configureDownloads() {
  session.fromPartition('persist:mai-web').on('will-download', (_event, item) => {
    const id = randomUUID(),
      savePath = uniqueDownloadPath(item.getFilename());
    item.setSavePath(savePath);
    const state: DownloadState = {
      id,
      filename: path.basename(savePath),
      path: savePath,
      received: 0,
      total: item.getTotalBytes(),
      state: 'progressing',
      item,
    };
    downloads.set(id, state);
    broadcast('download:update', { ...state, item: undefined });
    item.on('updated', (_e, status) => {
      state.received = item.getReceivedBytes();
      state.total = item.getTotalBytes();
      state.state = status === 'interrupted' ? 'interrupted' : 'progressing';
      broadcast('download:update', { ...state, item: undefined });
    });
    item.once('done', (_e, status) => {
      state.state =
        status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'interrupted';
      state.received = item.getReceivedBytes();
      state.item = undefined;
      broadcast('download:update', state);
      if (status === 'completed' && notificationsEnabled && Notification.isSupported())
        new Notification({
          title: 'Téléchargement terminé',
          body: state.filename,
        }).show();
    });
  });
}

app.whenReady().then(() => {
  workspaceFile = path.join(app.getPath('userData'), 'workspace.json');
  session.defaultSession.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  const remote = session.fromPartition('persist:mai-web');
  remote.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  configureDownloads();

  // Auto-update — GitHub Releases (unsigned, latest.yml)
  if (!isDev) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    setTimeout(() => {
      void autoUpdater
        .checkForUpdatesAndNotify()
        .catch((e) => console.error('Auto-update check failed', e));
    }, 4000);
    autoUpdater.on('update-available', () => {
      broadcast('update:available', {});
      if (notificationsEnabled && Notification.isSupported())
        new Notification({
          title: 'Mise à jour disponible',
          body: 'Téléchargement en cours…',
        }).show();
    });
    autoUpdater.on('update-downloaded', () => {
      broadcast('update:downloaded', {});
      if (notificationsEnabled && Notification.isSupported()) {
        const n = new Notification({
          title: 'Mise à jour prête',
          body: 'Cliquez pour redémarrer et installer.',
        });
        n.on('click', () => autoUpdater.quitAndInstall());
        n.show();
      }
    });
    autoUpdater.on('error', (err) => console.error('Auto-updater error', err));
  }
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event, prefs, params) => {
      delete prefs.preload;
      prefs.nodeIntegration = false;
      prefs.contextIsolation = true;
      prefs.sandbox = true;
      if (!isAllowedHttpUrl(params.src)) event.preventDefault();
    });
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://')) void shell.openExternal(url);
        return { action: 'deny' };
      });
      contents.on('will-navigate', (e, url) => {
        if (!isAllowedHttpUrl(url)) {
          e.preventDefault();
          if (url.startsWith('https://')) void shell.openExternal(url);
        }
      });
    }
  });
  ipcMain.handle('app:new-window', (_e, kind: TabKind) =>
    createWindow(validKind(kind) ? kind : 'home')
  );
  ipcMain.handle('app:open-external', (_e, url: string) =>
    isAllowedHttpUrl(url) ? shell.openExternal(url) : false
  );
  ipcMain.handle('cli:status', async () => ({
    mai: await commandExists('mai'),
    npm: await commandExists('npm'),
  }));
  ipcMain.handle('terminal:start', (e, { id, mode, shell }) =>
    startTerminal(e.sender, id, mode, shell)
  );
  ipcMain.handle('cli:update', async () => {
    if (!(await commandExists('npm')))
      return {
        ok: false,
        output: 'npm est introuvable. Installez Node.js puis relancez mAI.',
      };
    return new Promise<{ ok: boolean; output: string }>((resolve) => {
      const bin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const c = spawnProcess(bin, ['install', '-g', '@mdevs/mai-cli@latest'], {
        windowsHide: true,
      });
      let out = '';
      const feed = (d: Buffer) => {
        out += d.toString();
      };
      c.stdout.on('data', feed);
      c.stderr.on('data', feed);
      c.on('error', (e) => resolve({ ok: false, output: String(e) }));
      c.on('close', (code) => resolve({ ok: code === 0, output: out.slice(-3000) }));
    });
  });
  ipcMain.on('terminal:write', (e, { id, data }) => {
    const t = terminals.get(id);
    if (t?.ownerId === e.sender.id && typeof data === 'string' && data.length < 10000)
      t.process.write(data);
  });
  ipcMain.on('terminal:resize', (e, { id, cols, rows }) => {
    const t = terminals.get(id);
    if (
      t?.ownerId === e.sender.id &&
      Number.isInteger(cols) &&
      Number.isInteger(rows) &&
      cols > 1 &&
      rows > 1 &&
      cols < 1000 &&
      rows < 500
    )
      t.process.resize(cols, rows);
  });
  ipcMain.on('terminal:kill', (e, id: string) => {
    const t = terminals.get(id);
    if (t?.ownerId === e.sender.id) {
      t.process.kill();
      terminals.delete(id);
    }
  });
  ipcMain.handle('workspace:get', (e) => windowStates.get(windowIds.get(e.sender.id) || ''));
  ipcMain.on('workspace:save', (e, payload: SavedWindow) => {
    const id = windowIds.get(e.sender.id);
    if (!id || !payload || !Array.isArray(payload.tabs)) return;
    const tabs = payload.tabs
      .filter((t) => validKind(t.kind) && typeof t.id === 'string')
      .slice(0, 30);
    if (tabs.length) {
      const current = windowStates.get(id);
      windowStates.set(id, {
        id,
        tabs,
        activeId: String(payload.activeId),
        bounds: current?.bounds,
      });
      persistWorkspace();
    }
  });
  ipcMain.on('preferences:notifications', (_e, enabled: boolean) => {
    notificationsEnabled = enabled === true;
  });
  ipcMain.handle('app:check-updates', () => {
    if (isDev) return { disabled: true };
    void autoUpdater.checkForUpdatesAndNotify().catch((e) => console.error(e));
    return { checking: true };
  });
  ipcMain.handle('app:quit-and-install', () => autoUpdater.quitAndInstall());
  ipcMain.handle('download:list', () =>
    [...downloads.values()].map((d) => ({ ...d, item: undefined }))
  );
  ipcMain.handle('download:action', (_e, { id, action }) => {
    const d = downloads.get(id);
    if (!d) return false;
    if (action === 'cancel') d.item?.cancel();
    else if (action === 'open' && d.state === 'completed') void shell.openPath(d.path);
    else if (action === 'show' && d.state === 'completed') shell.showItemInFolder(d.path);
    else if (action === 'remove') {
      if (d.state === 'progressing') d.item?.cancel();
      downloads.delete(id);
      broadcast('download:remove', id);
    }
    return true;
  });
  const send = (c: string) => BrowserWindow.getFocusedWindow()?.webContents.send(c);
  const sendTabIndex = (idx: number) =>
    BrowserWindow.getFocusedWindow()?.webContents.send('menu:select-tab', idx);
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'mAI',
        submenu: [
          {
            label: 'Nouvelle fenêtre',
            accelerator: 'CmdOrCtrl+N',
            click: () => createWindow(),
          },
          {
            label: 'Vérifier les mises à jour',
            click: () => {
              if (!isDev) void autoUpdater.checkForUpdatesAndNotify();
              else void shell.openExternal('https://github.com/anomalyco/opencode/releases');
            },
          },
          { type: 'separator' },
          { role: process.platform === 'darwin' ? 'close' : 'quit' },
        ],
      },
      {
        label: 'Fichier',
        submenu: [
          {
            label: 'Nouvel onglet',
            accelerator: 'CmdOrCtrl+T',
            click: () => send('menu:new-tab'),
          },
          {
            label: 'Nouveau terminal',
            accelerator: 'CmdOrCtrl+Shift+T',
            click: () => send('menu:new-terminal'),
          },
          {
            label: 'Fermer l’onglet',
            accelerator: 'CmdOrCtrl+W',
            click: () => send('menu:close-tab'),
          },
        ],
      },
      {
        label: 'Onglets',
        submenu: [
          ...Array.from({ length: 9 }, (_, i) => ({
            label: i === 8 ? 'Aller au dernier onglet' : `Aller à l'onglet ${i + 1}`,
            accelerator: `CmdOrCtrl+${i + 1}`,
            click: () => sendTabIndex(i),
          })),
          { type: 'separator' },
          {
            label: 'Onglet suivant',
            accelerator: 'CmdOrCtrl+Tab',
            click: () => send('menu:next-tab'),
          },
          {
            label: 'Onglet précédent',
            accelerator: 'CmdOrCtrl+Shift+Tab',
            click: () => send('menu:prev-tab'),
          },
        ],
      },
      {
        label: 'Affichage',
        submenu: [
          { role: 'reload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
        ],
      },
    ])
  );
  const saved = loadWorkspace();
  if (saved.length) saved.forEach((s) => createWindow('home', s));
  else createWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on('before-quit', () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    try {
      const tmp = `${workspaceFile}.tmp`;
      fs.writeFileSync(
        tmp,
        JSON.stringify({ version: WORKSPACE_VERSION, windows: [...windowStates.values()] }, null, 2)
      );
      fs.renameSync(tmp, workspaceFile);
    } catch {}
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
