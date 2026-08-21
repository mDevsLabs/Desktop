import logo from '../../assets/icon.png';
import type { TabKind } from '../types';
import { SERVICES } from '../types';
import { GlobeIcon, SparkIcon, TerminalIcon, WindowIcon } from './Icons';

export function Home({
  desktop,
  open,
}: {
  desktop: boolean;
  open: (kind: TabKind, newWindow?: boolean) => void;
}) {
  const version = (import.meta.env.VITE_APP_VERSION as string | undefined) || '0.0.0';
  const cards = [
    ...(desktop ? [{ kind: 'terminal' as const, icon: TerminalIcon, accent: 'pink' }] : []),
    { kind: 'web' as const, icon: SparkIcon, accent: 'blue' },
    { kind: 'website' as const, icon: GlobeIcon, accent: 'green' },
  ];
  return (
    <main className="home">
      <section className="hero">
        <img src={logo} className="hero-logo" alt="mAI" />
        <div>
          <span className="eyebrow">TOUT mAI. UN SEUL ENDROIT.</span>
          <h1>
            Que voulez-vous
            <br />
            <span>faire aujourd’hui ?</span>
          </h1>
          <p>Vos outils mAI réunis dans une expérience simple, rapide et fluide.</p>
        </div>
      </section>
      <section className={`service-grid ${desktop ? '' : 'mobile-grid'}`}>
        {cards.map(({ kind, icon: Icon, accent }) => {
          const service = SERVICES[kind];
          return (
            <article className={`service-card ${accent}`} key={kind} onClick={() => open(kind)}>
              <div className="card-top">
                <div className="service-icon">
                  <Icon />
                </div>
                <span className="arrow">↗</span>
              </div>
              <h2>{service.title}</h2>
              <p>{service.subtitle}</p>
              <div className="card-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    open(kind);
                  }}
                >
                  Ouvrir
                </button>
                {desktop && (
                  <button
                    className="icon-button"
                    title="Ouvrir dans une nouvelle fenêtre"
                    onClick={(e) => {
                      e.stopPropagation();
                      open(kind, true);
                    }}
                  >
                    <WindowIcon />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
      <footer>
        <span className="status-dot" /> Services mAI disponibles <span>•</span> v{version}
      </footer>
    </main>
  );
}
