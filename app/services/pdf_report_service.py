import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from datetime import datetime

class PDFReportService:
    """
    Generates official Digital Inspection Reports for Legal Metrology Officers.
    Embeds actual uploaded package images and physical font height calibration tables.
    """

    @staticmethod
    def generate_inspection_pdf(inspection_data, output_filepath):
        """
        Creates a formatted Digital Inspection Report PDF with ReportLab.
        """
        doc = SimpleDocTemplate(
            output_filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Color Palette
        primary_color = colors.HexColor('#0F172A')
        subtitle_color = colors.HexColor('#475569')
        light_bg = colors.HexColor('#F8FAFC')

        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=primary_color,
            alignment=0
        )

        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=subtitle_color
        )

        heading2_style = ParagraphStyle(
            'H2',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=primary_color,
            spaceBefore=10,
            spaceAfter=4
        )

        body_style = ParagraphStyle(
            'BodyTextCustom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11.5,
            textColor=colors.HexColor('#1E293B')
        )

        disclaimer_style = ParagraphStyle(
            'DisclaimerText',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=7.5,
            leading=10.5,
            textColor=colors.HexColor('#64748B'),
            alignment=1
        )

        story = []

        # Header Block
        story.append(Paragraph("MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION", subtitle_style))
        story.append(Paragraph("DEPARTMENT OF LEGAL METROLOGY — DIGITAL INSPECTION REPORT", title_style))
        story.append(Paragraph(f"Legal Metrology (Packaged Commodities) Rules, 2011 + 2022/2023 Amendments | OmniInspect Engine v2026.1", subtitle_style))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=10))

        # Overview Metadata Table
        insp = inspection_data.get('inspection', inspection_data)
        insp_id = insp.get('id', 'N/A')
        status = insp.get('status', 'MANUAL_REVIEW')
        
        status_display = status.replace('_', ' ')
        if status == 'COMPLIANT':
            status_html = f"<font color='#16A34A'><b>🟢 COMPLIANT</b></font>"
        elif status == 'POTENTIAL_NON_COMPLIANCE':
            status_html = f"<font color='#DC2626'><b>🔴 POTENTIAL NON-COMPLIANCE</b></font>"
        else:
            status_html = f"<font color='#D97706'><b>🟡 MANUAL REVIEW REQUIRED</b></font>"

        meta_data = [
            [
                Paragraph(f"<b>Inspection ID:</b> {insp_id}", body_style),
                Paragraph(f"<b>Date & Time:</b> {insp.get('created_at', 'N/A')}", body_style)
            ],
            [
                Paragraph(f"<b>Product Name:</b> {insp.get('product_name', 'N/A')}", body_style),
                Paragraph(f"<b>Brand Name:</b> {insp.get('brand', 'N/A')}", body_style)
            ],
            [
                Paragraph(f"<b>Category:</b> {insp.get('category', 'N/A')}", body_style),
                Paragraph(f"<b>Assigned Officer:</b> {insp.get('officer_name', 'N/A')}", body_style)
            ],
            [
                Paragraph(f"<b>Inspection Point:</b> {insp.get('location', 'N/A')}", body_style),
                Paragraph(f"<b>Overall Status:</b> {status_html}", body_style)
            ]
        ]

        meta_table = Table(meta_data, colWidths=[260, 280])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), light_bg),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # Embed Actual Uploaded Image if available
        images = inspection_data.get('images', [])
        if images and len(images) > 0:
            img_rel_path = images[0].get('file_path', '')
            if img_rel_path.startswith('/static/'):
                app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                abs_img_path = os.path.join(app_root, img_rel_path.lstrip('/'))
            else:
                abs_img_path = img_rel_path

            if os.path.exists(abs_img_path):
                try:
                    story.append(Paragraph("Package Evidence Photo (Principal Display Panel)", heading2_style))
                    pkg_img = RLImage(abs_img_path, width=220, height=260)
                    story.append(pkg_img)
                    story.append(Spacer(1, 10))
                except Exception as img_err:
                    pass

        # Section 1: Extracted Package Declarations
        story.append(Paragraph("1. Extracted Package Declarations (Rule 6 Schema)", heading2_style))
        
        declarations = inspection_data.get('declarations', [])
        dec_table_data = [[
            Paragraph("<b>Declaration Field</b>", body_style),
            Paragraph("<b>Extracted / Corrected Value</b>", body_style),
            Paragraph("<b>Confidence</b>", body_style),
            Paragraph("<b>Status</b>", body_style)
        ]]

        for d in declarations:
            val = d.get('corrected_value') or d.get('extracted_value', 'NOT DETECTED')
            conf_pct = f"{int(d.get('confidence', 0) * 100)}%"
            st = d.get('status', 'DETECTED')
            
            if d.get('corrected_value'):
                val_p = Paragraph(f"<font color='#D97706'><b>[Corrected]</b> {val}</font>", body_style)
            else:
                val_p = Paragraph(val, body_style)

            dec_table_data.append([
                Paragraph(d.get('field_label', ''), body_style),
                val_p,
                Paragraph(conf_pct, body_style),
                Paragraph(st, body_style)
            ])

        dec_table = Table(dec_table_data, colWidths=[150, 240, 70, 80])
        dec_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(dec_table)
        story.append(Spacer(1, 10))

        # Section 2: Legal Compliance Checks (4 Result States)
        story.append(Paragraph("2. Legal Metrology Compliance Findings & Rule References", heading2_style))
        
        checks = inspection_data.get('checks', [])
        check_table_data = [[
            Paragraph("<b>Rule Ref</b>", body_style),
            Paragraph("<b>Requirement Check</b>", body_style),
            Paragraph("<b>Result State</b>", body_style),
            Paragraph("<b>Finding Explanation & Evidence</b>", body_style)
        ]]

        for c in checks:
            res = c.get('result', 'PASS')
            if res == 'PASS':
                res_p = Paragraph("<font color='#16A34A'><b>PASS</b></font>", body_style)
            elif res == 'FAIL':
                res_p = Paragraph("<font color='#DC2626'><b>POTENTIAL VIOLATION</b></font>", body_style)
            elif res == 'NOT_APPLICABLE':
                res_p = Paragraph("<font color='#64748B'><b>NOT APPLICABLE</b></font>", body_style)
            else:
                res_p = Paragraph("<font color='#D97706'><b>MANUAL REVIEW</b></font>", body_style)

            check_table_data.append([
                Paragraph(f"<b>{c.get('rule_id')}</b><br/>v{c.get('rule_version')}", body_style),
                Paragraph(c.get('check_name', ''), body_style),
                res_p,
                Paragraph(f"<b>Observed:</b> {c.get('observed_value')}<br/><b>Explanation:</b> {c.get('finding_explanation')}", body_style)
            ])

        check_table = Table(check_table_data, colWidths=[75, 125, 90, 250])
        check_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(check_table)
        story.append(Spacer(1, 10))

        # Section 3: Physical Font Height Calibration Breakdown
        pkg_h_mm = insp.get('package_height_mm', 0.0)
        pkg_w_mm = insp.get('package_width_mm', 0.0)
        px_per_mm = insp.get('pixels_per_mm', 0.0)
        meas_src = insp.get('measurement_source', 'NONE')

        story.append(Paragraph("3. Physical Package Scale & Font Height Calibration Summary", heading2_style))
        
        calib_src_text = f"Inspector Measured ({pkg_h_mm}mm x {pkg_w_mm}mm)" if meas_src == 'INSPECTOR' else (f"Approximate ({pkg_h_mm}mm)" if meas_src == 'APPROXIMATE' else "Uncalibrated Image (Fallback to Manual Review)")
        scale_text = f"{round(px_per_mm, 2)} px/mm" if px_per_mm > 0 else "N/A"

        calib_table_data = [
            [Paragraph("<b>Physical Package Height:</b>", body_style), Paragraph(f"{pkg_h_mm} mm" if pkg_h_mm > 0 else "Not Provided", body_style)],
            [Paragraph("<b>Calibration Source:</b>", body_style), Paragraph(calib_src_text, body_style)],
            [Paragraph("<b>Image Scale Factor:</b>", body_style), Paragraph(scale_text, body_style)],
            [Paragraph("<b>Font Height Standard:</b>", body_style), Paragraph("Rule 9 & Schedule II Minimum Font Height Requirements", body_style)]
        ]

        calib_table = Table(calib_table_data, colWidths=[180, 360])
        calib_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), light_bg),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(calib_table)
        story.append(Spacer(1, 10))

        # Section 4: Risk Score & Breakdown
        story.append(Paragraph("4. OmniInspect Compliance / Risk Prioritization Score", heading2_style))
        score_val = insp.get('score', 0)
        risk_level = "HIGH" if score_val < 60 else ("MEDIUM" if score_val < 80 else "LOW")

        risk_table_data = [
            [Paragraph("<b>Inspection Risk Score:</b>", body_style), Paragraph(f"<b>{score_val} / 100</b> (Level: {risk_level})", body_style)],
            [Paragraph("<b>Prioritization Classification:</b>", body_style), Paragraph("Prototype risk prioritization score — not a legal determination.", body_style)]
        ]

        risk_table = Table(risk_table_data, colWidths=[180, 360])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), light_bg),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(risk_table)
        story.append(Spacer(1, 10))

        # Section 5: Previous Inspection Comparison (if present)
        change_comp = inspection_data.get('change_comparison')
        if change_comp and change_comp.get('has_previous'):
            story.append(Paragraph("5. Historical Inspection Package Change Analysis", heading2_style))
            prev_id = change_comp.get('previous_inspection_id')
            changes_cnt = change_comp.get('changes_detected_count', 0)
            
            comp_summary_text = f"Compared against previous inspection {prev_id}. Changes Detected: {changes_cnt} field(s)."
            story.append(Paragraph(comp_summary_text, body_style))
            story.append(Spacer(1, 6))

        # Disclaimer Footer
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#CBD5E1'), spaceAfter=8))
        disclaimer_text = (
            "DISCLAIMER: OmniInspect is an inspection-assistance and decision-support prototype. "
            "Final legal determination remains with the authorized enforcement authority."
        )
        story.append(Paragraph(disclaimer_text, disclaimer_style))

        doc.build(story)
        return output_filepath
