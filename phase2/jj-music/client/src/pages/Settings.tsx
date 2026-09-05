import { useState, type ReactNode } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { USE_MOCK_API } from '../services/http';
import { resetMockLibrary } from '../services/mockApi';

export function Settings() {
  const { user, signOut } = useAuth();
  const { notify } = useToast();
  const [installed] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true,
  );

  return (
    <>
      <TopBar title="Settings" />

      <div className="space-y-4">
        <Section title="Account">
          <Row label="Signed in as" value={user?.email ?? 'Not signed in'} />
          <div className="pt-2">
            <button className="btn-quiet h-10 px-4 text-sm" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </Section>

        <Section title="Install on your iPhone">
          {installed ? (
            <p className="text-sm text-muted">
              You are running JJ Music as an installed app. Playback continues when you lock the
              screen, and the Lock Screen controls appear while a song is loaded.
            </p>
          ) : (
            <ol className="space-y-2 text-sm text-muted">
              <li>1. Open this page in Safari on your iPhone.</li>
              <li>2. Tap the Share button.</li>
              <li>3. Choose Add to Home Screen, then Add.</li>
            </ol>
          )}
        </Section>

        <Section title="Offline music">
          <p className="text-sm leading-relaxed text-muted">
            Downloading songs for offline listening is not switched on yet. Storing whole audio files
            in the browser is subject to quotas that iOS can clear without warning, so it will arrive
            as a per-song, explicitly chosen option behind an experimental flag rather than a silent
            cache of your whole library. Nothing is cached today.
          </p>
        </Section>

        <Section title="Lock Screen controls">
          <p className="text-sm leading-relaxed text-muted">
            JJ Music hands the current title, artist, album and artwork to the system when the browser
            supports the Media Session API, and connects play, pause, next, previous and seeking. iOS
            ignores some of these, and support differs by version, so any control the browser does not
            offer is simply left out rather than shown as a button that does nothing.
          </p>
          <Row
            label="Media Session support"
            value={'mediaSession' in navigator ? 'Available in this browser' : 'Not available in this browser'}
          />
        </Section>

        {USE_MOCK_API && (
          <Section title="Sample library">
            <p className="text-sm leading-relaxed text-muted">
              This build runs against sample metadata held in your browser, not a server. No music
              ships with JJ Music. Audio you add here plays for this session only, and edits are
              stored locally. Set VITE_USE_MOCK_API=false once the API is running.
            </p>
            <div className="pt-2">
              <button
                className="btn-quiet h-10 px-4 text-sm"
                onClick={() => {
                  resetMockLibrary();
                  notify('Sample library reset');
                  window.location.reload();
                }}
              >
                Reset sample library
              </button>
            </div>
          </Section>
        )}

        <Section title="Keyboard controls">
          <ul className="space-y-1.5 text-sm text-muted">
            <li>Space — play or pause</li>
            <li>Left and right arrows — skip back or forward ten seconds</li>
            <li>Shift with left or right — previous or next song</li>
            <li>Up and down arrows — volume</li>
          </ul>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface rounded-xl2 p-5">
      <h2 className="mb-3 text-lg">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="truncate text-chalk">{value}</span>
    </div>
  );
}
