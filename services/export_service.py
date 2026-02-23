import io
import csv
from datetime import datetime
from typing import List, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from pypdf import PdfReader, PdfWriter

import pyzipper

def generate_secure_pdf(data: List[Dict[str, Any]], merchant_name: str, date_range: str, password: str) -> io.BytesIO:
    """
    Generates a password-protected PDF using ReportLab and PyPDF.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements = []

    styles = getSampleStyleSheet()
    
    # Custom Styles matching "Frost" theme
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=22,
        textColor=colors.HexColor("#4F46E5"), # Indigo-600
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor("#333333"), # Dark Slate
        fontName='Helvetica-Bold',
        spaceAfter=20
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#64748B"), # Slate-500
        leading=14
    )

    # Header
    elements.append(Paragraph("Nexus Layer", title_style))
    elements.append(Paragraph("MINI STATEMENT", subtitle_style))
    
    # Metadata
    elements.append(Paragraph(f"Merchant ID: {merchant_name}", meta_style))
    elements.append(Paragraph(f"Period: {date_range}", meta_style))
    elements.append(Spacer(1, 20))

    # Table Data
    table_data = [['Date', 'Amount', 'Currency', 'Gateway', 'Status']]
    for item in data:
        raw_dt = item.get('created_at')
        if raw_dt:
            created_at = datetime.fromisoformat(raw_dt.replace('Z', '+00:00')).strftime('%d-%m-%Y')
        else:
            created_at = '—'
        
        table_data.append([
            created_at,
            f"{item['amount']/100:.2f}",
            item['currency'],
            item['gateway_used'] or '—',
            item['status'].upper()
        ])

    # Table Styling
    t = Table(table_data, colWidths=[100, 80, 80, 100, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F0F0F0")), # Light Gray Header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#333333")),    # Dark Slate Text
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor("#475569")),   # Slate-600
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),   # Slate-200
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]), # Alternating
    ]))
    
    elements.append(t)
    
    # Build PDF in memory
    doc.build(elements)
    
    # Encrypt the PDF
    pdf_content = buffer.getvalue()
    reader = PdfReader(io.BytesIO(pdf_content))
    writer = PdfWriter()
    
    for page in reader.pages:
        writer.add_page(page)
        
    writer.encrypt(password)
    
    encrypted_buffer = io.BytesIO()
    writer.write(encrypted_buffer)
    encrypted_buffer.seek(0)
    
    return encrypted_buffer

def generate_secure_csv_zip(data: List[Dict[str, Any]], password: str) -> io.BytesIO:
    """
    Generates an AES-encrypted ZIP file containing the CSV statement.
    """
    # Create CSV in memory
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(['ID', 'Date', 'Amount', 'Currency', 'Gateway', 'Status', 'Idempotency Key'])
    
    for item in data:
        writer.writerow([
            item['id'],
            item['created_at'],
            f"{item['amount']/100:.2f}",
            item['currency'],
            item['gateway_used'] or '—',
            item['status'],
            item['idempotency_key']
        ])
    
    csv_data = csv_buffer.getvalue().encode('utf-8')
    
    # Create encrypted ZIP in memory
    zip_buffer = io.BytesIO()
    with pyzipper.AESZipFile(zip_buffer, 'w', compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES) as zf:
        zf.setpassword(password.encode('utf-8'))
        zf.writestr('nexus_statement.csv', csv_data)
    
    zip_buffer.seek(0)
    return zip_buffer
