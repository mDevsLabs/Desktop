import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { TerminalIcon } from './Icons';
import { Dropdown } from './Dropdown';
import type { CliShell } from './SettingsPanel';

type Status =
  'checking' | 'missing-mai' | 'missing-npm' | 'paused' | 'running' | 'exited' | 'error';

type Props = {
  title: string;
  onRename: (v: string) => void;
  onDuplicate: () => void;
  restored?: boolean;
  restoreMode?: 'automatic' | 'confirm' | 'manual';
  cliShell?: CliShell;
};

export function TerminalPanel({
  title,
  onRename,
  onDuplicate,
  restored = false,
  restoreMode = 'automatic',
  cliShell = 'default',
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const terminalId = useRef<string | undefined>(undefined);
  const terminal = useRef<Terminal | undefined>(undefined);
  const search = useRef<SearchAddon | undefined>(undefined);
  const fit = useRef<FitAddon | undefined>(undefined);
  const fontSizeRef = useRef(14);

  const [status, setStatus] = useState<Status>('checking');
  const [installing, setInstalling] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [error, setError] = useState('');

  const [shell, setShell] = useState<CliShell>(cliShell);
  const [updateMsg, setUpdateMsg] = useState<{
    ok: boolean;
    output: string;
  } | null>(null);
  const [updating, setUpdating] = useState(false);

  const desktop = Boolean(window.maiDesktop);

  // Sync shell preference → local state (before terminal starts)
  useEffect(() => {
    setShell(cliShell);
  }, [cliShell]);

  // Initial CLI status check
  useEffect(() => {
    let alive = true;
    void window
      .maiDesktop!.cliStatus()
      .then((s) => {
        if (!alive) return;
        if (!s.npm) setStatus('missing-npm');
        else if (!s.mai) setStatus('missing-mai');
        else if (restored && restoreMode !== 'automatic') setStatus('paused');
        else setStatus('running');
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e));
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [restored, restoreMode]);

  // Terminal lifecycle
  useEffect(() => {
    if (status !== 'running' || !host.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: fontSizeRef.current,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      scrollback: 10000,
      theme: {
        background: '#090b12',
        foreground: '#e9edf7',
        cursor: '#19d3c5',
        selectionBackground: '#315b7355',
        black: '#131722',
        brightBlack: '#667085',
      },
    });
    const fitAddon = new FitAddon();
    const find = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(find);
    term.open(host.current);
    terminal.current = term;
    search.current = find;
    fit.current = fitAddon;
    fitAddon.fit();
    term.focus();

    const id = crypto.randomUUID();
    terminalId.current = id;

    const offData = window.maiDesktop!.onTerminalData((p) => {
      if (p.id === id) term.write(p.data);
    });
    const offExit = window.maiDesktop!.onTerminalExit((p) => {
      if (p.id === id) setStatus('exited');
    });
    const input = term.onData((data) => window.maiDesktop!.writeTerminal(id, data));

    void window
      .maiDesktop!.startTerminal(
        id,
        installing ? 'install' : 'mai',
        shell === 'default' ? undefined : shell
      )
      .catch((e) => {
        setError(String(e));
        setStatus('error');
      });

    const resize = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        window.maiDesktop!.resizeTerminal(id, term.cols, term.rows);
      } catch {
        // ignore
      }
    });
    resize.observe(host.current);

    const onVisible = () =>
      setTimeout(() => {
        try {
          fitAddon.fit();
          term.focus();
        } catch {
          // ignore
        }
      }, 50);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('resize', onVisible);

    return () => {
      resize.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', onVisible);
      input.dispose();
      offData();
      offExit();
      window.maiDesktop!.killTerminal(id);
      terminalId.current = undefined;
      terminal.current = undefined;
      search.current = undefined;
      fit.current = undefined;
      term.dispose();
    };
  }, [status, installing, shell]);

  const updateCli = async () => {
    if (!window.maiDesktop) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const r = await window.maiDesktop.updateCli();
      setUpdateMsg(r);
    } catch (e) {
      setUpdateMsg({ ok: false, output: String(e) });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fontSizeRef.current = fontSize;
    const term = terminal.current;
    if (!term) return;
    term.options.fontSize = fontSize;
    try {
      fit.current?.fit();
      if (terminalId.current) {
        window.maiDesktop?.resizeTerminal(terminalId.current, term.cols, term.rows);
      }
    } catch {
      // ignore
    }
  }, [fontSize]);

  useEffect(() => {
    const h = () => setShowSearch(true);
    window.addEventListener('mai:focus-terminal-search' as never, h as never);
    return () => window.removeEventListener('mai:focus-terminal-search' as never, h as never);
  }, []);

  const restart = () => {
    setInstalling(false);
    setStatus('checking');
    void window
      .maiDesktop!.cliStatus()
      .then((s) => setStatus(s.mai ? 'running' : s.npm ? 'missing-mai' : 'missing-npm'))
      .catch((e) => {
        setError(String(e));
        setStatus('error');
      });
  };

  if (status === 'checking') {
    return (
      <div className="center-state">
        <div className="loader" />
        <h2>Recherche de mAI CLI…</h2>
      </div>
    );
  }
  if (status === 'missing-npm') {
    return (
      <div className="center-state">
        <TerminalIcon />
        <h2>Node.js et npm sont requis</h2>
        <p>Installez Node.js, puis relancez mAI.</p>
        <code>https://nodejs.org</code>
      </div>
    );
  }
  if (status === 'paused') {
    return (
      <div className="center-state">
        <TerminalIcon />
        <h2>Terminal restauré</h2>
        <p>
          {restoreMode === 'confirm'
            ? 'Confirmez la relance de mAI dans une nouvelle session locale.'
            : 'La relance automatique est désactivée dans les paramètres.'}
        </p>
        <button className="primary" onClick={() => setStatus('running')}>
          Démarrer mAI
        </button>
      </div>
    );
  }
  if (status === 'missing-mai') {
    return (
      <div className="center-state">
        <TerminalIcon />
        <h2>mAI CLI n’est pas encore installé</h2>
        <p>Cette action installe le paquet global après votre confirmation.</p>
        <code>npm install -g @mdevs/mai-cli</code>
        <button
          className="primary"
          onClick={() => {
            setInstalling(true);
            setStatus('running');
          }}
        >
          Installer mAI CLI
        </button>
      </div>
    );
  }
  if (status === 'exited') {
    return (
      <div className="center-state">
        <TerminalIcon />
        <h2>La session est terminée</h2>
        <div className="state-actions">
          <button className="primary" onClick={restart}>
            Relancer mAI
          </button>
          <button onClick={onDuplicate}>Nouveau terminal</button>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="center-state">
        <TerminalIcon />
        <h2>Impossible de démarrer le terminal</h2>
        <p>{error}</p>
        <button className="primary" onClick={restart}>
          Réessayer
        </button>
      </div>
    );
  }

  const platform = window.maiDesktop?.platform;
  const shellOptions: CliShell[] =
    platform === 'win32' ? ['default', 'cmd', 'powershell'] : ['default', 'bash', 'zsh'];
  const shellLabel = (s: CliShell): string =>
    s === 'default'
      ? 'Shell par défaut'
      : s === 'cmd'
        ? 'Invite de commandes'
        : s === 'powershell'
          ? 'PowerShell'
          : s === 'bash'
            ? 'Bash'
            : 'Zsh';

  return (
    <div className="terminal-wrap">
      <div className="terminal-tools">
        <button
          onClick={() => {
            const n = prompt('Nom du terminal', title);
            if (n?.trim()) onRename(n.trim());
          }}
        >
          Renommer
        </button>
        <button onClick={onDuplicate}>Dupliquer</button>
        <button onClick={() => setShowSearch((v) => !v)}>Rechercher</button>
        <button onClick={() => terminal.current?.clear()}>Effacer</button>
        <button
          onClick={() => void navigator.clipboard.writeText(terminal.current?.getSelection() || '')}
        >
          Copier
        </button>
        <button
          onClick={() =>
            void navigator.clipboard
              .readText()
              .then(
                (t) => terminalId.current && window.maiDesktop!.writeTerminal(terminalId.current, t)
              )
          }
        >
          Coller
        </button>

        {desktop && (
          <>
            <div style={{ minWidth: 168 }}>
              <Dropdown
                value={shell}
                onChange={(v) => setShell(v as CliShell)}
                ariaLabel="Shell utilisé"
                className="dropdown--sm"
                options={shellOptions.map((s) => ({
                  value: s,
                  label: shellLabel(s),
                }))}
              />
            </div>
            <button onClick={() => void updateCli()} disabled={updating}>
              {updating ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
          </>
        )}

        <span />
        <button
          onClick={() => setFontSize((v) => Math.max(10, v - 1))}
          aria-label="Réduire la taille"
        >
          A−
        </button>
        <button
          onClick={() => setFontSize((v) => Math.min(24, v + 1))}
          aria-label="Augmenter la taille"
        >
          A+
        </button>
      </div>

      {updateMsg && (
        <div className="terminal-update">
          <span>
            {updateMsg.ok ? '✓ ' : '⚠ '}
            {updateMsg.output.trim() ||
              (updateMsg.ok ? 'mAI CLI est à jour.' : 'Échec de la mise à jour.')}
          </span>
          <button onClick={() => setUpdateMsg(null)} aria-label="Fermer">
            ×
          </button>
        </div>
      )}

      {showSearch && (
        <div className="terminal-search">
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search.current?.findNext(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search.current?.findNext(query);
              if (e.key === 'Escape') setShowSearch(false);
            }}
            placeholder="Rechercher dans la sortie…"
          />
          <button onClick={() => search.current?.findPrevious(query)}>↑</button>
          <button onClick={() => search.current?.findNext(query)}>↓</button>
        </div>
      )}

      <div className="terminal-shell">
        <div ref={host} className="terminal-host" />
      </div>
    </div>
  );
}
