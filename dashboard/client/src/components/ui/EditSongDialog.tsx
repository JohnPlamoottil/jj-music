import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { useToast } from '../../context/ToastContext';
import { songs as songsApi } from '../../services/api';
import { messageFor } from '../../services/apiError';
import { emit } from '../../utils/events';
import type { Song } from '../../types';

const FIELDS = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'artist', label: 'Artist', type: 'text' },
  { key: 'album', label: 'Album', type: 'text' },
  { key: 'genre', label: 'Genre', type: 'text' },
  { key: 'year', label: 'Year', type: 'number' },
  { key: 'trackNumber', label: 'Track number', type: 'number' },
] as const;

export function EditSongDialog({ song, open, onClose }: { song: Song; open: boolean; onClose: () => void }) {
  const { notify } = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: song.title ?? '',
      artist: song.artist ?? '',
      album: song.album ?? '',
      genre: song.genre ?? '',
      year: song.year ? String(song.year) : '',
      trackNumber: song.trackNumber ? String(song.trackNumber) : '',
    });
  }, [open, song]);

  async function save() {
    if (!form.title?.trim()) {
      notify('A song needs a title.', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await songsApi.update(song.id, {
        title: form.title.trim(),
        artist: form.artist.trim() || 'Unknown artist',
        album: form.album.trim() || 'Unknown album',
        genre: form.genre.trim() || undefined,
        year: form.year ? Number(form.year) : undefined,
        trackNumber: form.trackNumber ? Number(form.trackNumber) : undefined,
      });
      emit('song-updated', updated);
      emit('library-changed', undefined);
      notify('Saved');
      onClose();
    } catch (error) {
      notify(messageFor(error), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit details">
      <div className="space-y-4">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1.5 block text-sm text-muted">{field.label}</span>
            <input
              type={field.type}
              value={form[field.key] ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
              className="w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-[15px]
                         placeholder:text-dim focus:border-glow"
            />
          </label>
        ))}
        <div className="flex gap-2 pt-2">
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? 'Saving' : 'Save changes'}
          </button>
          <button className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Sheet>
  );
}
