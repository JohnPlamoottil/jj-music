/**
 * Songs without embedded artwork still need to look like something. Rather than
 * shipping a grey placeholder, derive a stable two-tone gradient from the album
 * name so every record keeps its own colour across sessions and devices.
 */
const PAIRS: [string, string][] = [
  ['#2A3550', '#101725'],
  ['#3A2B44', '#141019'],
  ['#1F3D3A', '#0C1917'],
  ['#42302A', '#181110'],
  ['#26344A', '#0E141D'],
  ['#3C2F22', '#171208'],
  ['#2D2A4A', '#111020'],
  ['#233F45', '#0C171A'],
];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function gradientFor(seed: string): string {
  const [from, to] = PAIRS[hash(seed || 'jj') % PAIRS.length];
  return `linear-gradient(145deg, ${from} 0%, ${to} 100%)`;
}

export function initialsFor(value: string): string {
  const words = (value || '?').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
