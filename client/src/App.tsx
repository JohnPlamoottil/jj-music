import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { ToastProvider } from './context/ToastContext';
import { Loading } from './components/ui/states';
import { AlbumDetail } from './pages/AlbumDetail';
import { Albums } from './pages/Albums';
import { ArtistDetail } from './pages/ArtistDetail';
import { Artists } from './pages/Artists';
import { Favorites } from './pages/Favorites';
import { Home } from './pages/Home';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { Playlists } from './pages/Playlists';
import { RecentlyPlayed } from './pages/RecentlyPlayed';
import { Settings } from './pages/Settings';
import { SignIn } from './pages/SignIn';
import { Songs } from './pages/Songs';
import { Upload } from './pages/Upload';

/**
 * Providers sit above the router so playback state — and the audio element it
 * owns — survives every navigation.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <PlayerProvider>
            <Gate />
          </PlayerProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

function Gate() {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="grid h-full place-items-center">
        <Loading label="Opening your library" />
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <Routes>
        <Route path="*" element={<SignIn />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                   focus:rounded-lg focus:bg-panel focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/songs" element={<Songs />} />
        <Route path="/albums" element={<Albums />} />
        <Route path="/albums/:albumId" element={<AlbumDetail />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/artists/:artistId" element={<ArtistDetail />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/playlists/:playlistId" element={<PlaylistDetail />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/recent" element={<RecentlyPlayed />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
