/**
 * inspectionFormatter.js
 *
 * Authoritative formatting and validation for statutory declarations
 * across Mobile Result Screen, Saved Reports, and Laptop Dashboard.
 */

/**
 * Net Quantity Fallback Rule:
 * 1. Look for number+unit (g, kg, ml, l, gm, litre) within same line or next line after
 *    label like "NET WT", "NET QTY", "NET QUANTITY", "NET CONTENT", "NET WEIGHT".
 * 2. Number+unit must be a whole token: unit not preceded/followed by other letters.
 * 3. Fall back to unlabeled number+unit only if exactly one exists and number >= 5 (for g/ml)
 *    or otherwise plausible. If 2+ candidates, return "Not detected".
 * 4. Otherwise return "Not detected".
 */
export function extractNetQuantityFallback(text) {
  if (!text || typeof text !== 'string') {
    return 'Not detected';
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return 'Not detected';

  const LABEL_REGEX = /\bNET\s*[\.\:\-]?\s*(?:WT|WEIGHT|WGT|QTY|QUANTITY|CONTENTS?|CONTENT)\b|\bNET\s*[\:\-]\s*|\bNET\s+(?=\d)/i;
  const TOKEN_REGEX = /(?<![a-zA-Z0-9])(\d+(?:\.\d+)?)\s*(kg|gm|gms|g|ml|litres?|litre|ltrs?|l)(?![a-zA-Z0-9])/i;
  const GLOBAL_TOKEN_REGEX = /(?<![a-zA-Z0-9])(\d+(?:\.\d+)?)\s*(kg|gm|gms|g|ml|litres?|litre|ltrs?|l)(?![a-zA-Z0-9])/gi;

  function formatCandidate(numStr, unitStr) {
    let u = unitStr.toLowerCase();
    if (u === 'gm' || u === 'gms') u = 'g';
    if (u === 'litres' || u === 'litre' || u === 'ltrs' || u === 'ltr') u = 'l';
    return `${parseFloat(numStr)} ${u}`;
  }

  function findToken(line) {
    const match = TOKEN_REGEX.exec(line);
    if (!match) return null;
    return {
      num: parseFloat(match[1]),
      unit: match[2],
      formatted: formatCandidate(match[1], match[2]),
    };
  }

  // 1. Look for labeled match on the same line or next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (LABEL_REGEX.test(line)) {
      const labelMatch = LABEL_REGEX.exec(line);
      const afterLabel = line.slice(labelMatch.index + labelMatch[0].length);
      const tokenSameLine = findToken(afterLabel) || findToken(line);
      if (tokenSameLine) {
        return tokenSameLine.formatted;
      }
      if (i + 1 < lines.length) {
        const tokenNextLine = findToken(lines[i + 1]);
        if (tokenNextLine) {
          return tokenNextLine.formatted;
        }
      }
    }
  }

  // 2 & 3. If no labeled match, look for unlabeled candidates across the text
  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    GLOBAL_TOKEN_REGEX.lastIndex = 0;
    let match;
    while ((match = GLOBAL_TOKEN_REGEX.exec(line)) !== null) {
      const num = parseFloat(match[1]);
      const rawUnit = match[2];
      const u = rawUnit.toLowerCase();

      let plausible = false;
      if (u === 'g' || u === 'gm' || u === 'gms') {
        plausible = num >= 5 && num <= 50000;
      } else if (u === 'ml') {
        plausible = num >= 5 && num <= 20000;
      } else if (u === 'kg') {
        plausible = num >= 0.1 && num <= 50;
      } else if (u === 'litre' || u === 'litres' || u === 'ltr' || u === 'ltrs') {
        plausible = num >= 0.1 && num <= 25;
      } else if (rawUnit === 'L') {
        plausible = num >= 0.1 && num <= 25;
      } else if (rawUnit === 'l') {
        const isGarbageLine = /^[\W\d_]*1?\s*l[\W\d_]*$/i.test(line) ||
          line.length < 5 ||
          (i > 0 && /^[l|1\s\d]+$/i.test(lines[i - 1])) ||
          (i + 1 < lines.length && /^[l|1\s\d]+$/i.test(lines[i + 1]));

        if (!isGarbageLine && num >= 1 && num <= 25) {
          plausible = true;
        }
      }

      if (plausible) {
        candidates.push({
          num,
          unit: rawUnit,
          formatted: formatCandidate(match[1], match[2]),
        });
      }
    }
  }

  if (candidates.length === 1) {
    return candidates[0].formatted;
  }

  return 'Not detected';
}

export function formatInspectionFields(details = {}, rawOcrText = '') {
  const getVal = (f) => (f && typeof f === 'object' && 'value' in f ? f.value : (f || 'Not detected'));

  // 1. FSSAI License
  let fssaiVal = getVal(details.fssaiNumber);
  if (!fssaiVal || fssaiVal === 'Not detected' || !/\d{14}/.test(fssaiVal)) {
    if (Array.isArray(details.fssaiLicenses) && details.fssaiLicenses.length > 0) {
      fssaiVal = details.fssaiLicenses[0].licenseNumber;
    }
  }
  const fssaiMatch = String(fssaiVal).match(/\b1\d{13}\b/);
  const cleanFssai = fssaiMatch
    ? fssaiMatch[0]
    : (fssaiVal && fssaiVal !== 'Not detected' && fssaiVal.length <= 16 && !/[@#]/.test(fssaiVal) ? String(fssaiVal).trim() : 'Not detected');
  const fssaiDetected = cleanFssai !== 'Not detected';

  // 2. Maximum Retail Price (MRP)
  let mrpVal = getVal(details.mrp);
  if (mrpVal && mrpVal !== 'Not detected') {
    const mrpMatch = String(mrpVal).match(/(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (mrpMatch) {
      mrpVal = `₹${mrpMatch[1]}`;
    }
  } else {
    mrpVal = 'Not detected';
  }
  const mrpDetected = mrpVal !== 'Not detected';

  // 3. Net Quantity
  // Rule:
  // 1. Look for number+unit (g, kg, ml, l, gm, litre) within same line or next line after label
  // 2. Number+unit must be a whole token (not preceded/followed by other letters)
  // 3. Fall back to unlabeled candidate only if exactly one exists and number >= 5 (for g/ml) or plausible
  // 4. Otherwise return "Not detected"
  let netQtyVal = getVal(details.netQuantity);
  const isValidNetQty =
    netQtyVal &&
    netQtyVal !== 'Not detected' &&
    netQtyVal !== '1 l' &&
    /\b\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|ml|l|ltr|pcs|units|u|N)\b/i.test(netQtyVal);

  if (!isValidNetQty) {
    const textToSearch = rawOcrText || getVal(details.rawText) || '';
    netQtyVal = extractNetQuantityFallback(textToSearch);
  }
  const netQtyDetected = netQtyVal !== 'Not detected';

  // 4. Batch Number
  let batchVal = getVal(details.batch) !== 'Not detected' ? getVal(details.batch) : getVal(details.batchNumber);
  if (batchVal && batchVal !== 'Not detected') {
    const bMatch = String(batchVal).match(/\b(?:[A-Z0-9]{4,16})\b/i);
    batchVal = bMatch ? bMatch[0] : String(batchVal).trim();
    if (batchVal.length > 25 || batchVal.includes('\n')) {
      batchVal = 'Not detected';
    }
  } else {
    batchVal = 'Not detected';
  }
  const batchDetected = batchVal !== 'Not detected';

  // 5. Manufacturing Date (MFD)
  let mfdVal = getVal(details.manufacturingDate) !== 'Not detected' ? getVal(details.manufacturingDate) : getVal(details.mfgDate);
  if (mfdVal && mfdVal !== 'Not detected') {
    const dateMatch = String(mfdVal).match(/\b(?:(?:0[1-9]|[12][0-9]|3[01])[\/\.\-])?(?:0[1-9]|1[0-2])[\/\.\-](?:20\d\d|\d{2})\b|\b(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*20\d\d/i);
    mfdVal = dateMatch ? dateMatch[0] : String(mfdVal).trim();
    if (mfdVal.length > 25 || mfdVal.includes('\n')) {
      mfdVal = 'Not detected';
    }
  } else {
    mfdVal = 'Not detected';
  }
  const mfdDetected = mfdVal !== 'Not detected';

  // 6. Best Before / Expiry
  let bestBeforeVal = getVal(details.bestBefore) !== 'Not detected' ? getVal(details.bestBefore) : getVal(details.expiryDate);
  if (bestBeforeVal && bestBeforeVal !== 'Not detected') {
    const cleanBb = String(bestBeforeVal).replace(/^BEST\s*BEFORE[:\s\-]*/i, '').trim();
    const firstLine = cleanBb.split('\n')[0].trim();
    bestBeforeVal = firstLine.length <= 40 ? firstLine : 'Detected';
  } else {
    bestBeforeVal = 'Not detected';
  }
  const bestBeforeDetected = bestBeforeVal !== 'Not detected';

  // 7. Manufacturer / Packer / Marketer
  let entityVal = 'Not detected';
  const mfrList = Array.isArray(details.manufacturers) ? details.manufacturers : [];
  const validMfr = mfrList.find(
    (m) => m?.company && m.company.trim().length >= 4 && !/^[0-9\s]+[a-z]?$/i.test(m.company.trim())
  );

  if (validMfr?.company) {
    entityVal = validMfr.company;
  } else if (
    details.manufacturedFor &&
    details.manufacturedFor.company &&
    details.manufacturedFor.company.trim().length >= 4
  ) {
    entityVal = `${details.manufacturedFor.company} (Manufactured For)`;
  } else if (getVal(details.manufacturer) !== 'Not detected' && getVal(details.manufacturer).trim().length >= 4) {
    entityVal = getVal(details.manufacturer);
  } else if (getVal(details.marketer) !== 'Not detected' && getVal(details.marketer).trim().length >= 4) {
    entityVal = `${getVal(details.marketer)} (Marketer)`;
  } else if (getVal(details.packer) !== 'Not detected' && getVal(details.packer).trim().length >= 4) {
    entityVal = `${getVal(details.packer)} (Packer)`;
  } else {
    // Search line containing explicit company designation in rawText
    const line = (rawOcrText || '').split('\n').find((l) => /(?:PVT\.?\s*LTD|LIMITED|PRODUCTS)/i.test(l) && !/ALLERGEN|CONTAINS/i.test(l));
    if (line) {
      const compMatch = line.match(/\b([A-Z0-9\s\.\&]{3,35}(?:PVT\.?\s*LTD|LIMITED|PRODUCTS))\b/i);
      if (compMatch) {
        entityVal = compMatch[1].trim();
      }
    }
  }

  if (entityVal && entityVal !== 'Not detected') {
    let cleanCompany = String(entityVal)
      .split('\n')[0]
      .replace(/^(?:MANUFACTURED|MFD\.?|MFG\.?)\s*(?:BY|FOR)?[:\s\-]*/i, '')
      .trim();
    // Strip leading OCR token fragments (e.g. "oi A OS te PARLE ...")
    cleanCompany = cleanCompany.replace(/^(?:[a-z0-9]{1,3}\s+)+/i, '').trim();
    entityVal = cleanCompany.length <= 60 ? cleanCompany : cleanCompany.slice(0, 57) + '...';
  } else {
    entityVal = 'Not detected';
  }
  const entityDetected = entityVal !== 'Not detected';

  // 8. Customer Care
  let ccVal = 'Not detected';
  const ccDetails = details.customerCareDetails || details.customerCare;
  const phones = Array.isArray(ccDetails?.phones) ? ccDetails.phones : [];
  const emails = Array.isArray(ccDetails?.emails) ? ccDetails.emails : [];
  const firstPhone = phones[0]?.value;
  const firstEmail = emails[0]?.value;

  if (firstPhone && firstEmail) {
    ccVal = `${firstPhone} • ${firstEmail}`;
  } else if (firstPhone) {
    ccVal = firstPhone;
  } else if (firstEmail) {
    ccVal = firstEmail;
  } else if (getVal(details.customerCare) !== 'Not detected') {
    const rawCc = String(getVal(details.customerCare)).split('\n')[0].trim();
    ccVal = rawCc.length <= 50 ? rawCc : 'Detected';
  }
  const ccDetected = ccVal !== 'Not detected';

  const fields = [
    { key: 'fssai', name: 'FSSAI License', shortLabel: 'FSSAI', value: cleanFssai, detected: fssaiDetected },
    { key: 'mrp', name: 'Maximum Retail Price (MRP)', shortLabel: 'MRP', value: mrpVal, detected: mrpDetected },
    { key: 'netQuantity', name: 'Net Quantity', shortLabel: 'Net Quantity', value: netQtyVal, detected: netQtyDetected },
    { key: 'batch', name: 'Batch Number', shortLabel: 'Batch', value: batchVal, detected: batchDetected },
    { key: 'mfd', name: 'Manufacturing Date (MFD)', shortLabel: 'MFD', value: mfdVal, detected: mfdDetected },
    { key: 'bestBefore', name: 'Best Before / Expiry', shortLabel: 'Best Before', value: bestBeforeVal, detected: bestBeforeDetected },
    { key: 'manufacturer', name: 'Manufacturer / Packer / Marketer', shortLabel: 'Manufacturer', value: entityVal, detected: entityDetected },
    { key: 'customerCare', name: 'Customer Care Helpline', shortLabel: 'Customer Care', value: ccVal, detected: ccDetected },
  ];

  const missingFields = fields.filter((f) => !f.detected).map((f) => f.shortLabel);
  const verdict = missingFields.length === 0
    ? 'All mandatory fields detected'
    : `${missingFields.length} field${missingFields.length > 1 ? 's' : ''} missing / potential issue: ${missingFields.join(', ')}`;

  return {
    fields,
    missingFields,
    verdict,
    allDetected: missingFields.length === 0,
    detectedCount: fields.filter((f) => f.detected).length,
    totalCount: fields.length,
  };
}
