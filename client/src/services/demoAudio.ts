/**
 * Mock mode only.
 *
 * The repository ships no music — the sample library is metadata alone. So the
 * transport controls have something real to drive, this synthesises a quiet
 * tone of the right length in the browser. Real audio arrives in Phase 5, when
 * `/api/songs/:id/stream` serves the file from storage over HTTP ranges.
 */
const cache = new Map<string, string>();
const MAX_CACHED = 3;

export function demoToneUrl(seed: string, seconds: number): string {
  const cached = cache.get(seed);
  if (cached) return cached;

  const rate = 8000;
  const length = Math.max(1, Math.min(Math.round(seconds), 600)) * rate;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, length * 2, true);

  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 200;
  const freq = 180 + hash;

  for (let i = 0; i < length; i++) {
    const t = i / rate;
    const fade = Math.min(1, t * 2, (length / rate - t) * 2);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.06 * Math.max(0, fade);
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  cache.set(seed, url);
  if (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value as string;
    URL.revokeObjectURL(cache.get(oldest)!);
    cache.delete(oldest);
  }
  return url;
}
