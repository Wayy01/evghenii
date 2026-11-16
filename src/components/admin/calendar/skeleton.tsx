/** Placeholder with the calendar's own proportions, shown while the day's data loads. */
export function CalendarSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-6 lg:mb-8">
        <div className="skeleton h-11 w-64 lg:h-14 lg:w-96" />
        <div className="skeleton mt-3 h-5 w-48" />
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="skeleton h-11 w-40 rounded-full" />
        <div className="skeleton h-11 w-36 rounded-full" />
      </div>
      <GridSkeleton />
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div aria-hidden className="grid h-[60dvh] grid-cols-[3rem_1fr] overflow-hidden rounded-frame border border-line bg-surface lg:grid-cols-[3.5rem_repeat(7,1fr)]">
      <span />
      {Array.from({ length: 7 }, (_, i) => (
        // Phones show a single day column.
        <div key={i} className={`grid content-start gap-3 border-l border-line p-2 pt-16 ${i > 0 ? "max-lg:hidden" : ""}`}>
          <span className="skeleton h-16" />
          <span className="skeleton h-10" />
          <span className="skeleton mt-8 h-20" />
        </div>
      ))}
    </div>
  );
}
