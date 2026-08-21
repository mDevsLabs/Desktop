import { useRef } from 'react';
import logo from '../../assets/icon.png';
import type { Tab, TabKind } from '../types';
import {
  CloseIcon,
  GlobeIcon,
  HomeIcon,
  PlusIcon,
  SparkIcon,
  TerminalIcon,
  WindowIcon,
} from './Icons';

const IconFor = ({ kind }: { kind: TabKind }) =>
  kind === 'home' ? (
    <HomeIcon />
  ) : kind === 'terminal' ? (
    <TerminalIcon />
  ) : kind === 'web' ? (
    <SparkIcon />
  ) : (
    <GlobeIcon />
  );

type Props = {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNewTab: () => void;
  onMove: (from: string, to: string) => void;
  account?: { username: string; avatarUrl?: string | null } | null;
  onOpenSettings: () => void;
  onOpenDownloads: () => void;
};

export function Titlebar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNewTab,
  onMove,
  account,
  onOpenSettings,
  onOpenDownloads,
}: Props) {
  const drag = useRef<string | undefined>(undefined);

  return (
    <header className="titlebar">
      <div className="brand">
        <img src={logo} alt="mAI" />
        <strong>mAI</strong>
      </div>

      <div className="tabs" role="tablist" aria-label="Onglets">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            draggable
            role="tab"
            aria-selected={tab.id === activeId}
            className={`tab ${tab.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(tab.id)}
            onDragStart={() => {
              drag.current = tab.id;
            }}
            onDragEnd={() => {
              drag.current = undefined;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const from = drag.current;
              drag.current = undefined;
              if (!from || from === tab.id) return;
              onMove(from, tab.id);
            }}
            title={tab.title}
          >
            <IconFor kind={tab.kind} />
            <span>{tab.title}</span>
            <i
              role="button"
              aria-label={`Fermer ${tab.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              <CloseIcon />
            </i>
          </button>
        ))}
        <button
          className="new-tab"
          onClick={onNewTab}
          title="Nouvel onglet"
          aria-label="Nouvel onglet"
        >
          <PlusIcon />
        </button>
      </div>

      {account && (
        <button
          className="account-badge"
          onClick={onOpenSettings}
          title={account.username}
          aria-label="Compte"
        >
          {account.avatarUrl ? (
            <img src={account.avatarUrl} alt="" />
          ) : (
            account.username.slice(0, 1).toUpperCase()
          )}
        </button>
      )}

      <button
        className="new-window"
        onClick={onOpenDownloads}
        title="Téléchargements"
        aria-label="Téléchargements"
      >
        ⇩
      </button>
      <button
        className="new-window"
        onClick={onOpenSettings}
        title="Paramètres"
        aria-label="Paramètres"
      >
        ⚙
      </button>
      <button
        className="new-window"
        onClick={() => void window.maiDesktop!.newWindow()}
        title="Nouvelle fenêtre"
        aria-label="Nouvelle fenêtre"
      >
        <WindowIcon />
      </button>
    </header>
  );
}
