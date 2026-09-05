import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search } from 'lucide-react';

interface Props {
  title: string;
  showBack?: boolean;
  onSearch?: () => void;
}

/** Sticky header that clears the notch and Dynamic Island on iPhone. */
export function TopBar({ title, showBack, onSearch }: Props) {
  const navigate = useNavigate();
  return (
    <header
      className="sticky top-0 z-20 mb-2 flex items-center gap-2 border-b border-line/60
                 bg-ink/85 pb-3 backdrop-blur-xl"
      style={{
        paddingTop: 'calc(var(--sa-top) + 0.75rem)',
        marginLeft: 'calc(-1 * var(--page-x))',
        marginRight: 'calc(-1 * max(var(--gutter), var(--sa-right)))',
        paddingLeft: 'var(--page-x)',
        paddingRight: 'max(var(--gutter), var(--sa-right))',
      }}
    >
      {showBack && (
        <button onClick={() => navigate(-1)} aria-label="Go back" className="tap -ml-3 text-chalk">
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
      )}
      <h1 className="flex-1 truncate text-[22px] leading-tight">{title}</h1>
      {onSearch && (
        <button onClick={onSearch} aria-label="Search your library" className="tap -mr-2 text-muted hover:text-chalk">
          <Search className="h-5 w-5" aria-hidden />
        </button>
      )}
    </header>
  );
}
