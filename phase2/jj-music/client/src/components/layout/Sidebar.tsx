import { NavLink } from 'react-router-dom';
import type { ElementType } from 'react';
import { PRIMARY, SECONDARY } from './navItems';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const { user } = useAuth();

  return (
    <nav
      aria-label="Library"
      className="hidden lg:flex h-full w-[248px] shrink-0 flex-col border-r border-line bg-panel/60 px-3 pt-6"
    >
      <div className="px-3 pb-7">
        <p className="font-display text-2xl leading-none tracking-tight">
          JJ<span className="text-glow">.</span>Music
        </p>
        <p className="mt-1.5 text-[13px] text-dim">{user?.email ?? 'Your library'}</p>
      </div>

      <ul className="space-y-0.5">
        {PRIMARY.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </ul>

      <div className="my-4 h-px bg-line" />

      <ul className="space-y-0.5">
        {SECONDARY.map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </ul>
    </nav>
  );
}

function SidebarLink({ to, label, icon: Icon }: { to: string; label: string; icon: ElementType }) {
  return (
    <li>
      <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors duration-150 ease-soft
           ${isActive ? 'bg-raised text-chalk' : 'text-muted hover:bg-raised/60 hover:text-chalk'}`
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-glow' : ''}`} aria-hidden />
            {label}
          </>
        )}
      </NavLink>
    </li>
  );
}
