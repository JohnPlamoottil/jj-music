/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // A cool, slightly blue near-black — the app is a piece of matte hi-fi
        // equipment, not a black rectangle.
        ink: '#090C11',
        panel: '#12171F',
        raised: '#1A212B',
        line: '#242D3A',
        chalk: '#EAEEF4',
        muted: '#8C99AA',
        dim: '#5F6B7C',
        // One accent only: the warm glow of a VU meter.
        glow: '#F0A63C',
        ember: '#C9722A',
        heart: '#F2557A',
      },
      fontFamily: {
        display: ['"Familjen Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        lift: '0 18px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(240,166,60,0.35), 0 10px 30px -12px rgba(240,166,60,0.35)',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        sheetUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        bar: { '0%,100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        sheetUp: 'sheetUp 320ms cubic-bezier(0.22,0.61,0.36,1)',
        fadeIn: 'fadeIn 200ms ease-out',
      },
    },
  },
  plugins: [],
};
