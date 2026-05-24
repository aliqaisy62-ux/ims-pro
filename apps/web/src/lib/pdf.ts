import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Font cached in memory after first load to avoid re-fetching
let _fontCache: string | false | undefined = undefined

async function fetchArabicFont(): Promise<string | null> {
  if (_fontCache !== undefined) return _fontCache || null
  const sources = [
    '/fonts/Amiri-Regular.ttf',
    'https://cdn.jsdelivr.net/gh/alif-type/amiri@1.100/Amiri-Regular.ttf',
  ]
  for (const url of sources) {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 9000)
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(tid)
      if (!res.ok) continue
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      _fontCache = btoa(binary)
      return _fontCache
    } catch {
      clearTimeout(tid)
    }
  }
  _fontCache = false
  return null
}

async function createDoc(): Promise<{ doc: jsPDF; font: string }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const fontBase64 = await fetchArabicFont()
  let font = 'helvetica'
  if (fontBase64) {
    doc.addFileToVFS('Amiri-Regular.ttf', fontBase64)
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal')
    doc.setFont('Amiri', 'normal')
    font = 'Amiri'
  }
  return { doc, font }
}

const C = {
  blue:  [29, 78, 216]    as [number, number, number],
  white: [255, 255, 255]  as [number, number, number],
  dark:  [31, 41, 55]     as [number, number, number],
  gray:  [107, 114, 128]  as [number, number, number],
  light: [248, 250, 252]  as [number, number, number],
  line:  [229, 231, 235]  as [number, number, number],
  green: [22, 101, 52]    as [number, number, number],
  red:   [185, 28, 28]    as [number, number, number],
  amber: [146, 64, 14]    as [number, number, number],
}

function brandedHeader(doc: jsPDF, title: string, subtitle: string, font: string) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, W, 18, 'F')
  doc.setFont(font, 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...C.white)
  doc.text('IMS-Pro | إيتانا', W / 2, 11.5, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(...C.dark)
  doc.text(title, W - 14, 28, { align: 'right' })

  doc.setFontSize(8.5)
  doc.setTextColor(...C.gray)
  doc.text(subtitle, W - 14, 35, { align: 'right' })

  doc.setDrawColor(...C.line)
  doc.setLineWidth(0.4)
  doc.line(14, 39, W - 14, 39)
}

function pageFooters(doc: jsPDF, font: string) {
  const n = doc.getNumberOfPages()
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFont(font, 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.gray)
    doc.text('IMS-Pro © إيتانا', 14, H - 8)
    doc.text(`صفحة ${i} من ${n}`, W / 2, H - 8, { align: 'center' })
    doc.text(new Date().toLocaleDateString('ar-IQ'), W - 14, H - 8, { align: 'right' })
  }
}

// ─── Sales Report ──────────────────────────────────────────────────────────────

interface SalesInvoiceRow {
  invoiceNumber: string
  customer: { name: string } | null
  type: string
  currency: string
  total: number
  status: string
  createdAt: string
}

interface SalesSummary {
  totalInvoices: number
  cashSalesIQD: number
  cashSalesUSD: number
  creditSalesIQD: number
  creditSalesUSD: number
  totalIQD: number
}

export async function downloadSalesReportPDF(
  invoices: SalesInvoiceRow[],
  summary: SalesSummary,
  filters?: { from?: string; to?: string; status?: string }
) {
  const { doc, font } = await createDoc()
  const W = doc.internal.pageSize.getWidth()

  const today = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })
  const period = filters?.from && filters?.to ? `${filters.from} — ${filters.to}` : today
  brandedHeader(doc, 'تقرير المبيعات', `تاريخ التقرير: ${today}`, font)

  // Period badge
  doc.setFont(font, 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.gray)
  doc.text(`الفترة: ${period}`, 14, 28)

  // KPI summary row
  const kpiY = 46
  const kpis = [
    { label: 'إجمالي الفواتير', value: String(summary.totalInvoices) },
    { label: 'نقدي (د.ع)',      value: summary.cashSalesIQD.toLocaleString('ar-IQ') },
    { label: 'آجل (د.ع)',       value: summary.creditSalesIQD.toLocaleString('ar-IQ') },
    { label: 'الإجمالي (د.ع)', value: summary.totalIQD.toLocaleString('ar-IQ') },
  ]

  const colW = (W - 28) / kpis.length
  kpis.forEach((k, i) => {
    const x = 14 + i * colW
    doc.setFillColor(...C.light)
    doc.roundedRect(x + 1, kpiY, colW - 2, 18, 2, 2, 'F')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.gray)
    doc.text(k.label, x + colW - 4, kpiY + 6, { align: 'right' })
    doc.setFontSize(11)
    doc.setTextColor(...C.blue)
    doc.text(k.value, x + colW - 4, kpiY + 14, { align: 'right' })
  })

  const STATUS: Record<string, string> = {
    CONFIRMED: 'مؤكدة', DRAFT: 'مسودة', CANCELLED: 'ملغاة', RETURNED: 'مرتجعة',
  }
  const TYPE: Record<string, string> = { CASH: 'نقدي', CREDIT: 'آجل' }

  autoTable(doc, {
    startY: kpiY + 22,
    head: [['التاريخ', 'النوع', 'الحالة', 'العملة', 'المجموع', 'العميل', 'رقم الفاتورة']],
    body: invoices.map(inv => [
      new Date(inv.createdAt).toLocaleDateString('ar-IQ'),
      TYPE[inv.type] ?? inv.type,
      STATUS[inv.status] ?? inv.status,
      inv.currency,
      Number(inv.total).toLocaleString('ar-IQ'),
      inv.customer?.name ?? '—',
      inv.invoiceNumber,
    ]),
    styles: { font, fontSize: 8, halign: 'right', cellPadding: 2.5 },
    headStyles: { fillColor: C.blue, textColor: C.white, halign: 'right', fontSize: 8.5 },
    alternateRowStyles: { fillColor: C.light },
    margin: { left: 14, right: 14 },
  })

  pageFooters(doc, font)
  doc.save(`sales-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── Financial Summary Report ──────────────────────────────────────────────────

interface TodaySummaryData {
  salesCount: number
  salesTotalIQD: number
  returnsCount: number
  returnsTotalIQD: number
  netSalesIQD: number
  expensesTotalIQD: number
  netProfitIQD: number
}

export async function downloadFinancialSummaryPDF(data: TodaySummaryData) {
  const { doc, font } = await createDoc()
  const W = doc.internal.pageSize.getWidth()

  const today = new Date().toLocaleDateString('ar-IQ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  brandedHeader(doc, 'الملخص المالي اليومي', today, font)

  const fmt = (n: number) => n.toLocaleString('ar-IQ', { minimumFractionDigits: 0 })

  const cards: { label: string; value: string; sub: string; color: [number,number,number] }[] = [
    {
      label: 'إجمالي المبيعات اليوم',
      value: `${fmt(data.salesTotalIQD)} د.ع`,
      sub: `${data.salesCount} فاتورة مؤكدة`,
      color: C.blue,
    },
    {
      label: 'إجمالي الإرجاعات',
      value: `${fmt(data.returnsTotalIQD)} د.ع`,
      sub: `${data.returnsCount} إرجاع`,
      color: C.amber,
    },
    {
      label: 'صافي المبيعات',
      value: `${fmt(data.netSalesIQD)} د.ع`,
      sub: 'المبيعات ناقص الإرجاعات',
      color: C.green,
    },
    {
      label: 'إجمالي المصاريف',
      value: `${fmt(data.expensesTotalIQD)} د.ع`,
      sub: '',
      color: C.red,
    },
    {
      label: 'صافي الربح',
      value: `${fmt(data.netProfitIQD)} د.ع`,
      sub: data.netProfitIQD < 0 ? '⚠ خسارة' : '✓ ربح',
      color: data.netProfitIQD < 0 ? C.red : C.green,
    },
  ]

  let y = 48
  cards.forEach(card => {
    doc.setFillColor(...C.light)
    doc.roundedRect(14, y, W - 28, 24, 3, 3, 'F')

    // Left accent bar
    doc.setFillColor(...card.color)
    doc.rect(14, y, 3, 24, 'F')

    doc.setFont(font, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.gray)
    doc.text(card.label, W - 20, y + 8, { align: 'right' })

    doc.setFontSize(14)
    doc.setTextColor(...card.color)
    doc.text(card.value, W - 20, y + 18, { align: 'right' })

    if (card.sub) {
      doc.setFontSize(7.5)
      doc.setTextColor(...C.gray)
      doc.text(card.sub, 22, y + 15)
    }

    y += 30
  })

  doc.setFontSize(8)
  doc.setTextColor(...C.gray)
  doc.text('* جميع الأرقام بالدينار العراقي (IQD)', W - 14, y + 4, { align: 'right' })

  pageFooters(doc, font)
  doc.save(`financial-summary-${new Date().toISOString().slice(0, 10)}.pdf`)
}
