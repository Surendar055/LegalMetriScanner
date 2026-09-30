import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { formatInspectionFields } from '../utils/inspectionFormatter.js';
import { generateAiInsights } from './aiInsightsService.js';

/**
 * Generates an authoritative, enterprise-grade A4 PDF Inspection Report for LegalMetriScan.
 *
 * @param {object} inspection - The inspection scan object.
 * @param {object} user - The currently authenticated inspector.
 * @returns {Promise<jsPDF>} The configured jsPDF document instance.
 */
export async function generateInspectionPdf(inspection, user = null) {
  if (!inspection) throw new Error('No inspection data provided for PDF generation.');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Format fields using authoritative Legal Metrology formatter
  const details = inspection.details || {};
  const rawText = inspection.ocrRawText || '';
  const formatted = formatInspectionFields(details, rawText);
  const aiInsights = inspection.aiInsights || generateAiInsights(inspection);

  // Inspector identity
  const inspectorName = user?.name || inspection.device || 'Officer R. Sharma';
  const badgeId = user?.badgeId || user?.badge_id || 'LMS-GOV-2026-088';

  // Dates & IDs
  const rawId = inspection.id || `SCAN-${Date.now().toString(36).toUpperCase()}`;
  const inspectionId = rawId.startsWith('LM-') ? rawId : `LM-${rawId.replace(/^SCAN-/, '')}`;
  const now = new Date(inspection.timestamp || Date.now());
  const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Generate small QR code for traceability
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(`LEGALMETRISCAN-REPORT:${inspectionId}:${dateStr}`, {
      width: 120,
      margin: 1,
      color: { dark: '#0B1B2B', light: '#FFFFFF' },
    });
  } catch (e) {
    console.warn('[PDF Generator] QR generation notice:', e.message);
  }

  // ==========================================
  // PAGE 1: HEADER, IDENTIFICATION, DETAILS, EVIDENCE
  // ==========================================

  // Top Dark Navy Header Band
  doc.setFillColor(11, 27, 43); // #0B1B2B
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Blue Stripe
  doc.setFillColor(37, 99, 235); // #2563EB
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Brand & Department Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('LEGALMETRISCAN', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text('AI-ASSISTED LEGAL METROLOGY INSPECTION REPORT', margin, 18);
  doc.setFontSize(7.5);
  doc.text('DEPARTMENT OF CONSUMER AFFAIRS • PACKAGED COMMODITIES DIVISION', margin, 23);

  // Traceability QR Code (Top Right)
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 20, 4, 20, 20);
  }

  // Metadata Strip below header
  let y = 35;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Inspection ID:', margin + 4, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 27, 43);
  doc.text(inspectionId, margin + 26, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Date & Time:', margin + 65, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 27, 43);
  doc.text(`${dateStr} at ${timeStr}`, margin + 84, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Officer:', margin + 4, y + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(11, 27, 43);
  doc.text(`${inspectorName} (${badgeId})`, margin + 26, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Standard:', margin + 125, y + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Legal Metrology PCR Rule 6', margin + 140, y + 10.5);

  // SECTION 1: PRODUCT IDENTIFICATION
  y = 54;
  drawSectionHeader(doc, '1. PRODUCT IDENTIFICATION', margin, y, contentWidth);
  y += 7;

  const getVal = (val) => {
    if (!val || val === 'Not detected') return 'Not detected';
    if (typeof val === 'object' && 'value' in val) return val.value || 'Not detected';
    return String(val);
  };

  const prodName = typeof inspection.productName === 'object' && inspection.productName !== null
    ? (inspection.productName.value || 'Scanned Commodity Package')
    : (inspection.productName || 'Scanned Commodity Package');

  const idRows = [
    ['Product Name / Brand:', prodName],
    ['Net Quantity Declaration:', getVal(details.netQuantity)],
    ['Maximum Retail Price (MRP):', getVal(details.mrp)],
    ['Batch / Lot Reference:', getVal(details.batchNumber || details.batch)],
  ];

  y = drawKeyValueGrid(doc, idRows, margin, y, contentWidth);

  // SECTION 2: DECLARATION DETAILS
  y += 4;
  drawSectionHeader(doc, '2. STATUTORY DECLARATION DETAILS', margin, y, contentWidth);
  y += 7;

  const declRows = [
    ['Date of Manufacture (MFD):', getVal(details.manufacturingDate)],
    ['Best Before / Expiry Duration:', getVal(details.bestBefore)],
    ['FSSAI Licence Number:', getVal(details.fssaiNumber)],
    ['Manufacturer / Packer / Marketer:', getVal(details.manufacturer)],
    ['Customer Care Helpline & Email:', getVal(details.customerCare)],
  ];

  y = drawKeyValueGrid(doc, declRows, margin, y, contentWidth);

  // SECTION 3: CAPTURED PACKAGE OPTICAL EVIDENCE
  y += 4;
  drawSectionHeader(doc, '3. CAPTURED PACKAGE OPTICAL EVIDENCE', margin, y, contentWidth);
  y += 6;

  const evidenceHeight = 85;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, evidenceHeight, 2, 2, 'FD');

  if (inspection.evidenceImageUrl && inspection.evidenceImageUrl.startsWith('data:image')) {
    try {
      const imgWidth = 75;
      const imgHeight = 72;
      const imgX = margin + (contentWidth - imgWidth) / 2;
      doc.addImage(inspection.evidenceImageUrl, 'JPEG', imgX, y + 4, imgWidth, imgHeight);
    } catch (err) {
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('[Optical image recorded in secure inspection package archive]', margin + 40, y + 42);
    }
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('[Optical image recorded in secure inspection package archive]', margin + 40, y + 42);
  }

  // Image Caption
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Figure 1.0: Primary Display Panel Optical Evidence (Confidence: ${inspection.ocrConfidence || 75}%)`,
    pageWidth / 2,
    y + evidenceHeight - 3,
    { align: 'center' }
  );

  drawPageFooter(doc, 1, 2, pageWidth, pageHeight, margin);

  // ==========================================
  // PAGE 2: VERIFICATION RESULTS TABLE, AI INSIGHTS, SUMMARY & SIGN-OFF
  // ==========================================
  doc.addPage('a4', 'portrait');

  // Mini Top Header Band for Page 2
  doc.setFillColor(11, 27, 43);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 16, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('LEGALMETRISCAN — STATUTORY AUDIT & AI INSIGHTS', margin, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Ref: ${inspectionId}`, pageWidth - margin - 35, 11);

  // SECTION 4: VERIFICATION RESULTS TABLE
  y = 23;
  drawSectionHeader(doc, '4. STATUTORY DECLARATION AUDIT (PCR 2011 RULE 6)', margin, y, contentWidth);
  y += 6;

  // Table Header
  const col1 = margin;
  const col2 = margin + 55;
  const col3 = margin + 145;
  const rowHeight = 7.5;

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.setDrawColor(203, 213, 225);
  doc.rect(col1, y, contentWidth, rowHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Mandatory Statutory Declaration', col1 + 3, y + 5);
  doc.text('Detected Label Value', col2 + 3, y + 5);
  doc.text('Verification Status', col3 + 3, y + 5);

  y += rowHeight;

  // Table Rows (8 Mandatory PCR fields)
  formatted.fields.forEach((f, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(col1, y, contentWidth, rowHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(f.name, col1 + 3, y + 5);

    doc.setFont('helvetica', f.detected ? 'normal' : 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(f.detected ? 15 : 148, f.detected ? 23 : 163, f.detected ? 42 : 184);

    // Truncate long value cleanly
    const safeVal = f.value.length > 55 ? f.value.substring(0, 52) + '...' : f.value;
    doc.text(safeVal, col2 + 3, y + 5);

    // Status Pill / Badge text
    if (f.detected) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52); // Emerald-800
      doc.text('✓ Detected', col3 + 3, y + 5);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(194, 65, 12); // Amber-700
      doc.text('⚠ Review required', col3 + 3, y + 5);
    }

    y += rowHeight;
  });

  // SECTION 5: AI INSPECTION INSIGHTS
  y += 5;
  drawSectionHeader(doc, '5. AI INSPECTION INSIGHTS', margin, y, contentWidth);
  y += 6;

  // AI Box Background
  const risk = aiInsights.riskLevel || 'LOW';
  const riskBorderColor = risk === 'HIGH' ? [244, 63, 94] : risk === 'MEDIUM' ? [245, 158, 11] : [16, 185, 129];
  const riskBgColor = risk === 'HIGH' ? [255, 241, 242] : risk === 'MEDIUM' ? [254, 243, 199] : [236, 253, 245];

  const aiBoxHeight = 52;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...riskBorderColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, aiBoxHeight, 2, 2, 'FD');

  // AI Header inside box
  doc.setFillColor(...riskBgColor);
  doc.rect(margin + 0.2, y + 0.2, contentWidth - 0.4, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('AI-ASSISTED PRELIMINARY VERIFICATION', margin + 3, y + 5.2);

  // Risk Badge on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(risk === 'HIGH' ? 190 : risk === 'MEDIUM' ? 146 : 5, risk === 'HIGH' ? 18 : risk === 'MEDIUM' ? 64 : 122, risk === 'HIGH' ? 60 : risk === 'MEDIUM' ? 14 : 85);
  doc.text(`Risk Level: ${risk}`, pageWidth - margin - 32, y + 5.2);

  // Summary Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const summaryLines = doc.splitTextToSize(aiInsights.summary || '', contentWidth - 8);
  doc.text(summaryLines, margin + 4, y + 12);

  let curY = y + 12 + summaryLines.length * 3.5;

  // Observations bullet points
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Observations:', margin + 4, curY);
  curY += 3.8;

  const obsList = [
    ...(aiInsights.insights || []).slice(0, 2),
    ...(aiInsights.warnings || []).slice(0, 2),
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  obsList.forEach((obs) => {
    doc.setTextColor(obs.includes('ANOMALY') || obs.includes('CRITICAL') ? 190 : 51, obs.includes('ANOMALY') ? 18 : 65, obs.includes('ANOMALY') ? 60 : 85);
    const splitObs = doc.splitTextToSize(`• ${obs}`, contentWidth - 10);
    doc.text(splitObs, margin + 6, curY);
    curY += splitObs.length * 3.2;
  });

  // Recommended Action
  curY += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(37, 99, 235);
  doc.text('Recommended Action:', margin + 4, curY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(aiInsights.recommendedAction || 'Proceed with normal manual verification.', margin + 35, curY);

  // SECTION 6: INSPECTION SUMMARY & TRACEABILITY
  y += aiBoxHeight + 5;
  drawSectionHeader(doc, '6. INSPECTION SUMMARY & TRACEABILITY', margin, y, contentWidth);
  y += 6;

  // Summary 4-card KPI row
  const cardW = (contentWidth - 6) / 3;
  const cardH = 14;

  // Card 1: Assessment
  doc.setFillColor(formatted.allDetected ? 240 : 254, formatted.allDetected ? 253 : 243, formatted.allDetected ? 244 : 199);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, cardW, cardH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Overall Assessment', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(formatted.allDetected ? 22 : 180, formatted.allDetected ? 101 : 83, formatted.allDetected ? 52 : 9);
  doc.text(formatted.allDetected ? 'Compliant' : 'Attention Required', margin + 3, y + 10.5);

  // Card 2: Coverage
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + cardW + 3, y, cardW, cardH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Declaration Coverage', margin + cardW + 6, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatted.detectedCount} of ${formatted.totalCount} Detected`, margin + cardW + 6, y + 10.5);

  // Card 3: AI Risk Level
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardW + 3) * 2, y, cardW, cardH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('AI Risk Rating', margin + (cardW + 3) * 2 + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(risk === 'HIGH' ? 225 : risk === 'MEDIUM' ? 217 : 16, risk === 'HIGH' ? 29 : risk === 'MEDIUM' ? 119 : 185, risk === 'HIGH' ? 72 : risk === 'MEDIUM' ? 6 : 129);
  doc.text(`Rating: ${risk}`, margin + (cardW + 3) * 2 + 3, y + 10.5);

  y += cardH + 7;

  // Officer Sign-Off & Seal Blocks
  const sigBoxW = (contentWidth - 6) / 2;
  const sigBoxH = 24;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Left: Officer Signature
  doc.roundedRect(margin, y, sigBoxW, sigBoxH, 1.5, 1.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Inspecting Officer Endorsement', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Officer: ${inspectorName}`, margin + 4, y + 10);
  doc.text(`ID: ${badgeId}`, margin + 4, y + 14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text('Signature: __________________________', margin + 4, y + 20);

  // Right: Departmental Stamp / Seal
  doc.roundedRect(margin + sigBoxW + 6, y, sigBoxW, sigBoxH, 1.5, 1.5, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Official Station Seal / Verification Stamp', margin + sigBoxW + 10, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Generated: ${dateStr} ${timeStr}`, margin + sigBoxW + 10, y + 10);
  doc.text('System: LegalMetriScan v1.2 Enterprise', margin + sigBoxW + 10, y + 14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text('[ Affix Stamp Here ]', margin + sigBoxW + 30, y + 20);

  drawPageFooter(doc, 2, 2, pageWidth, pageHeight, margin);

  return doc;
}

/**
 * Helper to draw standardized section header bars.
 */
function drawSectionHeader(doc, title, x, y, width) {
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(x, y, width, 5.5, 'F');
  doc.setFillColor(37, 99, 235); // Accent marker
  doc.rect(x, y, 2.5, 5.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(title, x + 5, y + 4);
}

/**
 * Helper to draw clean 2-column key-value tables.
 */
function drawKeyValueGrid(doc, rows, x, startY, width) {
  let y = startY;
  const labelWidth = 52;
  const valueWidth = width - labelWidth;

  rows.forEach(([label, value], idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(x, y, width, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, x + 3, y + 4.2);

    doc.setFont('helvetica', value === 'Not detected' ? 'italic' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(value === 'Not detected' ? 148 : 15, value === 'Not detected' ? 163 : 23, value === 'Not detected' ? 184 : 42);

    const safeValue = value.length > 70 ? value.substring(0, 67) + '...' : value;
    doc.text(safeValue, x + labelWidth + 2, y + 4.2);

    y += 6;
  });

  return y;
}

/**
 * Standardized A4 Page Footer.
 */
function drawPageFooter(doc, pageNum, totalPages, pageWidth, pageHeight, margin) {
  const y = pageHeight - 12;

  // Thin separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y - 2, pageWidth - margin, y - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'LegalMetriScan • AI-Assisted Packaged Commodity Inspection Platform',
    margin,
    y + 2
  );
  doc.text(
    'AI-assisted preliminary verification. This report does not constitute legal certification or a final statutory determination.',
    margin,
    y + 5.5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 15, y + 3);
}

export default {
  generateInspectionPdf,
};
