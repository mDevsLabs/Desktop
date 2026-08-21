import { useState } from 'react';
import type { AccountApi } from '../services/account';
import { CloseIcon } from './Icons';
import { Dropdown } from './Dropdown';
export type CliShell = 'default' | 'cmd' | 'powershell' | 'bash' | 'zsh';
export type Preferences = {
  theme: 'dark' | 'light' | 'system';
  restoreTerminals: 'automatic' | 'confirm' | 'manual';
  notifications: boolean;
  reducedMotion: boolean;
  cliShell: CliShell;
};
export const defaults: Preferences = {
  theme: 'system',
  restoreTerminals: 'automatic',
  notifications: true,
  reducedMotion: false,
  cliShell: 'default',
};

const VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || '0.0.0';
const TIER_LABEL: Record<string, string> = {
  Free: 'Gratuit',
  Plus: 'Plus',
  Pro: 'Pro',
  Max: 'Max',
};

function shellChoices(): { value: CliShell; label: string }[] {
  const platform = window.maiDesktop?.platform;
  const base = { value: 'default' as CliShell, label: 'Shell par défaut' };
  if (platform === 'win32')
    return [
      base,
      { value: 'cmd', label: 'Invite de commandes (cmd)' },
      { value: 'powershell', label: 'PowerShell' },
    ];
  return [base, { value: 'bash', label: 'Bash' }, { value: 'zsh', label: 'Zsh' }];
}

function AccountSection({ account }: { account: AccountApi }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const {
    account: data,
    phase,
    error,
    pendingEmail,
    startLogin,
    startRegister,
    submitOtp,
    resend,
    logout,
    refresh,
  } = account;
  const busy = phase === 'busy';
  const pct = data
    ? Math.min(100, Math.round((data.requestUsed / Math.max(1, data.requestLimit)) * 100))
    : 0;

  return (
    <div className="setting-group">
      <div className="setting-row column">
        <div>
          <strong>Compte mAI</strong>
          <p>Connectez-vous pour synchroniser votre profil et vos quotas.</p>
        </div>
        {data ? (
          <div className="account-card">
            <div className="account-head">
              {data.avatarUrl ? (
                <img src={data.avatarUrl} alt="" className="account-avatar" />
              ) : (
                <div className="account-avatar">{data.username.slice(0, 1).toUpperCase()}</div>
              )}
              <div>
                <div className="account-name">{data.username}</div>
                <div className="account-email">{data.email}</div>
              </div>
              <span className="tier-badge">{TIER_LABEL[data.tier] || data.tier}</span>
            </div>
            <div className="quota">
              <div className="quota-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="quota-label">
                {data.requestUsed} / {data.requestLimit} requêtes ce mois-ci
              </div>
            </div>
            <div className="account-actions">
              <button onClick={() => void refresh()}>Actualiser</button>
              <button onClick={logout}>Se déconnecter</button>
            </div>
          </div>
        ) : phase === 'otp' ? (
          <div className="otp-box">
            <p>
              Un code de vérification a été envoyé à <strong>{pendingEmail}</strong>.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code à 6 chiffres"
              inputMode="numeric"
            />
            <div className="account-actions">
              <button
                className="primary"
                disabled={busy || !code}
                onClick={() => void submitOtp(code)}
              >
                {busy ? 'Vérification…' : 'Vérifier'}
              </button>
              <button disabled={busy} onClick={() => void resend()}>
                Renvoyer le code
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-box">
            <div className="auth-tabs">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
                Se connecter
              </button>
              <button
                className={mode === 'register' ? 'active' : ''}
                onClick={() => setMode('register')}
              >
                S’inscrire
              </button>
            </div>
            {mode === 'register' && (
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom de profil"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse e-mail"
              inputMode="email"
            />
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
            />
            <button
              className="primary"
              disabled={busy || !email || !password || (mode === 'register' && !username)}
              onClick={() =>
                void (mode === 'register'
                  ? startRegister(email, username, password)
                  : startLogin(email, password))
              }
            >
              {busy ? 'Envoi…' : 'Continuer'}
            </button>
          </div>
        )}
        {error && (
          <div
            className={`account-note ${phase === 'otp' && error.includes('renvoyé') ? 'ok' : 'err'}`}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPanel({
  value,
  onChange,
  onClose,
  account,
}: {
  value: Preferences;
  onChange: (p: Preferences) => void;
  onClose: () => void;
  account: AccountApi;
}) {
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) =>
    onChange({ ...value, [k]: v });
  const [updateMsg, setUpdateMsg] = useState<{
    ok: boolean;
    output: string;
  } | null>(null);
  const [updating, setUpdating] = useState(false);
  const desktop = Boolean(window.maiDesktop);
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
  const shells = shellChoices();
  return (
    <div className="overlay">
      <section className="dialog settings">
        <header>
          <div>
            <span className="eyebrow">PRÉFÉRENCES</span>
            <h2>Paramètres</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer">
            <CloseIcon />
          </button>
        </header>
        <div className="setting-row">
          <div>
            <strong>Apparence</strong>
            <p>Thème de l’interface mAI</p>
          </div>
          <Dropdown
            value={value.theme}
            onChange={(v) => set('theme', v as Preferences['theme'])}
            ariaLabel="Thème"
            options={[
              { value: 'dark', label: 'Sombre' },
              { value: 'light', label: 'Clair' },
              { value: 'system', label: 'Système' },
            ]}
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Shell du terminal</strong>
            <p>Shell utilisé pour lancer mAI CLI</p>
          </div>
          <Dropdown
            value={value.cliShell}
            onChange={(v) => set('cliShell', v as CliShell)}
            ariaLabel="Shell du terminal"
            options={shells}
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Terminaux restaurés</strong>
            <p>Action au redémarrage de l’application</p>
          </div>
          <Dropdown
            value={value.restoreTerminals}
            onChange={(v) => set('restoreTerminals', v as Preferences['restoreTerminals'])}
            ariaLabel="Terminaux restaurés"
            options={[
              { value: 'automatic', label: 'Relancer automatiquement' },
              { value: 'confirm', label: 'Demander confirmation' },
              { value: 'manual', label: 'Ne pas relancer' },
            ]}
          />
        </div>
        <label className="setting-row">
          <div>
            <strong>Notifications natives</strong>
            <p>Téléchargements et erreurs importantes</p>
          </div>
          <input
            type="checkbox"
            checked={value.notifications}
            onChange={(e) => set('notifications', e.target.checked)}
          />
        </label>
        <label className="setting-row">
          <div>
            <strong>Réduire les animations</strong>
            <p>Limiter les transitions visuelles</p>
          </div>
          <input
            type="checkbox"
            checked={value.reducedMotion}
            onChange={(e) => set('reducedMotion', e.target.checked)}
          />
        </label>
        {desktop && (
          <div className="setting-row column">
            <div>
              <strong>mAI CLI</strong>
              <p>Mettre à jour le paquet global via npm</p>
            </div>
            <button className="primary" disabled={updating} onClick={() => void updateCli()}>
              {updating ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
            {updateMsg && (
              <div className={`account-note ${updateMsg.ok ? 'ok' : 'err'}`}>
                {updateMsg.output.trim() ||
                  (updateMsg.ok ? 'mAI CLI est à jour.' : 'Échec de la mise à jour.')}
              </div>
            )}
          </div>
        )}
        <AccountSection account={account} />
        <div className="setting-row">
          <div>
            <strong>Version</strong>
            <p>Version installée de mAI</p>
          </div>
          <span className="version-tag">v{VERSION}</span>
        </div>
        <div className="settings-note">
          Les paramètres sont enregistrés automatiquement sur cet appareil.
        </div>
      </section>
    </div>
  );
}
