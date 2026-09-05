import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { SECONDARY, TABS } from './navItems';
import { Sheet } from '../ui/Sheet';

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav
        aria-label="Main"
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur-xl"
        style={{ paddingBottom: 'var(--sa-bottom)' }}
      >
        <ul className="flex" style={{ height: 'var(--bottom-nav-h)' }}>
          {TABS.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex h-full flex-col items-center justify-center gap-1 text-[11px]
                   ${isActive ? 'text-glow' : 'text-muted'}`
                }
              >
                <Icon className="h-[22px] w-[22px]" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-muted"
            >
              <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <ul className="space-y-1">
          {SECONDARY.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <button
                onClick={() => {
                  setMoreOpen(false);
                  navigate(to);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] row-hover"
              >
                <Icon className="h-[18px] w-[18px] text-glow" aria-hidden />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
