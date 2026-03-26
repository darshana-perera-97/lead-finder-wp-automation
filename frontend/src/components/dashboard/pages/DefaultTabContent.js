import React from 'react';

function DefaultTabContent({ content }) {
  return (
    <>
      <div className="flex items-end justify-between gap-4 mb-[18px]">
        <div>
          <h2 className="m-0 text-[20px] tracking-[-0.2px] font-semibold">{content.heading}</h2>
          <p className="m-0 text-gray-500 text-[13px]">{content.description}</p>
        </div>
        <div className="text-[12px] px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50" aria-label="Status">
          Status: Ready
        </div>
      </div>

      <div className="grid grid-cols-12 gap-[14px]">
        {content.cards.map((c) => (
          <section
            key={c.title}
            className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 ${
              c.span === 4 ? 'col-span-4' : c.span === 6 ? 'col-span-6' : c.span === 8 ? 'col-span-8' : 'col-span-12'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-[10px]">
              <strong>{c.title}</strong>
              <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50">
                {c.pill}
              </span>
            </div>
            <div className="text-slate-900 text-[13px] leading-[1.45]">{c.body}</div>
          </section>
        ))}

        <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] min-w-0 col-span-12">
          <div className="flex items-center justify-between gap-3 mb-[10px]">
            <strong>{content.tableLabel}</strong>
            <span className="text-[12px] px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50">
              Preview
            </span>
          </div>
          <div className="h-[220px] grid place-items-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
            Coming soon
          </div>
        </section>
      </div>
    </>
  );
}

export default DefaultTabContent;

