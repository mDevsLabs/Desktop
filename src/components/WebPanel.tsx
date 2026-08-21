import { useEffect, useRef, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { BackIcon, ForwardIcon, ExternalIcon, RefreshIcon } from './Icons';

type WebviewEl = HTMLElement & { goBack(): void; canGoBack(): boolean; goForward():void; canGoForward():boolean; reload(): void; getURL(): string };
export function WebPanel({ title, url, desktop }: { title: string; url: string; desktop: boolean }) {
  const view = useRef<WebviewEl | HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = view.current;
    if (!desktop || !el) return;
    const done = () => { setLoading(false); setFailed(false); };
    const fail = () => { setLoading(false); setFailed(true); };
    el.addEventListener('did-stop-loading', done); el.addEventListener('did-fail-load', fail);
    return () => { el.removeEventListener('did-stop-loading', done); el.removeEventListener('did-fail-load', fail); };
  }, [desktop]);
  const back = () => { try { const el = view.current as WebviewEl; if (desktop && el.canGoBack?.()) el.goBack(); else (view.current as HTMLIFrameElement)?.contentWindow?.history.back(); } catch {} };
  const forward = () => { try { const el=view.current as WebviewEl; if(desktop&&el.canGoForward?.())el.goForward(); else (view.current as HTMLIFrameElement)?.contentWindow?.history.forward(); } catch {} };
  const reload = () => { setLoading(true); setFailed(false); if (desktop) (view.current as WebviewEl)?.reload(); else { const frame = view.current as HTMLIFrameElement; frame.src = url; } };
  const external = () => desktop ? window.maiDesktop!.openExternal(url) : Browser.open({ url, presentationStyle: 'popover' });
  return <section className="web-panel">
    <header className="web-toolbar"><button onClick={back} title="Retour"><BackIcon/></button><button onClick={forward} title="Suivant"><ForwardIcon/></button><div className="address"><span className="lock">●</span><strong>{title}</strong><span>{new URL(url).hostname}</span></div><button onClick={reload} title="Actualiser"><RefreshIcon/></button><button onClick={() => void external()} title="Ouvrir dans le navigateur"><ExternalIcon/></button></header>
    <div className="web-content">
      {loading && <div className="web-loading"><div className="loader"/><span>Connexion à {title}…</span></div>}
      {desktop
        ? <webview ref={view as never} src={url} partition="persist:mai-web" />
        : <iframe ref={view as React.RefObject<HTMLIFrameElement>} src={url} title={title} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} allow="clipboard-read; clipboard-write" />}
      {failed && <div className="web-error"><h2>Impossible d’afficher cette page</h2><p>Le site peut être temporairement indisponible ou refuser l’intégration.</p><button className="primary" onClick={() => void external()}><ExternalIcon/> Ouvrir dans le navigateur</button></div>}
    </div>
  </section>;
}
