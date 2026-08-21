import logo from '../../assets/icon.png';
import type { TabKind } from '../types';
import { GlobeIcon, HomeIcon, SparkIcon } from './Icons';

const IconFor = ({ kind }: { kind: TabKind }) =>
  kind === 'home' ? <HomeIcon /> : kind === 'web' ? <SparkIcon /> : <GlobeIcon />;

type Props = {
  activeKind: TabKind;
  onOpen: (k: TabKind) => void;
  account?: { username: string; avatarUrl?: string | null } | null;
  onOpenSettings: () => void;
  children: React.ReactNode;
};

export function MobileShell({ activeKind, onOpen, account, onOpenSettings, children }: Props) {
  return (
    <div className="app mobile-app">
      <header className="mobile-header">
        <img src={logo} alt="mAI" />
        <strong>mAI</strong>
        {account ? (
          <button
            className="header-avatar"
            onClick={onOpenSettings}
            title={account.username}
            aria-label="Ouvrir les paramètres"
          >
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt="" />
            ) : (
              account.username.slice(0, 1).toUpperCase()
            )}
          </button>
        ) : (
          <button className="header-action" onClick={onOpenSettings} aria-label="Paramètres">
            ⚙
          </button>
        )}
      </header>

      <div className="mobile-content">{children}</div>

      <nav className="mobile-nav" aria-label="Navigation principale">
        {(['home', 'web', 'website'] as TabKind[]).map((k) => (
          <button
            key={k}
            className={activeKind === k ? 'active' : ''}
            onClick={() => onOpen(k)}
            aria-current={activeKind === k ? 'page' : undefined}
          >
            <IconFor kind={k} />
            <span>{k === 'home' ? 'Accueil' : k === 'web' ? 'mAI Web' : 'Website'}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
