/**
 * reportGenerator.js
 *
 * Professional PDF and CSV report generator for LegalMetriScan
 * Conforming to Legal Metrology (Packaged Commodities) Rules, 2011.
 */

import { formatInspectionFields } from './inspectionFormatter';

/**
 * Format timestamp or date string to strict DD/MM/YY format (e.g. 24/10/26)
 */
export function formatToShortDate(dateInput) {
  if (!dateInput) return '24/10/26';
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const match = String(dateInput).match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3].slice(-2);
      return `${day}/${month}/${year}`;
    }
    return '24/10/26';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Downloads a single inspection as an official Legal Metrology PDF Certificate
 */
export function downloadInspectionPdf(inspection) {
  if (!inspection) return;

  const d = inspection.details || {};
  const rawText = inspection.ocrRawText || '';
  const formatted = formatInspectionFields(d, rawText);

  const prodName = typeof inspection.productName === 'object' && inspection.productName !== null
    ? (inspection.productName.value || 'Scanned Commodity Package')
    : (inspection.productName || 'Scanned Commodity Package');

  const shortDate = formatToShortDate(inspection.timestamp || inspection.displayDate);

  const isCompliant = formatted.allDetected;
  const statusColor = isCompliant ? '#059669' : '#D97706';
  const statusBg = isCompliant ? '#ECFDF5' : '#FFFBEB';
  const statusBorder = isCompliant ? '#A7F3D0' : '#FDE68A';

  const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LegalMetriScan Inspection Report - ${inspection.id}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5pt;
      line-height: 1.4;
    }
    .cert-card {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 22px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .gov-seal {
      font-size: 12pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .dept-title {
      font-size: 9pt;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cert-heading {
      font-size: 15pt;
      font-weight: 800;
      color: #1e3a8a;
      margin-top: 8px;
    }
    .cert-sub {
      font-size: 8.5pt;
      color: #475569;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 9pt;
    }
    .meta-item { display: flex; gap: 8px; }
    .meta-label { font-weight: 600; color: #64748b; min-width: 110px; }
    .meta-val { font-weight: 700; color: #0f172a; }
    .verdict-banner {
      background: ${statusBg};
      border: 1.5px solid ${statusBorder};
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .verdict-title { font-size: 10.5pt; font-weight: 800; color: ${statusColor}; text-transform: uppercase; }
    .verdict-text { font-size: 8.5pt; color: #334155; margin-top: 2px; }
    .badge {
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
      padding: 3px 10px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 9pt;
    }
    table.audit-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 8.5pt;
    }
    table.audit-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 7px 10px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 8pt;
    }
    table.audit-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    table.audit-table tr:nth-child(even) td { background: #f8fafc; }
    .status-pill-ok { color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 10px; font-weight: 700; font-size: 7.5pt; }
    .status-pill-missing { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 10px; font-weight: 700; font-size: 7.5pt; }
    .evidence-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      background: #f8fafc;
      margin-bottom: 16px;
      text-align: center;
    }
    .evidence-img { max-height: 140px; max-width: 100%; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1; }
    .footer-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      font-size: 8pt;
      color: #64748b;
    }
    .sig-block { text-align: center; min-width: 160px; }
    .sig-line { border-bottom: 1px solid #0f172a; height: 30px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="cert-card">
    <div class="header">
      <div class="gov-seal">Government of India • Ministry of Consumer Affairs</div>
      <div class="dept-title">Department of Legal Metrology — Packaged Commodities Rules 2011 Inspection Directorate</div>
      <div class="cert-heading">Statutory Inspection & Verification Dossier</div>
      <div class="cert-sub">Automated Computer Vision Compliance Audit Record (Form LM-PCR-2026)</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">Inspection ID:</span><span class="meta-val">${inspection.id}</span></div>
      <div class="meta-item"><span class="meta-label">Scan Date:</span><span class="meta-val" style="color:#1d4ed8; font-family: monospace;">${shortDate}</span></div>
      <div class="meta-item"><span class="meta-label">Product Name:</span><span class="meta-val">${prodName}</span></div>
      <div class="meta-item"><span class="meta-label">Device Station:</span><span class="meta-val">${inspection.device || 'Mobile Scanner Unit'}</span></div>
      <div class="meta-item"><span class="meta-label">Category:</span><span class="meta-val">${inspection.category || 'Packaged Commodity'}</span></div>
      <div class="meta-item"><span class="meta-label">Barcode / GTIN:</span><span class="meta-val">${inspection.barcode || 'N/A'}</span></div>
    </div>

    <div class="verdict-banner">
      <div>
        <div class="verdict-title">${isCompliant ? 'VERIFIED COMPLIANT' : 'ATTENTION REQUIRED / DEFICIENCY FLAGGED'}</div>
        <div class="verdict-text">${isCompliant
          ? 'Package contains all 8 mandatory declarations prescribed under Rule 6 of PCR 2011.'
          : `Deficiency detected: ${formatted.missingFields.join(', ')}`}</div>
      </div>
      <div class="badge">${inspection.status || (isCompliant ? 'Compliant' : 'Attention Required')}</div>
    </div>

    <div style="font-size: 9.5pt; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Rule 6 Statutory Declarations Checklist</div>
    <table class="audit-table">
      <thead>
        <tr>
          <th style="width: 32%;">Statutory Requirement</th>
          <th style="width: 50%;">Optical Extraction & Verified Value</th>
          <th style="width: 18%; text-align: center;">Rule Status</th>
        </tr>
      </thead>
      <tbody>
        ${formatted.fields.map((f) => `
          <tr>
            <td style="font-weight: 600; color: #334155;">${f.name}</td>
            <td style="font-family: monospace; font-size: 8.5pt; font-weight: ${f.detected ? '700' : '400'}; color: ${f.detected ? '#0f172a' : '#94a3b8'};">${f.value}</td>
            <td style="text-align: center;">${f.detected ? '<span class="status-pill-ok">PASS</span>' : '<span class="status-pill-missing">DEFICIENT</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${inspection.evidenceImageUrl ? `
      <div class="evidence-box">
        <div style="font-size: 8pt; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">
          Optical Evidence Capture Frame (Digital Timestamp Record: ${shortDate})
        </div>
        <img class="evidence-img" src="${inspection.evidenceImageUrl}" alt="Evidence Frame" />
      </div>
    ` : ''}

    <div class="footer-signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div>Automated LegalMetriScan Engine</div>
        <div style="font-size: 7.5pt; color: #94a3b8;">Cryptographic Audit Timestamp: ${shortDate}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div>Field Inspection Officer Signature</div>
        <div style="font-size: 7.5pt; color: #94a3b8;">Legal Metrology Enforcement Wing</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 300); };
  </script>
</body>
</html>
  `;

  openPrintOrDownloadHtml(reportHtml, `LegalMetriScan_Report_${inspection.id}.html`);
}

/**
/**
 * Filter items by date range (WEEK, MONTH, TODAY, ALL, CUSTOM)
 */
export function isItemInDateRange(item, rangeType = 'ALL', customStart = null, customEnd = null) {
  if (rangeType === 'ALL' || !rangeType) return true;

  let itemDate = null;
  if (item.timestamp) {
    itemDate = new Date(item.timestamp);
  } else if (item.displayDate) {
    const parts = item.displayDate.split('/');
    if (parts.length === 3) {
      const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
      itemDate = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }

  if (!itemDate || isNaN(itemDate.getTime())) return true;

  // Use today as reference
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (rangeType === 'TODAY') {
    return (
      itemDate.getDate() === now.getDate() &&
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear()
    );
  }

  const futureBuffer = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

  if (rangeType === 'WEEK' || rangeType === '1_WEEK') {
    const sevenDaysAgo = new Date(endOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return itemDate >= sevenDaysAgo && itemDate <= futureBuffer;
  }

  if (rangeType === 'MONTH' || rangeType === '1_MONTH') {
    const thirtyDaysAgo = new Date(endOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return itemDate >= thirtyDaysAgo && itemDate <= futureBuffer;
  }

  if (rangeType === 'CUSTOM') {
    if (customStart) {
      const parts = String(customStart).split('-');
      const start = parts.length === 3
        ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0)
        : new Date(customStart);
      if (!isNaN(start.getTime()) && itemDate < start) return false;
    }
    if (customEnd) {
      const parts = String(customEnd).split('-');
      const end = parts.length === 3
        ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999)
        : new Date(customEnd);
      if (!isNaN(end.getTime()) && itemDate > end) return false;
    }
    return true;
  }

  return true;
}

/**
 * Downloads the ENTIRE report of ALL scanned items as an official comprehensive PDF dossier
 */
export function downloadAllInspectionsPdf(inspections, periodLabel = 'All Time (Full Dossier)') {
  if (!Array.isArray(inspections) || inspections.length === 0) {
    alert('No items available in the selected date range to export.');
    return;
  }

  const currentDate = formatToShortDate(new Date());

  const total = inspections.length;
  const compliant = inspections.filter((i) => i.status === 'Compliant').length;
  const attention = inspections.filter((i) => i.status === 'Attention Required').length;
  const nonCompliant = inspections.filter((i) => i.status === 'Non-Compliant').length;
  const complianceRate = Math.round((compliant / total) * 100);

  const getVal = (val) => {
    if (val && typeof val === 'object' && 'value' in val) return val.value;
    return val || 'Not detected';
  };

  const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LegalMetriScan Comprehensive Inspection Dossier - All Items (${currentDate})</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10pt;
      line-height: 1.35;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .gov-seal {
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .dept-title {
      font-size: 9pt;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cert-heading {
      font-size: 16pt;
      font-weight: 800;
      color: #1e3a8a;
      margin-top: 6px;
    }
    .cert-sub {
      font-size: 9pt;
      color: #475569;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .kpi-val { font-size: 16pt; font-weight: 800; font-family: monospace; margin-top: 2px; color: #0f172a; }
    .kpi-compliant { color: #059669; }
    .kpi-attention { color: #d97706; }
    .kpi-noncompliant { color: #dc2626; }

    table.master-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      font-size: 8.5pt;
    }
    table.master-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 7px 9px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.3px;
    }
    table.master-table td {
      padding: 7px 9px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    table.master-table tr:nth-child(even) td { background: #f8fafc; }

    .date-badge {
      font-family: monospace;
      font-size: 8.5pt;
      font-weight: 700;
      color: #1e3a8a;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      white-space: nowrap;
    }
    .badge-ok { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 9999px; font-weight: 700; font-size: 7.5pt; }
    .badge-warn { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 9999px; font-weight: 700; font-size: 7.5pt; }
    .badge-err { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 7px; border-radius: 9999px; font-weight: 700; font-size: 7.5pt; }

    .item-section-title {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      border-left: 4px solid #1e3a8a;
      padding-left: 8px;
      margin-top: 18px;
      margin-bottom: 10px;
    }
    .item-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 14px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .item-title { font-size: 11pt; font-weight: 800; color: #0f172a; }
    .item-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 12px;
    }
    .declarations-list { font-size: 8.5pt; }
    .decl-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #f1f5f9; }
    .decl-label { color: #64748b; font-weight: 600; }
    .decl-val { font-weight: 700; font-family: monospace; color: #0f172a; }
    .thumb-box { text-align: center; }
    .thumb-img { max-height: 100px; max-width: 100%; object-fit: contain; border-radius: 4px; border: 1px solid #e2e8f0; }

    .footer-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      font-size: 8pt;
      color: #64748b;
      page-break-inside: avoid;
    }
    .sig-block { text-align: center; min-width: 160px; }
    .sig-line { border-bottom: 1px solid #0f172a; height: 32px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="gov-seal">Government of India • Ministry of Consumer Affairs</div>
    <div class="dept-title">Department of Legal Metrology — Packaged Commodities Rules 2011 Enforcement Wing</div>
    <div class="cert-heading">Comprehensive Commodity Inspection Dossier</div>
    <div class="cert-sub">Consolidated Enforcement Audit Summary • Selected Period: <strong style="color:#1e3a8a;">${periodLabel}</strong> • Generated Date: <strong style="color:#1e3a8a;">${currentDate}</strong></div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Packages Audited</div>
      <div class="kpi-val">${total}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Verified Compliant</div>
      <div class="kpi-val kpi-compliant">${compliant} (${complianceRate}%)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Attention Required</div>
      <div class="kpi-val kpi-attention">${attention}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Non-Compliant Deficient</div>
      <div class="kpi-val kpi-noncompliant">${nonCompliant}</div>
    </div>
  </div>

  <div class="item-section-title">Master Inventory Audit Table</div>
  <table class="master-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 12%;">Date</th>
        <th style="width: 25%;">Product Name</th>
        <th style="width: 10%;">MRP</th>
        <th style="width: 10%;">Net Qty</th>
        <th style="width: 15%;">FSSAI License</th>
        <th style="width: 13%;">Audit Status</th>
      </tr>
    </thead>
    <tbody>
      ${inspections.map((item, idx) => {
        const d = item.details || {};
        const pName = typeof item.productName === 'object' && item.productName !== null
          ? (item.productName.value || 'Scanned Package')
          : (item.productName || 'Scanned Package');

        const itemDate = formatToShortDate(item.timestamp || item.displayDate);
        const mrp = getVal(d.mrp);
        const netQty = getVal(d.netQuantity);
        const fssai = getVal(d.fssaiNumber);

        let badgeClass = 'badge-ok';
        if (item.status === 'Attention Required') badgeClass = 'badge-warn';
        if (item.status === 'Non-Compliant') badgeClass = 'badge-err';

        return `
          <tr>
            <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
            <td><span class="date-badge">${itemDate}</span></td>
            <td style="font-weight: 700; color: #0f172a;">${pName}</td>
            <td style="font-family: monospace; font-weight: 700;">${mrp}</td>
            <td style="font-family: monospace; font-weight: 700;">${netQty}</td>
            <td style="font-family: monospace; font-size: 7.5pt;">${fssai !== 'Not detected' ? fssai : '<span style="color:#94a3b8;">N/A</span>'}</td>
            <td><span class="${badgeClass}">${item.status || 'Compliant'}</span></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="item-section-title">Detailed Statutory Declaration Audits (Item Breakdown)</div>
  ${inspections.map((item, idx) => {
    const d = item.details || {};
    const pName = typeof item.productName === 'object' && item.productName !== null
      ? (item.productName.value || 'Scanned Package')
      : (item.productName || 'Scanned Package');

    const itemDate = formatToShortDate(item.timestamp || item.displayDate);
    const formatted = formatInspectionFields(d, item.ocrRawText || '');

    return `
      <div class="item-card">
        <div class="item-header">
          <div>
            <span style="font-size: 8.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">Item #${idx + 1} • Barcode: ${item.barcode || 'N/A'}</span>
            <div class="item-title">${pName}</div>
          </div>
          <div style="text-align: right;">
            <div class="date-badge">${itemDate}</div>
            <div style="margin-top: 4px;"><span class="${item.status === 'Compliant' ? 'badge-ok' : (item.status === 'Attention Required' ? 'badge-warn' : 'badge-err')}">${item.status}</span></div>
          </div>
        </div>

        <div class="item-grid">
          <div class="declarations-list">
            ${formatted.fields.map((f) => `
              <div class="decl-row">
                <span class="decl-label">${f.name}:</span>
                <span class="decl-val" style="color: ${f.detected ? '#0f172a' : '#dc2626'};">${f.value}</span>
              </div>
            `).join('')}
          </div>

          ${item.evidenceImageUrl ? `
            <div class="thumb-box">
              <div style="font-size: 7.5pt; font-weight: 700; color: #64748b; margin-bottom: 4px;">OPTICAL EVIDENCE</div>
              <img class="thumb-img" src="${item.evidenceImageUrl}" alt="${pName}" />
            </div>
          ` : '<div style="font-size: 7.5pt; color: #94a3b8; text-align: center; padding-top: 20px;">No image attached</div>'}
        </div>
      </div>
    `;
  }).join('')}

  <div class="footer-signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div>Senior Legal Metrology Inspector</div>
      <div style="font-size: 7.5pt; color: #94a3b8;">Department of Consumer Affairs, Zone IV</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div>Director of Legal Metrology</div>
      <div style="font-size: 7.5pt; color: #94a3b8;">Official Enforcement Record Date: ${currentDate}</div>
    </div>
  </div>

  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 350); };
  </script>
</body>
</html>
  `;

  openPrintOrDownloadHtml(reportHtml, `LegalMetriScan_Full_Dossier_${currentDate.replace(/\//g, '-')}.html`);
}

/**
 * Robust helper to trigger browser print/save-as-PDF or download HTML
 */
function openPrintOrDownloadHtml(htmlContent, filename) {
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    // Popup was blocked by browser
  }

  // Fallback if popup blocked: direct file download
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Robust CSV export with direct Blob download
 */
export function downloadInspectionsCsv(inspections, periodLabel = '') {
  if (!Array.isArray(inspections) || inspections.length === 0) {
    alert('No items available in the selected date range to export.');
    return;
  }

  const headers = [
    'Inspection ID',
    'Date (DD/MM/YY)',
    'Product Name',
    'Category',
    'Barcode',
    'Status',
    'Verdict',
    'MRP',
    'Net Quantity',
    'FSSAI License',
    'Batch Number',
    'Manufacturing Date',
    'Expiry Date',
    'Manufacturer',
    'Customer Care',
  ];

  const escapeCsv = (str) => {
    if (str == null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const getVal = (val) => {
    if (val && typeof val === 'object' && 'value' in val) return val.value;
    return val || 'Not detected';
  };

  const rows = inspections.map((item) => {
    const d = item.details || {};
    const prodName = typeof item.productName === 'object' && item.productName !== null
      ? (item.productName.value || 'Scanned Package')
      : (item.productName || 'Scanned Package');

    const shortDate = formatToShortDate(item.timestamp || item.displayDate);

    return [
      escapeCsv(item.id),
      escapeCsv(shortDate),
      escapeCsv(prodName),
      escapeCsv(item.category || 'Packaged Commodity'),
      escapeCsv(item.barcode || 'N/A'),
      escapeCsv(item.status),
      escapeCsv(item.verdict || ''),
      escapeCsv(getVal(d.mrp)),
      escapeCsv(getVal(d.netQuantity)),
      escapeCsv(getVal(d.fssaiNumber)),
      escapeCsv(getVal(d.batchNumber || d.batch)),
      escapeCsv(getVal(d.mfgDate || d.manufacturingDate)),
      escapeCsv(getVal(d.expiryDate || d.bestBefore)),
      escapeCsv(getVal(d.manufacturer)),
      escapeCsv(getVal(d.customerCare)),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedPeriod = periodLabel ? `_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  a.download = `LegalMetriScan_Export${sanitizedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads single inspection as JSON
 */
export function downloadInspectionJson(inspection) {
  if (!inspection) return;
  const jsonStr = JSON.stringify(inspection, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Inspection_${inspection.id}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
