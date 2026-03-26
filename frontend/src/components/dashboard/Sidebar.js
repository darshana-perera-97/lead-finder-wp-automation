import React from 'react';

function Sidebar({ sections, activeId, onSelect, onLogout }) {
  return (
    <aside className="w-[236px] bg-white text-slate-900 px-3 py-4 flex flex-col gap-3 border-r border-gray-200">
      <div className="flex items-center gap-2 px-2 py-2 rounded-xl">
        <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-blue-50 to-green-50 border border-blue-100 text-slate-900 grid place-items-center" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 12.5C6 8.35786 9.35786 5 13.5 5H20V11.5C20 15.6421 16.6421 19 12.5 19H6V12.5Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M6 12.5H13.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="font-bold tracking-[0.2px]">Lead Finder</div>
      </div>

      <div className="h-px w-full bg-gray-200 mx-1 mt-0.5" aria-hidden="true" />

      <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <button
                type="button"
                className={[
                  'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl border-l-4 border-transparent text-left cursor-pointer',
                  'text-slate-600 bg-transparent',
                  'hover:bg-gray-100 hover:text-slate-900',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 focus-visible:bg-blue-50 focus-visible:border-blue-300',
                  active
                    ? 'bg-blue-100/60 text-blue-700 border-l-blue-600 ring-1 ring-blue-200'
                    : '',
                ].join(' ')}
                onClick={() => onSelect(s.id)}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden="true">
                  <span className="w-4 h-4 inline-flex items-center justify-center">
                    {s.icon}
                  </span>
                </span>
                <span
                  className={[
                    'text-[13px] tracking-[0.1px]',
                    active ? 'font-bold' : 'font-semibold',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-2 pb-1">
        <button
          type="button"
          className={[
            'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl border-l-3 border-transparent text-left cursor-pointer',
            'text-red-600 bg-transparent',
            'hover:bg-red-50 hover:text-red-700',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20 focus-visible:border-red-300',
          ].join(' ')}
          onClick={() => {
            if (typeof onLogout === 'function') onLogout();
          }}
        >
          <span aria-hidden="true" className="w-4 h-4 inline-flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 7V6C10 4.89543 10.8954 4 12 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H12C10.8954 20 10 19.1046 10 18V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M15 12H3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 9L3 12L6 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[13px] font-semibold tracking-[0.1px]">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

