interface TableSkeletonProps {
  cols: number
  rows?: number
}

export function TableSkeleton({ cols, rows = 8 }: TableSkeletonProps) {
  const colWidths = ['w-24', 'w-40', 'w-28', 'w-20', 'w-20', 'w-24', 'w-32', 'w-32', 'w-32']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden animate-pulse">
      {/* Header shimmer */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded bg-gray-200 dark:bg-gray-600 ${colWidths[i] ?? 'w-24'}`}
          />
        ))}
      </div>

      {/* Row shimmers */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="flex flex-col gap-1">
                <div
                  className={`h-3.5 rounded bg-gray-200 dark:bg-gray-700 ${colWidths[c] ?? 'w-24'}`}
                />
                {c === 1 && (
                  <div className="h-2.5 rounded bg-gray-100 dark:bg-gray-700/60 w-20" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
