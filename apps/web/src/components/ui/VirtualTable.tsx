'use client'

import { useRef, useState, useCallback } from 'react'

interface VirtualTableProps<T> {
  items: T[]
  rowHeight: number
  visibleRows: number
  cols: number
  minWidth?: number
  renderRow: (item: T, index: number) => React.ReactNode
  renderHeader: () => React.ReactNode
  footer?: React.ReactNode
}

export function VirtualTable<T>({
  items,
  rowHeight,
  visibleRows,
  cols,
  minWidth,
  renderRow,
  renderHeader,
  footer,
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const containerHeight = visibleRows * rowHeight
  const overscan = 3

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan,
  )
  const visibleItems = items.slice(startIndex, endIndex)

  const topSpacerHeight = startIndex * rowHeight
  const bottomSpacerHeight = (items.length - endIndex) * rowHeight

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop)
  }, [])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflowY: 'auto', overflowX: 'auto', direction: 'rtl' }}
    >
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          {renderHeader()}
        </thead>
        <tbody>
          {topSpacerHeight > 0 && (
            <tr aria-hidden="true">
              <td colSpan={cols} style={{ height: topSpacerHeight, padding: 0, border: 'none' }} />
            </tr>
          )}
          {visibleItems.map((item, i) => renderRow(item, startIndex + i))}
          {bottomSpacerHeight > 0 && (
            <tr aria-hidden="true">
              <td colSpan={cols} style={{ height: bottomSpacerHeight, padding: 0, border: 'none' }} />
            </tr>
          )}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  )
}
