'use client'

import { useRef, useState, useCallback } from 'react'

interface VirtualTableProps<T> {
  items: T[]
  rowHeight: number
  visibleRows: number
  renderRow: (item: T, index: number) => React.ReactNode
  renderHeader: () => React.ReactNode
}

export function VirtualTable<T>({
  items,
  rowHeight,
  visibleRows,
  renderRow,
  renderHeader,
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalHeight = items.length * rowHeight
  const containerHeight = visibleRows * rowHeight

  // Calculate which rows are visible
  const startIndex = Math.floor(scrollTop / rowHeight)
  const endIndex = Math.min(startIndex + visibleRows + 2, items.length)
  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * rowHeight

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  return (
    <div style={{ direction: 'rtl' }}>
      {/* Fixed header — rendered outside the scrollable area so it stays pinned */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>{renderHeader()}</thead>
      </table>

      {/* Scrollable body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: containerHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        {/* Spacer div that represents the full virtual height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Rendered rows positioned at the correct vertical offset */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              position: 'absolute',
              top: offsetY,
            }}
          >
            <tbody>
              {visibleItems.map((item, i) => renderRow(item, startIndex + i))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
