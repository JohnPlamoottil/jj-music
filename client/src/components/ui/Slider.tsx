interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/**
 * A native range input, restyled. Native means keyboard support, VoiceOver
 * support and iOS drag behaviour come for free; the filled portion is painted
 * as a gradient on the input itself while the track stays transparent.
 */
export function Slider({
  value,
  max,
  onChange,
  onCommit,
  label,
  className = '',
  size = 'sm',
  disabled = false,
}: Props) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const height = size === 'md' ? 6 : 4;

  return (
    <input
      type="range"
      min={0}
      max={max || 1}
      step="any"
      value={value}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={`${Math.round(percent)}%`}
      onChange={(event) => onChange(Number(event.target.value))}
      onPointerUp={(event) => onCommit?.(Number((event.target as HTMLInputElement).value))}
      onKeyUp={(event) => onCommit?.(Number((event.target as HTMLInputElement).value))}
      className={`w-full cursor-pointer appearance-none rounded-full bg-transparent
        [&::-webkit-slider-runnable-track]:bg-transparent
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-chalk [&::-webkit-slider-thumb]:shadow-lift
        ${size === 'md' ? '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4' : '[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3'}
        [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-chalk
        ${size === 'md' ? '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4' : '[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3'}
        ${className}`}
      style={{
        height,
        background: `linear-gradient(to right, #F0A63C ${percent}%, #242D3A ${percent}%)`,
      }}
    />
  );
}
