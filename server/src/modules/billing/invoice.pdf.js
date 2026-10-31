import PDFDocument from 'pdfkit'
import { toDateString } from '../../lib/dates.js'
import { formatAmount, formatMoney } from '../../lib/format.js'

const LEFT = 50
const RIGHT = 545
const columns = [
  { key: 'description', title: 'Description', x: 50, width: 200, align: 'left' },
  { key: 'quantity', title: 'Qty', x: 255, width: 30, align: 'right' },
  { key: 'unitPrice', title: 'Unit price', x: 290, width: 65, align: 'right' },
  { key: 'discountAmount', title: 'Discount', x: 360, width: 60, align: 'right' },
  { key: 'taxAmount', title: 'Tax', x: 425, width: 55, align: 'right' },
  { key: 'amount', title: 'Amount', x: 485, width: 60, align: 'right' },
]

// invoice comes from billing.service getInvoice(): lines, customer, subscription and payments included
export function renderInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: LEFT })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.font('Helvetica-Bold').fontSize(18).text('Brightloop Software', LEFT, 50)
    doc.font('Helvetica-Bold').fontSize(22).text('INVOICE', LEFT, 50, { width: RIGHT - LEFT, align: 'right' })

    doc.font('Helvetica').fontSize(10)
    const meta = [
      ['Invoice no.', invoice.number],
      ['Subscription', invoice.subscription.number],
      ['Issue date', toDateString(invoice.issueDate)],
      ['Due date', toDateString(invoice.dueDate)],
      ['Billing period', `${toDateString(invoice.periodStart)} to ${toDateString(invoice.periodEnd)}`],
      ['Status', invoice.status],
    ]
    meta.forEach(([label, value], i) => {
      const y = 90 + i * 15
      doc.fillColor('#666666').text(label, 330, y, { width: 90 })
      doc.fillColor('#000000').text(value, 425, y, { width: RIGHT - 425, align: 'right' })
    })

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#666666').text('Bill to', LEFT, 90)
    doc.font('Helvetica').fillColor('#000000').text(invoice.customer.name, LEFT, 106, { width: 250 })
    doc.text(invoice.customer.email, LEFT, doc.y, { width: 250 })
    if (invoice.customer.address) doc.text(invoice.customer.address, LEFT, doc.y, { width: 250 })

    let y = 200
    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(9)
      for (const col of columns) doc.text(col.title, col.x, y, { width: col.width, align: col.align })
      doc.moveTo(LEFT, y + 14).lineTo(RIGHT, y + 14).strokeColor('#999999').stroke()
      y += 22
      doc.font('Helvetica').fontSize(9)
    }
    drawHeader()

    for (const line of invoice.lines) {
      const height = Math.max(doc.heightOfString(line.description, { width: columns[0].width }), 12)
      if (y + height > 740) {
        doc.addPage()
        y = 50
        drawHeader()
      }
      for (const col of columns) {
        const value = col.key === 'description' ? line.description : col.key === 'quantity' ? String(line.quantity) : formatAmount(line[col.key])
        doc.text(value, col.x, y, { width: col.width, align: col.align })
      }
      y += height + 6
    }
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#999999').stroke()
    y += 10

    if (y > 650) {
      doc.addPage()
      y = 50
    }
    const totals = [
      ['Subtotal', formatMoney(invoice.subtotal)],
      ['Discount', `- ${formatMoney(invoice.discountTotal)}`],
      ['Tax', formatMoney(invoice.taxTotal)],
      ['Total', formatMoney(invoice.total)],
      ['Paid', formatMoney(invoice.amountPaid)],
      ['Amount due', formatMoney(invoice.amountDue)],
    ]
    totals.forEach(([label, value], i) => {
      const bold = label === 'Total' || label === 'Amount due'
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
      doc.text(label, 340, y, { width: 90 })
      doc.text(value, 430, y, { width: RIGHT - 430, align: 'right' })
      y += i === 3 ? 22 : 16
    })

    doc.font('Helvetica').fontSize(9).fillColor('#666666')
    doc.text('Thank you for your business.', LEFT, y + 30, { width: RIGHT - LEFT })

    doc.end()
  })
}
