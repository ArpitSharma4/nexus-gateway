import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateCSV(data: any[]) {
    if (data.length === 0) return

    const headers = ['ID', 'Date', 'Amount', 'Currency', 'Gateway', 'Status', 'Idempotency Key']
    const rows = data.map(i => [
        i.id,
        new Date(i.created_at).toLocaleString(),
        (i.amount / 100).toFixed(2),
        i.currency,
        i.gateway_used || '—',
        i.status,
        i.idempotency_key
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `nexus_statement_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export function generatePDF(data: any[], merchantName: string, range: { start: string; end: string }) {
    try {
        const doc = new jsPDF()

        // Header
        doc.setFontSize(22)
        doc.setTextColor(79, 70, 229) // Indigo-600
        doc.text('Nexus Layer', 20, 25)

        doc.setFontSize(14)
        doc.setTextColor(51, 51, 51) // Dark Slate
        doc.setFont('helvetica', 'bold')
        doc.text('MINI STATEMENT', 20, 35)

        // Metadata
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139) // Slate-500
        doc.text(`Merchant ID: ${merchantName}`, 20, 45)
        doc.text(`Period: ${range.start} - ${range.end}`, 20, 50)

        // Table
        const tableData = data.map(i => [
            new Date(i.created_at).toLocaleDateString(),
            (i.amount / 100).toFixed(2),
            i.currency,
            i.gateway_used || '—',
            i.status.toUpperCase()
        ])

        autoTable(doc, {
            startY: 60,
            head: [['Date', 'Amount', 'Currency', 'Gateway', 'Status']],
            body: tableData,
            headStyles: {
                fillColor: [240, 240, 240], // Light Gray Header
                textColor: [51, 51, 51],    // Dark Slate Text
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: { fontSize: 9, textColor: [71, 85, 105] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { left: 20, right: 20 },
            theme: 'striped'
        })

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(148, 163, 184)
            doc.text(`Nexus Layer - Multi-Gateway Orchestration - Page ${i} of ${pageCount}`, 20, doc.internal.pageSize.height - 10)
        }

        doc.save(`nexus_mini_statement_${range.start}_${range.end}.pdf`)
    } catch (err) {
        console.error('PDF generation failed:', err)
        alert('Failed to generate PDF. Please try CSV instead or contact support.')
    }
}
