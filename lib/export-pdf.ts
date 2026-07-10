import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatIDR, CATEGORIES, type Transaction } from './finwise'

type CatRow = { category: { id: string; label: string; color?: string }; value: number }

export function exportReportPDF({
  transactions,
  periodLabel,
  income,
  expense,
  surplus,
  byCat,
}: {
  transactions: Transaction[]
  periodLabel: string
  income: number
  expense: number
  surplus: number
  byCat: CatRow[]
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 40
  let y = margin

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20, 20, 20)
  doc.text('FinWise - Laporan Keuangan', margin, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(120, 120, 120)
  doc.text(periodLabel, margin, y)
  y += 26

  // Summary
  doc.setFontSize(12)
  doc.setTextColor(20, 20, 20)
  doc.text(`Pemasukan:  ${formatIDR(income)}`, margin, y)
  doc.text(`Pengeluaran:  ${formatIDR(expense)}`, margin + 230, y)
  y += 18
  const surplusColor: [number, number, number] = surplus >= 0 ? [22, 163, 74] : [220, 38, 38]
  doc.setTextColor(...surplusColor)
  doc.text(`Surplus/Defisit:  ${formatIDR(surplus)}`, margin, y)
  doc.setTextColor(20, 20, 20)
  y += 28

  // Category breakdown table
  autoTable(doc, {
    startY: y,
    head: [['Kategori', 'Nominal', 'Persentase']],
    body: byCat.map(({ category, value }) => [
      category.label,
      formatIDR(value),
      expense > 0 ? `${Math.round((value / expense) * 100)}%` : '0%',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [46, 173, 75], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 5 },
    margin: { left: margin, right: margin },
  })

  // Transaction table
  const afterCat = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
  autoTable(doc, {
    startY: afterCat,
    head: [['Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Nominal']],
    body: transactions.map((t) => [
      t.date.slice(0, 10),
      t.description || '-',
      CATEGORIES[t.category]?.label ?? t.category,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      `${t.type === 'income' ? '+' : '-'}${formatIDR(t.amount)}`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [46, 173, 75], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 4 },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Footer
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        'Dibuat oleh FinWise',
        margin,
        pageHeight - 20,
      )
      doc.text(
        `Halaman ${doc.getNumberOfPages()}`,
        doc.internal.pageSize.getWidth() - margin - 50,
        pageHeight - 20,
      )
    },
  })

  const safe = periodLabel.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  doc.save(`finwise-laporan-${safe}.pdf`)
}
