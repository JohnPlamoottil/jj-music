import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileAudio, ImagePlus, Trash2, TriangleAlert, Upload as UploadIcon } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Artwork } from '../components/ui/Artwork';
import { useToast } from '../context/ToastContext';
import { uploadSong } from '../services/api';
import { messageFor } from '../services/apiError';
import { emit } from '../utils/events';
import { formatBytes, formatDuration } from '../utils/format';

const MAX_BYTES = 100 * 1024 * 1024; // matches the server limit set in Phase 4
const ACCEPTED = [
  { ext: '.mp3', mime: ['audio/mpeg', 'audio/mp3'] },
  { ext: '.m4a', mime: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'] },
  { ext: '.aac', mime: ['audio/aac', 'audio/aacp'] },
  { ext: '.wav', mime: ['audio/wav', 'audio/x-wav', 'audio/wave'] },
  { ext: '.flac', mime: ['audio/flac', 'audio/x-flac'] },
];
const ACCEPT_ATTR = ACCEPTED.map((a) => a.ext).join(',') + ',audio/*';

type Status = 'ready' | 'uploading' | 'done' | 'failed';

interface Draft {
  key: string;
  file: File;
  status: Status;
  progress: number;
  error?: string;
  duration: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  trackNumber: string;
  artworkFile: File | null;
  artworkPreview: string | null;
  cancel?: () => void;
}

/** "Ada Vance - 03 Harbour Lights.mp3" -> artist, track number and title. */
function guessFromFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  const parts = base.split(/\s+-\s+/);
  let artist = '';
  let title = base;
  if (parts.length >= 2) {
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }
  let trackNumber = '';
  const numbered = title.match(/^(\d{1,2})[\s._-]+(.*)$/);
  if (numbered) {
    trackNumber = numbered[1];
    title = numbered[2].trim();
  }
  return { artist, title, trackNumber };
}

function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => done(Number.isFinite(probe.duration) ? probe.duration : 0);
    probe.onerror = () => done(0);
    probe.src = url;
  });
}

function validate(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const match = ACCEPTED.find((entry) => entry.ext === ext);
  if (!match) return `${ext || 'That file type'} is not a supported audio format.`;
  if (file.type && !match.mime.includes(file.type.toLowerCase()) && !file.type.startsWith('audio/')) {
    return 'The file contents do not look like audio.';
  }
  if (file.size > MAX_BYTES) return `Larger than the ${formatBytes(MAX_BYTES)} limit.`;
  if (file.size === 0) return 'That file is empty.';
  return null;
}

export function Upload() {
  const { notify } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => drafts.forEach((d) => d.artworkPreview && URL.revokeObjectURL(d.artworkPreview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const accepted: Draft[] = [];
      for (const file of incoming) {
        const problem = validate(file);
        if (problem) {
          notify(`${file.name}: ${problem}`, 'error');
          continue;
        }
        const guess = guessFromFilename(file.name);
        accepted.push({
          key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          status: 'ready',
          progress: 0,
          duration: 0,
          title: guess.title,
          artist: guess.artist,
          album: '',
          genre: '',
          year: '',
          trackNumber: guess.trackNumber,
          artworkFile: null,
          artworkPreview: null,
        });
      }
      if (!accepted.length) return;
      setDrafts((current) => [...current, ...accepted]);

      // Duration is the one tag the browser can read reliably; the server reads
      // the embedded ID3/MP4 tags properly when the file arrives (Phase 4).
      for (const draft of accepted) {
        const duration = await readDuration(draft.file);
        setDrafts((current) => current.map((d) => (d.key === draft.key ? { ...d, duration } : d)));
      }
    },
    [notify],
  );

  function patch(key: string, changes: Partial<Draft>) {
    setDrafts((current) => current.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  }

  function attachArtwork(key: string, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Artwork must be an image file.', 'error');
      return;
    }
    patch(key, { artworkFile: file, artworkPreview: URL.createObjectURL(file) });
  }

  async function startOne(draft: Draft) {
    if (!draft.title.trim()) {
      patch(draft.key, { status: 'failed', error: 'Give this song a title first.' });
      return;
    }
    const handle = uploadSong(
      draft.file,
      {
        title: draft.title.trim(),
        artist: draft.artist.trim() || 'Unknown artist',
        album: draft.album.trim() || 'Unknown album',
        genre: draft.genre.trim() || undefined,
        year: draft.year ? Number(draft.year) : undefined,
        trackNumber: draft.trackNumber ? Number(draft.trackNumber) : undefined,
        duration: draft.duration || undefined,
        artworkFile: draft.artworkFile,
      },
      (progress) => patch(draft.key, { progress }),
    );
    patch(draft.key, { status: 'uploading', progress: 0, error: undefined, cancel: handle.cancel });
    try {
      await handle.promise;
      patch(draft.key, { status: 'done', progress: 100 });
      emit('library-changed', undefined);
    } catch (error) {
      patch(draft.key, { status: 'failed', error: messageFor(error) });
    }
  }

  async function startAll() {
    const pending = drafts.filter((d) => d.status === 'ready' || d.status === 'failed');
    // Sequential: one big file at a time keeps a phone connection usable.
    for (const draft of pending) {
      // eslint-disable-next-line no-await-in-loop
      await startOne(draft);
    }
    notify('Upload finished');
  }

  const pendingCount = drafts.filter((d) => d.status === 'ready' || d.status === 'failed').length;

  return (
    <>
      <TopBar title="Upload music" />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
        className={`rounded-xl2 border border-dashed p-8 text-center transition-colors duration-200
                    ${dragging ? 'border-glow bg-glow/5' : 'border-line bg-panel/40'}`}
      >
        <UploadIcon className="mx-auto h-8 w-8 text-glow" aria-hidden />
        <p className="mt-4 text-lg">Drop audio files here</p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
          MP3, M4A, AAC and WAV play everywhere. FLAC uploads fine but Safari cannot play it, so it will
          only work on browsers that support the format. {formatBytes(MAX_BYTES)} per file.
        </p>
        <button className="btn-primary mt-5" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {drafts.length > 0 && (
        <div className="mt-6 flex items-center gap-3">
          <button className="btn-primary" onClick={startAll} disabled={!pendingCount}>
            Upload {pendingCount || ''} {pendingCount === 1 ? 'song' : 'songs'}
          </button>
          <button
            className="btn-quiet"
            onClick={() => setDrafts((current) => current.filter((d) => d.status === 'uploading'))}
          >
            Clear list
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {drafts.map((draft) => (
          <article key={draft.key} className="surface rounded-xl2 p-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Artwork
                  src={draft.artworkPreview}
                  seed={draft.album || draft.title}
                  className="h-20 w-20"
                />
                <button
                  onClick={() => document.getElementById(`art-${draft.key}`)?.click()}
                  aria-label={`Choose artwork for ${draft.title || draft.file.name}`}
                  className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full border border-line bg-panel text-muted hover:text-chalk"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden />
                </button>
                <input
                  id={`art-${draft.key}`}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => attachArtwork(draft.key, event.target.files?.[0] ?? null)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13px] text-dim">
                  <FileAudio className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{draft.file.name}</span>
                  <span className="shrink-0">
                    · {formatBytes(draft.file.size)}
                    {draft.duration ? ` · ${formatDuration(draft.duration)}` : ''}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Field label="Title" value={draft.title} onChange={(v) => patch(draft.key, { title: v })} />
                  <Field label="Artist" value={draft.artist} onChange={(v) => patch(draft.key, { artist: v })} />
                  <Field label="Album" value={draft.album} onChange={(v) => patch(draft.key, { album: v })} />
                  <Field label="Genre" value={draft.genre} onChange={(v) => patch(draft.key, { genre: v })} />
                  <Field label="Year" value={draft.year} onChange={(v) => patch(draft.key, { year: v })} />
                  <Field
                    label="Track"
                    value={draft.trackNumber}
                    onChange={(v) => patch(draft.key, { trackNumber: v })}
                  />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {draft.status === 'uploading' && (
                    <>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-glow transition-[width] duration-200"
                          style={{ width: `${draft.progress}%` }}
                        />
                      </div>
                      <span className="tnum text-[13px] text-muted">{draft.progress}%</span>
                      <button className="text-[13px] text-muted hover:text-heart" onClick={() => draft.cancel?.()}>
                        Cancel
                      </button>
                    </>
                  )}
                  {draft.status === 'ready' && (
                    <>
                      <button className="btn-quiet h-9 px-4 text-sm" onClick={() => startOne(draft)}>
                        Upload this one
                      </button>
                      <button
                        aria-label={`Remove ${draft.file.name} from the list`}
                        className="tap h-9 w-9 min-h-0 min-w-0 text-muted hover:text-heart"
                        onClick={() => setDrafts((current) => current.filter((d) => d.key !== draft.key))}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  )}
                  {draft.status === 'done' && (
                    <p className="flex items-center gap-2 text-[13px] text-glow">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Added to your library
                    </p>
                  )}
                  {draft.status === 'failed' && (
                    <>
                      <p className="flex items-center gap-2 text-[13px] text-heart" role="alert">
                        <TriangleAlert className="h-4 w-4" aria-hidden />
                        {draft.error}
                      </p>
                      <button className="btn-quiet h-9 px-4 text-sm" onClick={() => startOne(draft)}>
                        Try again
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-dim">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-ink px-2.5 py-2 text-sm focus:border-glow"
      />
    </label>
  );
}
