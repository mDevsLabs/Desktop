import {
  AppWindow,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Home,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const TerminalIcon = (p: IconProps) => <Terminal {...p} />;
export const GlobeIcon = (p: IconProps) => <Globe {...p} />;
export const SparkIcon = (p: IconProps) => <Sparkles {...p} />;
export const PlusIcon = (p: IconProps) => <Plus {...p} />;
export const BackIcon = (p: IconProps) => <ArrowLeft {...p} />;
export const ForwardIcon = (p: IconProps) => <ArrowRight {...p} />;
export const ExternalIcon = (p: IconProps) => <ExternalLink {...p} />;
export const RefreshIcon = (p: IconProps) => <RefreshCw {...p} />;
export const WindowIcon = (p: IconProps) => <AppWindow {...p} />;
export const CloseIcon = (p: IconProps) => <X {...p} />;
export const HomeIcon = (p: IconProps) => <Home {...p} />;
export const LockIcon = (p: IconProps) => <Lock {...p} />;
