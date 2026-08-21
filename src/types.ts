export type TabKind = 'home' | 'terminal' | 'web' | 'website';
export type Tab = { id: string; kind: TabKind; title: string };
export const SERVICES = {
  terminal: {
    title: 'mAI CLI',
    subtitle: 'Votre assistant dans un vrai terminal local',
  },
  web: {
    title: 'mAI Web',
    subtitle: 'Discutez avec mAI sur le Web',
    url: 'https://mai-officiel.vercel.app',
  },
  website: {
    title: 'mAI Website',
    subtitle: 'Découvrez l’univers et les outils mAI',
    url: 'https://mai-devs.vercel.app',
  },
} as const;
