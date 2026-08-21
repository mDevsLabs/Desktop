import { useEffect, useMemo, useRef, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { BackIcon, ExternalIcon, ForwardIcon, LockIcon, RefreshIcon } from './Icons';

type WebviewEl = HTMLElement & {
  goBack(): void;
  canGoBack(): boolean;
  goForward(): void;
  canGoForward(): boolean;
  reload(): void;
  getURL(): string;
};

export function WebPanel({
  title,
  url,
  desktop,
}: {
  title: string;
  url: string;
  desktop: boolean;
}) {
  const view = useRef<WebviewEl | HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);

  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }, [url]);

  useEffect(() => {
    const el = view.current;
    if (!desktop || !el) return;
    const done = () => {
      setLoading(false);
      setFailed(false);
    };
    const fail = () => {
      setLoading(false);
      setFailed(true);
    };
    el.addEventListener('did-stop-loading', done);
    el.addEventListener('did-fail-load', fail);
    return () => {
      el.removeEventListener('did-stop-loading', done);
      el.removeEventListener('did-fail-load', fail);
    };
  }, [desktop, privateMode]);

  const back = () => {
    try {
      const el = view.current as WebviewEl;
      if (desktop && el.canGoBack?.()) el.goBack();
      else (view.current as HTMLIFrameElement)?.contentWindow?.history.back();
    } catch {
      // ignore
    }
  };

  const forward = () => {
    try {
      const el = view.current as WebviewEl;
      if (desktop && el.canGoForward?.()) el.goForward();
      else (view.current as HTMLIFrameElement)?.contentWindow?.history.forward();
    } catch {
      // ignore
    }
  };

  const reload = () => {
    setLoading(true);
    setFailed(false);
    if (desktop) (view.current as WebviewEl)?.reload();
    else {
      const frame = view.current as HTMLIFrameElement;
      if (frame) frame.src = url;
    }
  };

  const external = () =>
    desktop
      ? window.maiDesktop!.openExternal(url)
      : Browser.open({ url, presentationStyle: 'popover' });

  return (
    <section className="web-panel">
      <header className="web-toolbar">
        <button onClick={back} title="Retour" aria-label="Retour">
          <BackIcon />
        </button>
        <button onClick={forward} title="Suivant" aria-label="Suivant">
          <ForwardIcon />
        </button>
        <div className="address" title={`${title} — ${hostname}`}>
          <span className="lock" aria-hidden>
            ●
          </span>
          <strong>{title}</strong>
          <span>{hostname}</span>
        </div>
        <button onClick={reload} title="Actualiser" aria-label="Actualiser">
          <RefreshIcon />
        </button>
        <button
          className={privateMode ? 'active' : ''}
          onClick={() => setPrivateMode((v) => !v)}
          title="Navigation privée"
          aria-pressed={privateMode}
        >
          <LockIcon />
        </button>
        <button
          onClick={() => void external()}
          title="Ouvrir dans le navigateur"
          aria-label="Ouvrir externe"
        >
          <ExternalIcon />
        </button>
      </header>

      <div className="web-content">
        {loading && (
          <div className="web-loading" role="status" aria-live="polite">
            <div className="loader" />
            <span>Connexion à {title}…</span>
          </div>
        )}

        {desktop ? (
          <webview
            key={privateMode ? 'private' : 'main'}
            ref={view as never}
            src={url}
            partition={privateMode ? 'private-mai-web' : 'persist:mai-web'}
          />
        ) : (
          <iframe
            key={privateMode ? 'private' : 'main'}
            ref={view as React.RefObject<HTMLIFrameElement>}
            src={url}
            title={title}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            allow="clipboard-read; clipboard-write"
            referrerPolicy={privateMode ? 'no-referrer' : 'origin'}
          />
        )}

        {failed && (
          <div className="web-error" role="alert">
            <h2>Impossible d’afficher cette page</h2>
            <p>Le site peut être temporairement indisponible ou refuser l’intégration.</p>
            <button className="primary" onClick={() => void external()}>
              <ExternalIcon /> Ouvrir dans le navigateur
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
