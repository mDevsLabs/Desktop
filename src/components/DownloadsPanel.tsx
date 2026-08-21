import { useEffect, useState } from 'react';
import { CloseIcon, ExternalIcon } from './Icons';
type D = {
  id: string;
  filename: string;
  path: string;
  received: number;
  total: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
};
export function DownloadsPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<D[]>([]);
  useEffect(() => {
    void window.maiDesktop!.listDownloads().then(setItems);
    const u = window.maiDesktop!.onDownloadUpdate((d) =>
      setItems((x) => [d, ...x.filter((i) => i.id !== d.id)])
    );
    const r = window.maiDesktop!.onDownloadRemove((id) =>
      setItems((x) => x.filter((i) => i.id !== id))
    );
    return () => {
      u();
      r();
    };
  }, []);
  const act = (d: D, a: 'cancel' | 'open' | 'show' | 'remove') =>
    void window.maiDesktop!.downloadAction(d.id, a);
  return (
    <div className="overlay">
      <section className="dialog downloads">
        <header>
          <div>
            <span className="eyebrow">FICHIERS</span>
            <h2>Téléchargements</h2>
          </div>
          <button onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        <div className="download-list">
          {!items.length && (
            <div className="empty">
              <ExternalIcon />
              <strong>Aucun téléchargement</strong>
              <p>Les fichiers téléchargés depuis les services mAI apparaîtront ici.</p>
            </div>
          )}
          {items.map((d) => {
            const progress = d.total ? Math.round((d.received / d.total) * 100) : 0;
            return (
              <article key={d.id}>
                <div className="download-name">
                  <strong>{d.filename}</strong>
                  <span>
                    {d.state === 'progressing'
                      ? `${progress} %`
                      : d.state === 'completed'
                        ? 'Terminé'
                        : d.state === 'cancelled'
                          ? 'Annulé'
                          : 'Interrompu'}
                  </span>
                </div>
                <div className="progress">
                  <i
                    style={{
                      width: `${d.state === 'completed' ? 100 : progress}%`,
                    }}
                  />
                </div>
                <div className="download-actions">
                  {d.state === 'progressing' ? (
                    <button onClick={() => act(d, 'cancel')}>Annuler</button>
                  ) : (
                    <>
                      {d.state === 'completed' && (
                        <>
                          <button onClick={() => act(d, 'open')}>Ouvrir</button>
                          <button onClick={() => act(d, 'show')}>Afficher dans le dossier</button>
                        </>
                      )}
                      <button onClick={() => act(d, 'remove')}>Retirer</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
