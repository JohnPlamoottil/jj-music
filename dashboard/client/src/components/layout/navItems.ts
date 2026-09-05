import {
  Clock,
  Disc3,
  Heart,
  Home,
  ListMusic,
  Music2,
  Settings,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Full navigation, used by the desktop sidebar and the phone "More" sheet. */
export const PRIMARY: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/songs', label: 'Songs', icon: Music2 },
  { to: '/albums', label: 'Albums', icon: Disc3 },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
];

export const SECONDARY: NavItem[] = [
  { to: '/favorites', label: 'Favourites', icon: Heart },
  { to: '/recent', label: 'Recently played', icon: Clock },
  { to: '/upload', label: 'Upload music', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Four tabs plus More is the most a thumb can reach comfortably. */
export const TABS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/songs', label: 'Songs', icon: Music2 },
  { to: '/albums', label: 'Albums', icon: Disc3 },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
];
