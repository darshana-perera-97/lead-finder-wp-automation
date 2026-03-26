import React, { useEffect, useRef, useState } from 'react';

function TopBar({ title, subtitle, onLogout }) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!menuRef.current) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!menuRef.current.contains(target)) setMenuOpen(false);
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="font-bold text-base leading-tight">{title}</div>
          <div className="text-gray-500 text-xs mt-0.5">{subtitle}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-2xl px-3 py-2 min-w-[260px]" role="search">
          <svg
            className="w-4 h-4 text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M21 21L16.65 16.65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            aria-label="Search"
            className="border-0 outline-0 bg-transparent w-full text-sm text-slate-900 placeholder:text-gray-400"
          />
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-slate-900 text-white grid place-items-center font-bold text-[12px] hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
            title="Account"
            aria-haspopup="menu"
            aria-expanded={menuOpen ? 'true' : 'false'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            U
          </button>

          {menuOpen ? (
            <div
              role="menu"
              aria-label="User menu"
              className="absolute right-0 mt-2 w-[150px] rounded-xl border border-gray-200 bg-white shadow-sm py-1"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false);
                  if (typeof onLogout === 'function') onLogout();
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default TopBar;

