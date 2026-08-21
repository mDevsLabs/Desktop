import { useEffect, useState } from 'react';
import { defaults, type Preferences } from '../components/SettingsPanel';

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem('mai.preferences');
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs);

  useEffect(() => {
    localStorage.setItem('mai.preferences', JSON.stringify(prefs));

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = () => {
      const systemIsLight = media.matches;
      const theme = prefs.theme === 'system' ? (systemIsLight ? 'light' : 'dark') : prefs.theme;
      document.documentElement.dataset.theme = theme;
    };
    applyTheme();

    // Listen for system changes when in 'system' mode
    const onChange = () => {
      if (prefs.theme === 'system') applyTheme();
    };
    media.addEventListener('change', onChange);

    document.documentElement.classList.toggle('reduced-motion', prefs.reducedMotion);

    if (window.maiDesktop) {
      window.maiDesktop.setNotifications(prefs.notifications);
    }

    return () => media.removeEventListener('change', onChange);
  }, [prefs]);

  return [prefs, setPrefs] as const;
}
