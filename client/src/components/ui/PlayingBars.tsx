/** Three bars that animate while a row is the one playing. */
export function PlayingBars({ animate }: { animate: boolean }) {
  return (
    <span className="flex h-4 w-4 items-end justify-center gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-glow"
          style={{
            height: '100%',
            transformOrigin: 'bottom',
            animation: animate ? `bar 900ms ease-in-out ${i * 140}ms infinite` : undefined,
            transform: animate ? undefined : 'scaleY(0.4)',
          }}
        />
      ))}
    </span>
  );
}
