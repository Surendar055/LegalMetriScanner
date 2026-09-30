/**
 * LegalMetriScan — 2D Spatial Extraction Engine
 * Conforming strictly to Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * Core Principle: NEVER extract a field merely because a number exists.
 * Values REQUIRE explicit spatial anchors and 2D proximity raycasting.
 * When uncertain, "Not detected" is strictly returned.
 */

// ============================================================
// 1. REUSABLE 2D GEOMETRY HELPERS
// ============================================================

/**
 * Calculates vertical overlap ratio between two bounding boxes relative to the shorter element.
 */
function verticalOverlap(a, b) {
  if (!a?.bbox || !b?.bbox) return 0;
  const hA = a.bbox.y1 - a.bbox.y0;
  const hB = b.bbox.y1 - b.bbox.y0;
  if (hA <= 0 || hB <= 0) return 0;

  const overlapY = Math.max(0, Math.min(a.bbox.y1, b.bbox.y1) - Math.max(a.bbox.y0, b.bbox.y0));
  const minHeight = Math.min(hA, hB);
  return minHeight > 0 ? overlapY / minHeight : 0;
}

/**
 * Determines if candidate token is on the same visual baseline/line as the anchor.
 */
function isSameLine(anchor, candidate) {
  if (!anchor?.bbox || !candidate?.bbox) return false;
  const vOverlap = verticalOverlap(anchor, candidate);
  if (vOverlap >= 0.40) return true;

  const hA = anchor.bbox.y1 - anchor.bbox.y0;
  const hB = candidate.bbox.y1 - candidate.bbox.y0;
  const avgH = (hA + hB) / 2;
  const centerA = (anchor.bbox.y0 + anchor.bbox.y1) / 2;
  const centerC = (candidate.bbox.y0 + candidate.bbox.y1) / 2;
  const diffCenter = Math.abs(centerA - centerC);

  return diffCenter <= avgH * 0.45;
}

/**
 * Determines if candidate is positioned to the right of the anchor.
 */
function isToRight(anchor, candidate) {
  if (!anchor?.bbox || !candidate?.bbox) return false;
  // Candidate starts after or at the anchor start, allowing slight 5px OCR overlap
  return candidate.bbox.x0 >= anchor.bbox.x0 - 5;
}

/**
 * Horizontal distance in pixels from right edge of anchor to left edge of candidate.
 */
function horizontalDistance(anchor, candidate) {
  if (!anchor?.bbox || !candidate?.bbox) return Infinity;
  if (candidate.bbox.x0 >= anchor.bbox.x1) {
    return candidate.bbox.x0 - anchor.bbox.x1;
  }
  if (candidate.bbox.x1 >= anchor.bbox.x0) {
    // Partially overlapping horizontally
    return 0;
  }
  // To the left
  return anchor.bbox.x0 - candidate.bbox.x1;
}

/**
 * Checks if candidate is within a reasonable distance on the same line.
 */
function isReasonablyClose(anchor, candidate, maxFactor = 12) {
  const h = anchor.bbox.y1 - anchor.bbox.y0;
  const dist = horizontalDistance(anchor, candidate);
  const maxAllowedDist = Math.max(h * maxFactor, 350);
  return dist >= 0 && dist <= maxAllowedDist;
}

// ============================================================
// 2. VALIDATORS & SANITIZERS
// ============================================================

const STATUTORY_UNITS = ['g', 'gm', 'gms', 'kg', 'mg', 'ml', 'l', 'ltr', 'litre', 'litres'];

/**
 * Validates if candidate token text looks like a price value.
 * Rejects units, nutritional markers, single random digits.
 */
function isValidMrpValue(text) {
  if (!text) return null;
  const clean = text.trim().replace(/^[:.\-\s]+/, '').replace(/[:.\-\s]+$/, '');

  // Reject if it contains quantity units
  if (/\b(?:g|gm|gms|kg|mg|ml|l|ltr|kcal|cal|%)\b/i.test(clean)) return null;

  // Patterns for price:
  // e.g. "60.00", "60", "₹60.00", "Rs.60.00", "Rs.60", "60/-", "₹60"
  const m = clean.match(/^(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:\/-)?$/i);
  if (m && m[1]) {
    const val = parseFloat(m[1]);
    if (!isNaN(val) && val >= 1 && val <= 50000) {
      return {
        numeric: val,
        formatted: `₹${m[1]}`,
        raw: clean,
      };
    }
  }
  return null;
}

/**
 * Validates if candidate token text (or two adjacent words) looks like a valid packaged Net Quantity.
 */
function isValidQuantityValue(word1, word2 = null) {
  if (!word1) return null;
  const t1 = word1.text.trim().replace(/^[:.\-\s]+/, '').replace(/[:.\-\s]+$/, '');

  // 1. Single-token quantity: "200g", "200 g", "1kg", "500ml", "275.55g"
  const singleMatch = t1.match(/^([0-9]+(?:\.[0-9]+)?)\s*(g|gm|gms|kg|mg|ml|l|ltr)\b/i);
  if (singleMatch) {
    const num = parseFloat(singleMatch[1]);
    let unit = singleMatch[2].toLowerCase();
    if (unit === 'gm' || unit === 'gms') unit = 'g';
    if (unit === 'ltr' || unit === 'l') unit = 'L';
    if (num > 0) {
      return {
        value: `${singleMatch[1]} ${unit}`,
        words: [word1],
        confidence: word1.confidence || 90,
      };
    }
  }

  // 2. Two-token quantity: word1 = "200", word2 = "g"
  if (word2 && isSameLine(word1, word2) && isToRight(word1, word2)) {
    const t2 = word2.text.trim().replace(/^[:.\-\s]+/, '').replace(/[:.\-\s]+$/, '').toLowerCase();
    const numMatch = t1.match(/^([0-9]+(?:\.[0-9]+)?)$/);
    if (numMatch && STATUTORY_UNITS.includes(t2)) {
      const num = parseFloat(numMatch[1]);
      let unit = t2;
      if (unit === 'gm' || unit === 'gms') unit = 'g';
      if (unit === 'ltr' || unit === 'l') unit = 'L';
      if (num > 0) {
        return {
          value: `${numMatch[1]} ${unit}`,
          words: [word1, word2],
          confidence: Math.round(((word1.confidence || 90) + (word2.confidence || 90)) / 2),
        };
      }
    }
  }

  return null;
}

/**
 * Validates if candidate token text (or two adjacent words) is a strictly valid 14-digit FSSAI license.
 * Strictly rejects barcodes (13 digits), phones (10 digits), PINs (6 digits), etc.
 */
function isValidFssaiValue(word1, word2 = null) {
  if (!word1) return null;
  const t1 = word1.text.trim().replace(/^[:.\-\s]+/, '').replace(/[:.\-\s]+$/, '');

  // Reject phone numbers starting with standard prefixes
  if (/^(?:1800|022|\+91)/.test(t1)) return null;

  // 1. Single token with exactly 14 digits
  const digits1 = t1.replace(/[^0-9]/g, '');
  if (digits1.length === 14 && /^\d{14}$/.test(digits1)) {
    return {
      licenseNumber: digits1,
      words: [word1],
      confidence: word1.confidence || 90,
    };
  }

  // 2. Two adjacent tokens on same line that concatenate to 14 digits (e.g. OCR split "10013" + "022002253")
  if (word2 && isSameLine(word1, word2) && isToRight(word1, word2) && horizontalDistance(word1, word2) <= 35) {
    const t2 = word2.text.trim().replace(/^[:.\-\s]+/, '').replace(/[:.\-\s]+$/, '');
    if (/^(?:1800|022|\+91)/.test(t2)) return null;

    const digits2 = t2.replace(/[^0-9]/g, '');
    const combined = digits1 + digits2;
    if (combined.length === 14 && /^\d{14}$/.test(combined)) {
      return {
        licenseNumber: combined,
        words: [word1, word2],
        confidence: Math.round(((word1.confidence || 90) + (word2.confidence || 90)) / 2),
      };
    }
  }

  return null;
}

// ============================================================
// 3. ANCHOR DETECTION
// ============================================================

/**
 * Finds explicit MRP anchors in words array.
 * Recognizes MRP, M.R.P, M R P, MRP., MRP:, MRP Rs, etc.
 */
function findMrpAnchors(words) {
  const anchors = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const clean = w.text.trim().replace(/[:.\-]+$/, '').toUpperCase();

    // Direct MRP match
    if (/^(?:MRP|M\.?R\.?P\.?)$/.test(clean)) {
      // Check if next word is currency: "MRP" + "Rs." / "MRP" + "₹"
      let nextW = words[i + 1];
      let combinedText = w.text;
      let combinedBbox = { ...w.bbox };

      if (nextW && isSameLine(w, nextW) && isToRight(w, nextW) && horizontalDistance(w, nextW) <= 25) {
        if (/^(?:Rs\.?|₹|INR)$/i.test(nextW.text.trim())) {
          combinedText += ` ${nextW.text}`;
          combinedBbox.x1 = nextW.bbox.x1;
          combinedBbox.y1 = Math.max(combinedBbox.y1, nextW.bbox.y1);
        }
      }

      anchors.push({
        text: combinedText,
        clean,
        bbox: combinedBbox,
        startIndex: i,
        confidence: w.confidence || 90,
      });
      continue;
    }

    // "MAXIMUM RETAIL PRICE" or "MAX RETAIL" multi-word anchor
    if (/^(?:MAX|MAXIMUM)$/i.test(clean) && i + 1 < words.length) {
      const wNext = words[i + 1];
      if (/^RETAIL$/i.test(wNext.text.trim()) && isSameLine(w, wNext)) {
        let spanText = `${w.text} ${wNext.text}`;
        let x1 = wNext.bbox.x1;
        if (i + 2 < words.length && /^PRICE$/i.test(words[i + 2].text.trim()) && isSameLine(w, words[i + 2])) {
          spanText += ` ${words[i + 2].text}`;
          x1 = words[i + 2].bbox.x1;
        }
        anchors.push({
          text: spanText,
          clean: 'MAX RETAIL PRICE',
          bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1, y1: w.bbox.y1 },
          startIndex: i,
          confidence: w.confidence || 90,
        });
      }
    }
  }

  return anchors;
}

/**
 * Finds explicit Net Quantity anchors in words array.
 * Recognizes NET WEIGHT, NET WT, NET Wt., NET QUANTITY, NET QTY, NET CONTENT, etc.
 */
function findNetQuantityAnchors(words) {
  const anchors = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const clean = w.text.trim().replace(/[:.\-]+$/, '').toUpperCase();

    // Look for "NET" followed by "WEIGHT" | "WT" | "QUANTITY" | "QTY" | "CONTENT" | "CONTENTS"
    if (/^NET$/i.test(clean) && i + 1 < words.length) {
      const nextW = words[i + 1];
      const nextClean = nextW.text.trim().replace(/[:.\-]+$/, '').toUpperCase();

      if (/^(?:WEIGHT|WT|QUANTITY|QTY|CONTENT|CONTENTS)$/i.test(nextClean) && isSameLine(w, nextW) && isToRight(w, nextW)) {
        anchors.push({
          text: `${w.text} ${nextW.text}`,
          clean: `NET ${nextClean}`,
          bbox: {
            x0: w.bbox.x0,
            y0: Math.min(w.bbox.y0, nextW.bbox.y0),
            x1: nextW.bbox.x1,
            y1: Math.max(w.bbox.y1, nextW.bbox.y1),
          },
          startIndex: i,
          confidence: Math.round(((w.confidence || 90) + (nextW.confidence || 90)) / 2),
        });
        i++; // skip nextW
        continue;
      }
    }

    // Compound single tokens: e.g. "NET_WT:", "NETWT"
    if (/^NET[_\s-]*(?:WT|WEIGHT|QTY|QUANTITY)[:.\-]?$/i.test(clean)) {
      anchors.push({
        text: w.text,
        clean: 'NET WT',
        bbox: { ...w.bbox },
        startIndex: i,
        confidence: w.confidence || 90,
      });
    }
  }

  return anchors;
}

/**
 * Finds explicit FSSAI license anchors in words array.
 * Recognizes "FSSAI", "FSSAI LIC", "FSSAI LIC.", "FSSAI LICENSE NO", "LIC. NO.", etc.
 */
function findFssaiAnchors(words, lines) {
  const anchors = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const clean = w.text.trim().replace(/[:.\-]+$/, '').toUpperCase();

    // 1. Direct FSSAI anchor (including common OCR noise "FSSAL", "F5SAI")
    if (/^(?:FSSAI|FSSAL|F5SAI)$/.test(clean)) {
      let combinedText = w.text;
      let x1 = w.bbox.x1;
      let y0 = w.bbox.y0;
      let y1 = w.bbox.y1;
      let lastIndex = i;

      let j = i + 1;
      while (j < words.length && j <= i + 4) {
        const nextW = words[j];
        if (!isSameLine(w, nextW) || !isToRight(w, nextW) || horizontalDistance({ bbox: { x0: w.bbox.x0, y0, x1, y1 } }, nextW) > 40) {
          break;
        }
        const nextClean = nextW.text.trim().replace(/[:.\-]+$/, '').toUpperCase();
        if (/^(?:LIC|LICENCE|LICENSE|NO|NUMBER|CODE)$/.test(nextClean)) {
          combinedText += ` ${nextW.text}`;
          x1 = nextW.bbox.x1;
          y0 = Math.min(y0, nextW.bbox.y0);
          y1 = Math.max(y1, nextW.bbox.y1);
          lastIndex = j;
          j++;
        } else {
          break;
        }
      }

      anchors.push({
        text: combinedText,
        clean: 'FSSAI LIC NO',
        bbox: { x0: w.bbox.x0, y0, x1, y1 },
        startIndex: i,
        endIndex: lastIndex,
        isCorporateFssai: true,
        confidence: w.confidence || 90,
      });

      i = lastIndex;
      continue;
    }

    // 2. Standalone "LIC. NO." or "LICENCE NO." (associated with unit declarations)
    if (/^(?:LIC|LICENCE|LICENSE)$/.test(clean)) {
      if (i + 1 < words.length) {
        const nextW = words[i + 1];
        const nextClean = nextW.text.trim().replace(/[:.\-]+$/, '').toUpperCase();
        if (/^(?:NO|NUMBER)$/.test(nextClean) && isSameLine(w, nextW) && isToRight(w, nextW) && horizontalDistance(w, nextW) <= 25) {
          const combinedText = `${w.text} ${nextW.text}`;
          anchors.push({
            text: combinedText,
            clean: 'LIC NO',
            bbox: {
              x0: w.bbox.x0,
              y0: Math.min(w.bbox.y0, nextW.bbox.y0),
              x1: nextW.bbox.x1,
              y1: Math.max(w.bbox.y1, nextW.bbox.y1),
            },
            startIndex: i,
            endIndex: i + 1,
            isCorporateFssai: false,
            confidence: Math.round(((w.confidence || 90) + (nextW.confidence || 90)) / 2),
          });
          i++; // skip nextW
          continue;
        }
      }
    }
  }

  return anchors;
}

// ============================================================
// 4. FIND ENCLOSING SOURCE LINE
// ============================================================

function findEnclosingLineText(anchorBbox, valueBbox, lines) {
  if (!lines || lines.length === 0) return null;

  // Find line with largest vertical overlap with anchor and value
  let bestLine = null;
  let bestScore = -1;

  for (const l of lines) {
    if (!l.bbox) continue;
    const vAnchor = verticalOverlap({ bbox: anchorBbox }, l);
    const vValue = verticalOverlap({ bbox: valueBbox }, l);
    const score = vAnchor + vValue;
    if (score > bestScore && (vAnchor > 0.3 || vValue > 0.3)) {
      bestScore = score;
      bestLine = l.text;
    }
  }

  return bestLine;
}

// ============================================================
// 5. ENTITY & POSTAL ADDRESS SPATIAL EXTRACTION (PHASE 3B)
// ============================================================

const CORP_SUFFIX_REGEX = /\b(PVT\.?\s*(?:LTD|LID|LTO)\.?|PRIVATE\s*LIMITED|LTD\.?|LID\.?|LTO\.?|LIMITED|LLP|L\.L\.P\.?|INC\.?|CORP\.?|CO\.)\b/i;
const COMPANY_KEYWORD_REGEX = /\b(FOOD\s*PRODUCTS|FOODS\s*PRODUCTS|FOODS|PRODUCTS|INDUSTRIES|BEVERAGES|CONFECTIONERY|ENTERPRISES|BAKERY|MILLS|FARMS|AGRO|BISCUITS)\b/i;
const ADDRESS_START_REGEX = /\b(?:[0-9]+[\/-][0-9A-Za-z]+|PLOT|SECTOR|SEC\.?|SURVEY|INDL|INDUSTRIAL|ESTATE|VILLAGE|ROAD|STREET|CROSSING|LANE|AVENUE|NAGAR|COLONY|FLOOR|TOWER|BUILDING|PREMISES|POST|DIST|DISTRICT|MUMBAI|HYDERABAD|DELHI|CHENNAI|KOLKATA|BENGALURU|BANGALORE|PUNE|AHMEDABAD|RAIGAD|SANWER|RUDRAPUR|SITARGANJ|KATTEDAN|BHUBANESWAR|TS|MH|MP|UK|UP|TN|KA|GJ|WB|DL|HR|PB|OR|AP|RJ)\b/i;
const UNIT_CODE_REGEX = /^\s*(?:\(([A-Z0-9]{1,3})\)|\[([A-Z0-9]{1,3})\])\s*[-:]?\s*/i;
const FSSAI_INLINE_REGEX = /(?:(?:FSSAI\s*)?LIC(?:EN[CS]E)?\.?\s*NO\.?[:.\-]?\s*)([0-9]{14})\b/i;

const ANCHOR_PATTERNS = [
  { role: 'Manufactured For', pattern: /^(?:MANUFACTURED|MFD\.?|MFG\.?)\s+FOR\b/i },
  { role: 'Manufacturer', pattern: /^(?:MANUFACTURED|MFD\.?|MFG\.?|PRODUCED)\s+BY\b|^MANUFACTURER\b/i },
  { role: 'Packer', pattern: /^(?:PACKED|PACKAGED|PKD\.?)\s+BY\b|^PACKER\b/i },
  { role: 'Marketer', pattern: /^(?:MARKETED(?:\s+(?:AND|&)\s+DISTRIBUTED)?|MKTD\.?|DISTRIBUTED)\s+BY\b|^MARKETER\b/i },
];

const BOUNDARY_PATTERN = /^(?:CUSTOMER|CONSUMER|HELPLINE|PHONE|TEL|EMAIL|BARCODE|EAN|UPC|MRP|NET\s*(?:WT|WEIGHT|QTY|QUANTITY)|BEST\s*BEFORE|EXPIRY|EXP\b|USE\s*BY|BATCH\s*NO|LOT\s*NO|NUTRITION|INGREDIENTS|FSSAI\s*(?:LIC|LICENCE|LICENSE|NO\.?))/i;

function cleanAddress(addr) {
  if (!addr) return '';
  return addr
    .replace(/^[,.\s\-]+|[,.\s\-]+$/g, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanCompany(comp) {
  if (!comp) return '';
  return comp
    .replace(/^[:.\-\s]+|[:.\-\s,]+$/g, '')
    .replace(/\bPVT\.?\s*(?:LID|LTO)\b/gi, 'PVT LTD')
    .replace(/\bLID\b/gi, 'LTD')
    .replace(/\bLTO\b/gi, 'LTD')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidAddress(addr) {
  if (!addr) return false;
  const clean = cleanAddress(addr);
  // Rejections:
  // Must not be standalone PIN code
  if (/^[1-9][0-9]{5}$/.test(clean.replace(/\s/g, ''))) return false;
  // Must not be phone number
  if (/^(?:0\d{2,4}[-\s]?\d{6,8}|1800[-\s]?\d{3,4}[-\s]?\d{3,4}|(?:\+91)?[6-9]\d{9})$/.test(clean.replace(/[-\s()]/g, ''))) return false;
  // Must not be FSSAI license
  if (/^\d{14}$/.test(clean.replace(/\s/g, ''))) return false;
  // Must not be barcode
  if (/^\d{8,14}$/.test(clean.replace(/\s/g, ''))) return false;
  // Must not be MRP or Net Qty
  if (/^(?:MRP|MAX|RS\.?|₹|INR)\s*[:.\-]?\s*[0-9]+/i.test(clean)) return false;
  if (/^(?:NET\s*(?:WT|WEIGHT|QTY|QUANTITY)?\s*[:.\-]?\s*)?[0-9]+(?:\.[0-9]+)?\s*(?:g|gm|kg|ml|l|ltr|oz)\b/i.test(clean)) return false;
  // Must not be statutory batch/date markers
  if (/^(?:BATCH|LOT|B\.NO|EXP|MFD|PKD|BEST\s*BEFORE)\b/i.test(clean)) return false;

  // Positive validation: must have length >= 3 and contain letters
  if (clean.length < 3 || !/[a-zA-Z]/.test(clean)) return false;

  return true;
}

function parseCompanyAndAddressFromText(rawText) {
  let text = rawText.trim();
  let code = null;
  let fssaiLicense = null;

  // 1. Extract inline FSSAI if present
  const fssaiMatch = text.match(FSSAI_INLINE_REGEX) || text.match(/\b([0-9]{14})\b/);
  if (fssaiMatch) {
    fssaiLicense = fssaiMatch[1];
    text = text.replace(fssaiMatch[0], '').trim();
  }

  // 2. Extract Unit Code
  const codeMatch = text.match(UNIT_CODE_REGEX);
  if (codeMatch) {
    let rawCode = (codeMatch[1] || codeMatch[2]).toUpperCase();
    if (/^1([0-9A-Z])$/.test(rawCode)) {
      rawCode = 'I' + rawCode.slice(1);
    }
    code = rawCode;
    text = text.substring(codeMatch[0].length).trim();
  }

  let company = '';
  let address = '';

  // 3. Corporate legal suffix
  const corpMatch = text.match(/^(.*?\b(?:PVT\.?\s*(?:LTD|LID|LTO)\.?|PRIVATE\s*LIMITED|LTD\.?|LID\.?|LTO\.?|LIMITED|LLP)\b)(?:[,.\s\-]+(.*))?$/i);
  if (corpMatch) {
    company = corpMatch[1];
    address = corpMatch[2] || '';
  } else {
    // Check company keyword followed by address cue
    const kwMatch = text.match(COMPANY_KEYWORD_REGEX);
    if (kwMatch) {
      const endKw = kwMatch.index + kwMatch[0].length;
      const rem = text.substring(endKw).trim();
      const addrIdx = rem.search(ADDRESS_START_REGEX);
      if (addrIdx >= 0) {
        company = text.substring(0, endKw + addrIdx);
        address = rem.substring(addrIdx);
      } else {
        const commaIdx = text.indexOf(',');
        if (commaIdx > 3) {
          company = text.substring(0, commaIdx);
          address = text.substring(commaIdx + 1);
        } else {
          company = text;
        }
      }
    } else {
      const addrIdx = text.search(ADDRESS_START_REGEX);
      if (addrIdx > 3) {
        company = text.substring(0, addrIdx);
        address = text.substring(addrIdx);
      } else {
        const commaIdx = text.indexOf(',');
        if (commaIdx > 3) {
          company = text.substring(0, commaIdx);
          address = text.substring(commaIdx + 1);
        } else {
          company = text;
        }
      }
    }
  }

  return {
    code,
    company: cleanCompany(company),
    address: cleanAddress(address),
    fssaiLicense,
  };
}

/**
 * Extracts Manufacturer, Packer, Marketer, and Manufactured For declarations with associated addresses.
 */
function extractSpatialEntities(lines, words, detectedFssaiLicenses = []) {
  const manufacturers = [];
  const packers = [];
  const marketers = [];
  let manufacturedFor = null;
  const debugEntities = [];

  // Filter out nutrition facts lines
  const cleanLines = lines.filter((l) => {
    return !/(?:serving\s*size|servings\s*per|calories|energy|total\s*fat|saturated\s*fat|sodium|carbohydrate|sugars|protein|nutrition\s*facts)/i.test(l.text);
  });

  const sortedLines = [...cleanLines].sort((a, b) => (a.bbox?.y0 ?? 0) - (b.bbox?.y0 ?? 0));

  let currentRole = null;
  let i = 0;

  while (i < sortedLines.length) {
    const line = sortedLines[i];
    const text = line.text.trim();

    // Check declaration anchor
    let matchedAnchor = null;
    let strippedText = text;

    for (const a of ANCHOR_PATTERNS) {
      const m = text.match(a.pattern);
      if (m) {
        matchedAnchor = a;
        currentRole = a.role;
        strippedText = text.substring(m[0].length).replace(/^[:.\-\s]+/, '').trim();
        break;
      }
    }

    const unitCodeMatch = text.match(UNIT_CODE_REGEX);
    const isUnitDeclaration = !!unitCodeMatch;

    if (!matchedAnchor && !isUnitDeclaration) {
      i++;
      continue;
    }

    const role = matchedAnchor ? matchedAnchor.role : (currentRole || 'Manufacturer');
    const anchorText = matchedAnchor ? text.match(matchedAnchor.pattern)[0] : (unitCodeMatch ? unitCodeMatch[0] : '');

    const associatedLines = [line];
    let candidateText = strippedText;

    // Parse initial line
    const parsedInit = parseCompanyAndAddressFromText(candidateText);
    let code = parsedInit.code;
    let companyCandidate = parsedInit.company;
    let addressParts = parsedInit.address && isValidAddress(parsedInit.address) ? [parsedInit.address] : [];
    let fssaiLicense = parsedInit.fssaiLicense;

    // Continuation lines
    let j = i + 1;
    while (j < sortedLines.length) {
      const nextLine = sortedLines[j];
      const nextText = nextLine.text.trim();

      // Check boundary stop
      const isNewAnchor = ANCHOR_PATTERNS.some(a => a.pattern.test(nextText));
      const isNewUnit = UNIT_CODE_REGEX.test(nextText);
      const isBoundary = BOUNDARY_PATTERN.test(nextText);

      if (isNewAnchor || isNewUnit || isBoundary) {
        break;
      }

      // Standalone FSSAI license line
      const nextFssaiMatch = nextText.match(FSSAI_INLINE_REGEX) || nextText.match(/\b([0-9]{14})\b/);
      if (nextFssaiMatch && !fssaiLicense) {
        fssaiLicense = nextFssaiMatch[1];
        associatedLines.push(nextLine);
        j++;
        const remaining = nextText.replace(nextFssaiMatch[0], '').replace(/^[:.\-\s]+/, '').trim();
        if (remaining.length === 0 || /^LIC\.?\s*(?:NO\.?)?$/i.test(remaining)) {
          break;
        }
        continue;
      }

      // Check vertical spacing
      const prevLine = sortedLines[j - 1];
      const vDist = (nextLine.bbox?.y0 ?? 0) - (prevLine.bbox?.y1 ?? 0);
      const prevH = (prevLine.bbox?.y1 ?? 20) - (prevLine.bbox?.y0 ?? 0);
      if (vDist > Math.max(prevH * 3.5, 75)) {
        break;
      }

      // Company candidate if not yet identified
      if (!companyCandidate) {
        const parsedNext = parseCompanyAndAddressFromText(nextText);
        companyCandidate = parsedNext.company;
        if (parsedNext.address && isValidAddress(parsedNext.address)) {
          addressParts.push(parsedNext.address);
        }
        if (parsedNext.fssaiLicense && !fssaiLicense) {
          fssaiLicense = parsedNext.fssaiLicense;
        }
        associatedLines.push(nextLine);
        j++;
        continue;
      }

      // Address continuation
      if (isValidAddress(nextText)) {
        addressParts.push(cleanAddress(nextText));
        associatedLines.push(nextLine);
      }
      j++;
    }

    // Try FSSAI association with Phase 3A detected licenses if still null
    if (!fssaiLicense && detectedFssaiLicenses.length > 0) {
      if (code) {
        const matchedFssai = detectedFssaiLicenses.find(l => l.unitCode === code || (code === 'I3' && l.unitCode === '13'));
        if (matchedFssai) {
          fssaiLicense = matchedFssai.licenseNumber;
        }
      }
      if (!fssaiLicense) {
        // Nearest vertical license within entity bbox
        const entityY0 = Math.min(...associatedLines.map(l => l.bbox?.y0 ?? 0));
        const entityY1 = Math.max(...associatedLines.map(l => l.bbox?.y1 ?? 0));
        const nearFssai = detectedFssaiLicenses.find(l => {
          if (!l.valueToken?.bbox) return false;
          const fY0 = l.valueToken.bbox.y0;
          return fY0 >= entityY0 - 20 && fY0 <= entityY1 + 50;
        });
        if (nearFssai) {
          fssaiLicense = nearFssai.licenseNumber;
        }
      }
    }

    const fullAddress = cleanAddress(addressParts.join(', '));
    const sourceText = associatedLines.map(l => l.text.trim()).join(' ');

    const entityResult = {
      role,
      code,
      company: companyCandidate || 'Not detected',
      address: fullAddress || 'Not detected',
      fssaiLicense,
      source: sourceText,
      confidence: companyCandidate && companyCandidate !== 'Not detected' ? 'HIGH' : 'LOW',
    };

    const accepted = !!companyCandidate && companyCandidate !== 'Not detected';
    debugEntities.push({
      anchor: anchorText,
      role,
      companyCandidate,
      associatedLines: associatedLines.map(l => l.text),
      addressCandidate: fullAddress,
      fssaiCandidate: fssaiLicense,
      spatialDistances: {
        lineCount: associatedLines.length,
        y0: Math.min(...associatedLines.map(l => l.bbox?.y0 ?? 0)),
        y1: Math.max(...associatedLines.map(l => l.bbox?.y1 ?? 0)),
      },
      score: accepted ? 90 : 0,
      accepted,
      rejectionReason: !accepted ? 'No company candidate identified from anchor proximity' : null,
    });

    if (accepted) {
      if (role === 'Manufacturer') {
        manufacturers.push(entityResult);
      } else if (role === 'Packer') {
        packers.push(entityResult);
      } else if (role === 'Marketer') {
        marketers.push(entityResult);
      } else if (role === 'Manufactured For') {
        if (!manufacturedFor) {
          manufacturedFor = {
            role: 'Manufactured For',
            company: entityResult.company,
            address: entityResult.address,
            fssaiLicense: entityResult.fssaiLicense,
            source: entityResult.source,
            confidence: entityResult.confidence,
          };
        }
      }
    }

    i = j;
  }

  return {
    manufacturers,
    packers,
    marketers,
    manufacturedFor,
    debug: debugEntities,
  };
}

// ============================================================
// 6. CUSTOMER CARE / PHONE / EMAIL SPATIAL EXTRACTION (PHASE 3C)
// ============================================================

const CC_BLOCK_ANCHOR = /^(?:CONSUMER|CUSTOMER)\s*(?:CARE|SERVICE)?\s*(?:CELL|HELPLINE)?\b|^(?:HELPLINE|TOLL\s*FREE|CONTACT\s*US)\b/i;
const PHONE_ANCHOR = /^(?:PHONE|TEL(?:EPHONE)?|CALL\s*(?:US)?|TOLL\s*FREE|HELPLINE)\s*(?:NO\.?|NUMBER)?\b/i;
const EMAIL_ANCHOR = /^(?:E-?MAIL|EMAIL\s*ID)\b/i;

const PHONE_REGEX = /(?:(?:\+91[-\s]?)?0\d{2,4}[-\s]?(?:\d{3,4}[-\s]?\d{3,4}|\d{6,8})|1800[-\s]?(?:\d{2,4}[-\s]?\d{2,4}[-\s]?\d{2,4}|\d{6,8})|(?:\+91[-\s]?)?[6-9]\d{4}[-\s]?\d{5})\b/;
const EMAIL_REGEX = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;

const CC_BOUNDARY_PATTERN = /^(?:BARCODE|EAN|UPC|MRP|NET\s*(?:WT|WEIGHT|QTY|QUANTITY)|BEST\s*BEFORE|EXPIRY|EXP\b|USE\s*BY|BATCH\s*NO|LOT\s*NO|NUTRITION|INGREDIENTS|MANUFACTURED|PACKED|MARKETED|FSSAI)/i;

function normalizePhone(raw) {
  if (!raw) return '';
  let clean = raw.trim().replace(/^[:.\-\s]+|[:.\-\s]+$/g, '');
  if (/^0\d{2,4}[-\s]/.test(clean)) {
    const parts = clean.split(/[-\s]+/);
    if (parts.length >= 2) {
      return `${parts[0]}-${parts.slice(1).join('')}`;
    }
  }
  return clean.replace(/\s+/g, '');
}

/**
 * Extracts Customer Care declaration: organization, postal address, phones, and emails.
 */
function extractSpatialCustomerCare(lines, words = []) {
  const cleanLines = lines.filter((l) => {
    return !/(?:serving\s*size|servings\s*per|calories|energy|total\s*fat|saturated\s*fat|sodium|carbohydrate|sugars|protein|nutrition\s*facts)/i.test(l.text);
  });

  const sortedLines = [...cleanLines].sort((a, b) => (a.bbox?.y0 ?? 0) - (b.bbox?.y0 ?? 0));
  const debugCandidates = [];

  let ccStartIndex = -1;
  let ccAnchorText = null;

  for (let i = 0; i < sortedLines.length; i++) {
    const text = sortedLines[i].text.trim();
    if (CC_BLOCK_ANCHOR.test(text) || PHONE_ANCHOR.test(text) || EMAIL_ANCHOR.test(text)) {
      ccStartIndex = i;
      const m = text.match(CC_BLOCK_ANCHOR) || text.match(PHONE_ANCHOR) || text.match(EMAIL_ANCHOR);
      ccAnchorText = m ? m[0] : text;
      break;
    }
  }

  if (ccStartIndex === -1) {
    return { customerCare: null, debug: debugCandidates };
  }

  let organization = null;
  let addressParts = [];
  const phones = [];
  const emails = [];

  let j = ccStartIndex;
  while (j < sortedLines.length) {
    const line = sortedLines[j];
    const text = line.text.trim();

    // Check stop boundary if past the initial line
    if (j > ccStartIndex && CC_BOUNDARY_PATTERN.test(text)) {
      break;
    }

    // Check vertical gap
    if (j > ccStartIndex) {
      const prevLine = sortedLines[j - 1];
      const vDist = (line.bbox?.y0 ?? 0) - (prevLine.bbox?.y1 ?? 0);
      const prevH = (prevLine.bbox?.y1 ?? 20) - (prevLine.bbox?.y0 ?? 0);
      if (vDist > Math.max(prevH * 4, 90)) {
        break;
      }
    }

    // 1. Check for Phone in line
    const phoneMatch = text.match(PHONE_REGEX);
    if (phoneMatch) {
      const rawPhone = phoneMatch[0];
      const normPhone = normalizePhone(rawPhone);
      const digitsOnly = normPhone.replace(/\D/g, '');
      const isFssai = digitsOnly.length === 14;
      const isBarcode = digitsOnly.length === 13 && /^(?:890|0)/.test(digitsOnly);
      const isPin = digitsOnly.length === 6;

      const accepted = !isFssai && !isBarcode && !isPin && digitsOnly.length >= 8 && digitsOnly.length <= 12;
      const reason = !accepted ? 'Matched token is barcode/FSSAI/PIN' : null;

      const pAnchor = text.match(PHONE_ANCHOR) ? text.match(PHONE_ANCHOR)[0] : ccAnchorText;

      debugCandidates.push({
        anchor: pAnchor,
        candidate: normPhone,
        type: 'phone',
        sameLine: true,
        toRight: true,
        verticalOverlap: 1,
        horizontalDistance: 0,
        score: accepted ? 95 : 0,
        accepted,
        rejectionReason: reason,
      });

      if (accepted && !phones.some(p => p.value === normPhone)) {
        phones.push({
          value: normPhone,
          source: text,
          confidence: 'HIGH',
        });
      }
    }

    // 2. Check for Email in line
    const emailMatch = text.match(EMAIL_REGEX);
    if (emailMatch) {
      const emailVal = emailMatch[1].toLowerCase();
      const eAnchor = text.match(EMAIL_ANCHOR) ? text.match(EMAIL_ANCHOR)[0] : ccAnchorText;

      debugCandidates.push({
        anchor: eAnchor,
        candidate: emailVal,
        type: 'email',
        sameLine: true,
        toRight: true,
        verticalOverlap: 1,
        horizontalDistance: 0,
        score: 95,
        accepted: true,
        rejectionReason: null,
      });

      if (!emails.some(e => e.value === emailVal)) {
        emails.push({
          value: emailVal,
          source: text,
          confidence: 'HIGH',
        });
      }
    }

    // 3. Check for Organization / Address (when neither phone nor email line)
    if (!phoneMatch && !emailMatch) {
      const cleanLineText = text.replace(CC_BLOCK_ANCHOR, '').replace(/^[:.\-\s]+/, '').trim();
      if (cleanLineText.length > 0) {
        const corpMatch = cleanLineText.match(/^(.*?\b(?:PVT\.?\s*(?:LTD|LID|LTO)\.?|PRIVATE\s*LIMITED|LTD\.?|LIMITED|LLP)\b)(?:[,.\s\-]+(.*))?$/i);
        if (corpMatch && !organization) {
          organization = cleanCompany(corpMatch[1]);
          if (corpMatch[2]) {
            addressParts.push(cleanAddress(corpMatch[2]));
          }
        } else if (organization) {
          addressParts.push(cleanAddress(cleanLineText));
        }
      }
    }

    j++;
  }

  if (phones.length === 0 && emails.length === 0 && !organization) {
    return { customerCare: null, debug: debugCandidates };
  }

  const fullAddress = addressParts.length > 0 ? cleanAddress(addressParts.join(', ')) : null;

  return {
    customerCare: {
      organization: organization || null,
      address: fullAddress || null,
      phones,
      emails,
      confidence: phones.length > 0 || emails.length > 0 ? 'HIGH' : 'MEDIUM',
    },
    debug: debugCandidates,
  };
}

// ============================================================
// 6.5 PHASE 3D: SPATIAL BATCH, MANUFACTURING DATE, AND BEST BEFORE EXTRACTION
// ============================================================

const DATE_REGEX = /\b(?:(?:0[1-9]|[12][0-9]|3[01])[\/.\-](?:0[1-9]|1[0-2])[\/.\-](?:20\d\d|\d{2})|(?:0[1-9]|[12][0-9]|3[01])[\s.\-]+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s.\-]+(?:20\d\d|\d{2})|(?:0[1-9]|1[0-2])[\/.\-](?:20\d\d|\d{2})|(?:0[1-9]|1[0-2])[\/.\-]\d{2}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[a-z]*[\s.\-]+(?:20\d\d|\d{2}))\b/i;

const DURATION_REGEX = /\b((?:[0-9]+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|EIGHTEEN|TWENTY[- ]?FOUR)\s*(?:MONTHS?|DAYS?|WEEKS?|YEARS?)\s*(?:FROM\s*(?:PACKAGING|PACKING|PKD|DATE\s*OF\s*(?:MFG|MANUFACTURE|PACKAGING)|MANUFACTURE|MFG)?))\b/i;

const BEST_BEFORE_ANCHOR = /(?:^|[:.\-\s])(?:BEST\s*BEFORE(?:\s*UP\s*TO)?|EXPIRY(?:\s*DATE)?|EXP\.?(?:\s*DATE)?|USE\s*BY|USE\s*BEFORE|CONSUME\s*BY)\b/i;

const MFD_ANCHOR = /(?:^|[:.\-\s])(?:MFD\.?(?:\s*DATE)?|MFG\.?(?:\s*DATE)?|DATE\s*OF\s*(?:MFG|MANUFACTURE|PACKAGING|PACKING)|MANUFACTURING\s*DATE|MANUFACTURED(?:\s*DATE)?|PACKAGING\s*DATE|PACKED\s*ON|PKD\.?(?:\s*DATE)?)\b/i;

const BATCH_ANCHOR = /(?:^|[:.\-\s])(?:BATCH(?:\s*(?:NO\.?|NUMBER|CODE))?|B\.?\s*NO\.?|LOT(?:\s*(?:NO\.?|NUMBER|CODE))?|PACKAGING\s*CODE|\bCODE\b)\b/i;

const BATCH_INSTRUCTION_REGEX = /(?:FIRST\s+(?:TWO|THREE|[0-9]+)\s+(?:CHAR|CHARS|CHARACTER|CHARACTERS|LETTERS)|INDICATE|INDICATES|SEE\s+(?:BELOW|EMBOSSED|SEAM|LID|CAP|PRINTED|BOTTOM|FRONT|BACK|SIDE)|FOR\s+BATCH\s+(?:NO|DETAILS)|REFER\s+BATCH)/i;

function normalizeDuration(text) {
  if (!text) return '';
  const clean = text.replace(/^[:.\-\s]+|[:.\-\s]+$/g, '').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function isValidBatchToken(token) {
  if (!token) return false;
  const clean = token.replace(/^[:.\-\s]+|[:.\-\s]+$/g, '').trim();
  if (clean.length < 2 || clean.length > 25) return false;

  // Reject stopwords and instructional vocabulary
  if (/^(?:NO|NUMBER|CODE|OF|THE|FIRST|TWO|THREE|SEE|FOR|BATCH|DATE|REFER|CHAR|CHARS|CHARACTER|CHARACTERS|LETTERS?|UNITS?|PACKS?|AT|ON|BY|BELOW|AND|IN|FROM|PRINTED|EMBOSSED|LID|CAP|INDICATE|INDICATES|BEST|BEFORE|EXPIRY|EXP|USE)$/i.test(clean)) return false;

  // Reject price and net weight
  if (/^(?:₹|Rs\.?)/i.test(clean) || /^[0-9]+(?:\.[0-9]+)?\s*(?:g|gm|kg|ml|l)\b/i.test(clean)) return false;

  // Reject FSSAI (14 digits)
  if (/^\d{14}$/.test(clean)) return false;

  // Reject barcode (12 or 13 digits)
  if (/^\d{12,13}$/.test(clean)) return false;

  // Reject phone number
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 10 && /^(?:0\d{9,10}|1800\d{6,7}|91\d{10}|\d{10})$/.test(digits)) return false;

  // Reject standalone PIN code (6 digits)
  if (/^[1-9][0-9]{5}$/.test(clean)) return false;

  // Reject if token matches a date format
  if (DATE_REGEX.test(clean)) return false;

  // Must contain alphanumeric characters
  if (!/[A-Za-z0-9]/.test(clean)) return false;

  return true;
}

/**
 * Extracts Batch, Manufacturing Date, and Best Before declarations using spatial proximity and geometry.
 */
function extractSpatialBatchAndDates(lines, words = []) {
  // Filter out nutrition facts lines
  const cleanLines = lines.filter((l) => {
    return !/(?:serving\s*size|servings\s*per|calories|energy|total\s*fat|saturated\s*fat|sodium|carbohydrate|sugars|protein|nutrition\s*facts)/i.test(l.text);
  });

  const sortedLines = [...cleanLines].sort((a, b) => (a.bbox?.y0 ?? 0) - (b.bbox?.y0 ?? 0));
  const debug = [];

  let batch = null;
  let manufacturingDate = null;
  let bestBefore = null;

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i];
    const text = line.text.trim();

    // ------------------------------------------------------------
    // 1. BEST BEFORE / EXPIRY
    // ------------------------------------------------------------
    if (!bestBefore && BEST_BEFORE_ANCHOR.test(text)) {
      const anchorMatch = text.match(BEST_BEFORE_ANCHOR);
      const anchorText = anchorMatch[0].trim();
      const remainder = text.substring(anchorMatch.index + anchorMatch[0].length).replace(/^[:.\-\s]+/, '').trim();

      const durMatch = remainder.match(DURATION_REGEX) || text.match(DURATION_REGEX);
      const dateMatch = remainder.match(DATE_REGEX);

      let accepted = false;
      let candidate = null;
      let reason = null;
      let sourceLine = text;

      if (durMatch) {
        candidate = normalizeDuration(durMatch[1]);
        accepted = true;
      } else if (dateMatch) {
        candidate = dateMatch[0];
        accepted = true;
      } else {
        // Look at next continuation line if remainder is empty
        if (i + 1 < sortedLines.length) {
          const nextLine = sortedLines[i + 1];
          const nextText = nextLine.text.trim();
          const nextDur = nextText.match(DURATION_REGEX);
          const nextDate = nextText.match(DATE_REGEX);
          if (nextDur) {
            candidate = normalizeDuration(nextDur[1]);
            accepted = true;
            sourceLine = `${text} ${nextText}`;
          } else if (nextDate) {
            candidate = nextDate[0];
            accepted = true;
            sourceLine = `${text} ${nextText}`;
          }
        }
      }

      if (!accepted) {
        reason = 'No valid date or duration format found near Best Before anchor';
      }

      debug.push({
        anchor: anchorText,
        candidate,
        type: 'bestBefore',
        sameLine: true,
        toRight: true,
        verticalOverlap: 1,
        horizontalDistance: 0,
        score: accepted ? 95 : 0,
        accepted,
        rejectionReason: reason,
      });

      if (accepted) {
        bestBefore = {
          value: candidate,
          status: 'Detected',
          source: sourceLine,
          confidence: 'HIGH',
        };
      }
    }

    // ------------------------------------------------------------
    // 2. MANUFACTURING DATE
    // ------------------------------------------------------------
    if (!manufacturingDate && !BEST_BEFORE_ANCHOR.test(text) && MFD_ANCHOR.test(text)) {
      const anchorMatch = text.match(MFD_ANCHOR);
      const anchorText = anchorMatch[0].trim();
      const isInstruction = BATCH_INSTRUCTION_REGEX.test(text);

      let accepted = false;
      let candidate = null;
      let reason = null;
      let sourceLine = text;

      if (isInstruction) {
        reason = 'Line is an instruction/reference pointing elsewhere, not a date declaration';
      } else {
        const remainder = text.substring(anchorMatch.index + anchorMatch[0].length).replace(/^[:.\-\s]+/, '').trim();
        const dateMatch = remainder.match(DATE_REGEX);

        if (dateMatch) {
          candidate = dateMatch[0];
          accepted = true;
        } else if (i + 1 < sortedLines.length) {
          const nextLine = sortedLines[i + 1];
          const nextText = nextLine.text.trim();
          const nextDate = nextText.match(DATE_REGEX);
          if (nextDate && !BEST_BEFORE_ANCHOR.test(nextText) && !BATCH_INSTRUCTION_REGEX.test(nextText)) {
            candidate = nextDate[0];
            accepted = true;
            sourceLine = `${text} ${nextText}`;
          }
        }

        if (!accepted) {
          reason = 'No valid manufacturing date format found near MFD anchor';
        }
      }

      debug.push({
        anchor: anchorText,
        candidate,
        type: 'manufacturingDate',
        sameLine: true,
        toRight: true,
        verticalOverlap: 1,
        horizontalDistance: 0,
        score: accepted ? 95 : 0,
        accepted,
        rejectionReason: reason,
      });

      if (accepted) {
        manufacturingDate = {
          value: candidate,
          status: 'Detected',
          source: sourceLine,
          confidence: 'HIGH',
        };
      }
    }

    // ------------------------------------------------------------
    // 3. BATCH / LOT NUMBER
    // ------------------------------------------------------------
    if (!batch && !BEST_BEFORE_ANCHOR.test(text) && BATCH_ANCHOR.test(text)) {
      const anchorMatch = text.match(BATCH_ANCHOR);
      const anchorText = anchorMatch[0].trim();
      const isInstruction = BATCH_INSTRUCTION_REGEX.test(text);

      // Check if ambiguous "CODE" alone appears without batch context (e.g. PIN CODE or BARCODE or UNIT CODE)
      const isPureAmbiguousCode = /^CODE$/i.test(anchorText);
      const isBarcodeOrPin = /(?:BARCODE|PIN\s*CODE|POSTAL|UNIT\s*CODE)/i.test(text);

      let accepted = false;
      let candidate = null;
      let reason = null;
      let sourceLine = text;

      if (isInstruction) {
        reason = 'Line is a batch coding instruction/explanation, not an explicit batch number';
      } else if (isBarcodeOrPin) {
        reason = 'Keyword belongs to barcode/pin code/unit code, not batch';
      } else {
        const remainder = text.substring(anchorMatch.index + anchorMatch[0].length).replace(/^[:.\-\s]+/, '').trim();
        const tokens = remainder.split(/\s+/).filter(Boolean);

        for (const tok of tokens) {
          if (isValidBatchToken(tok)) {
            candidate = tok.replace(/^[:.\-\s]+|[:.\-\s]+$/g, '').trim();
            accepted = true;
            break;
          }
        }

        if (!accepted && i + 1 < sortedLines.length) {
          const nextLine = sortedLines[i + 1];
          const nextText = nextLine.text.trim();
          if (!BATCH_INSTRUCTION_REGEX.test(nextText) && !/(?:BARCODE|PIN\s*CODE|POSTAL)/i.test(nextText)) {
            const nextTokens = nextText.split(/\s+/).filter(Boolean);
            for (const tok of nextTokens) {
              if (isValidBatchToken(tok)) {
                candidate = tok.replace(/^[:.\-\s]+|[:.\-\s]+$/g, '').trim();
                accepted = true;
                sourceLine = `${text} ${nextText}`;
                break;
              }
            }
          }
        }

        if (!accepted) {
          reason = isPureAmbiguousCode
            ? 'Ambiguous word CODE without nearby valid batch token'
            : 'No valid batch code token found';
        }
      }

      debug.push({
        anchor: anchorText,
        candidate,
        type: 'batch',
        sameLine: true,
        toRight: true,
        verticalOverlap: 1,
        horizontalDistance: 0,
        score: accepted ? 90 : 0,
        accepted,
        rejectionReason: reason,
      });

      if (accepted) {
        batch = {
          value: candidate,
          status: 'Detected',
          source: sourceLine,
          confidence: 'HIGH',
        };
      }
    }
  }

  const defaultField = {
    value: 'Not detected',
    status: 'Not detected',
    confidence: 'LOW',
  };

  return {
    batch: batch || { ...defaultField },
    manufacturingDate: manufacturingDate || { ...defaultField },
    bestBefore: bestBefore || { ...defaultField },
    debug,
  };
}

// ============================================================
// 7. SPATIAL EXTRACTION CORE (MRP, NET QUANTITY, FSSAI, ENTITIES, CUSTOMER CARE, BATCH & DATES)
// ============================================================

/**
 * Extracts MRP and Net Quantity using 2D geometry raycasting and scoring.
 *
 * @param {Object} ocrData - { words: [...], lines: [...] }
 * @returns {Object} { mrp, netQuantity, debug }
 */
function extractSpatialDeclarations(ocrData) {
  const words = Array.isArray(ocrData?.words) ? ocrData.words : [];
  const lines = Array.isArray(ocrData?.lines) ? ocrData.lines : [];

  const debug = {
    mrp: { anchorsFound: 0, candidates: [] },
    netQuantity: { anchorsFound: 0, candidates: [] },
  };

  // Identify lines that are nutrition facts or ingredients to prevent false positives
  const nutritionLineIndices = new Set();
  lines.forEach((l, idx) => {
    if (/(?:serving\s*size|servings\s*per|calories|energy|total\s*fat|saturated\s*fat|sodium|carbohydrate|sugars|protein|nutrition\s*facts)/i.test(l.text)) {
      nutritionLineIndices.add(idx);
    }
  });

  const isWordInNutrition = (w) => {
    for (const idx of nutritionLineIndices) {
      const l = lines[idx];
      if (l && l.bbox && verticalOverlap(w, l) >= 0.5) return true;
    }
    return false;
  };

  // ------------------------------------------------------------
  // A. MRP SPATIAL EXTRACTION
  // ------------------------------------------------------------
  const mrpAnchors = findMrpAnchors(words);
  debug.mrp.anchorsFound = mrpAnchors.length;

  let bestMrp = null;
  let bestMrpScore = -1;

  for (const anchor of mrpAnchors) {
    // Search words to the right of anchor
    for (let i = 0; i < words.length; i++) {
      const candidate = words[i];
      if (candidate === anchor) continue;

      // Skip words that are part of anchor or nutrition
      if (candidate.bbox.x0 <= anchor.bbox.x0 && candidate.bbox.x1 <= anchor.bbox.x1) continue;

      const sameLine = isSameLine(anchor, candidate);
      const toRight = isToRight(anchor, candidate);
      const vOverlap = verticalOverlap(anchor, candidate);
      const hDist = horizontalDistance(anchor, candidate);
      const inNutrition = isWordInNutrition(candidate);

      const parsedPrice = isValidMrpValue(candidate.text);

      let score = 0;
      let accepted = false;
      let rejectionReason = null;

      if (!parsedPrice) {
        rejectionReason = 'Not a valid price format';
      } else if (inNutrition) {
        rejectionReason = 'Token belongs to nutrition facts block';
        score -= 100;
      } else if (!sameLine) {
        rejectionReason = 'Not on the same horizontal line';
      } else if (!toRight) {
        rejectionReason = 'Token is to the left of the MRP anchor';
      } else if (hDist > 500) {
        rejectionReason = `Too far horizontally (${Math.round(hDist)}px)`;
      } else {
        // Candidate meets primary spatial criteria!
        accepted = true;
        score += 40; // same line
        score += 30; // to right
        score += Math.round(vOverlap * 20); // vertical overlap up to 20
        // Proximity bonus: closer is better
        if (hDist < 100) score += 15;
        else if (hDist < 250) score += 10;
        else score += 5;

        // Check if an intermediate currency token exists between anchor and candidate
        const hasCurrencyInBetween = words.some((mid) => {
          return (
            mid !== anchor &&
            mid !== candidate &&
            isSameLine(anchor, mid) &&
            mid.bbox.x0 >= anchor.bbox.x1 - 5 &&
            mid.bbox.x1 <= candidate.bbox.x0 + 5 &&
            /^(?:Rs\.?|₹|INR)$/i.test(mid.text.trim())
          );
        });
        if (hasCurrencyInBetween) score += 15;

        // Realistic price range bonus
        if (parsedPrice.numeric >= 5 && parsedPrice.numeric <= 5000) score += 10;
      }

      debug.mrp.candidates.push({
        anchor: anchor.text,
        candidate: candidate.text,
        candidateText: candidate.text,
        candidateBbox: candidate.bbox,
        sameLine,
        toRight,
        verticalOverlap: Math.round(vOverlap * 100) / 100,
        horizontalDistance: Math.round(hDist),
        score,
        accepted,
        rejectionReason,
      });

      if (accepted && score > bestMrpScore) {
        bestMrpScore = score;
        const enclosingLine = findEnclosingLineText(anchor.bbox, candidate.bbox, lines);
        bestMrp = {
          value: parsedPrice.formatted,
          numericValue: parsedPrice.numeric,
          status: 'Detected',
          confidence: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
          score,
          source: enclosingLine || `${anchor.text} ${candidate.text}`,
          anchor: {
            text: anchor.text,
            bbox: anchor.bbox,
          },
          valueToken: {
            text: candidate.text,
            bbox: candidate.bbox,
          },
        };
      }
    }
  }

  // ------------------------------------------------------------
  // B. NET QUANTITY SPATIAL EXTRACTION
  // ------------------------------------------------------------
  const netAnchors = findNetQuantityAnchors(words);
  debug.netQuantity.anchorsFound = netAnchors.length;

  let bestNetQty = null;
  let bestNetScore = -1;

  for (const anchor of netAnchors) {
    for (let i = 0; i < words.length; i++) {
      const candidate1 = words[i];
      if (candidate1.bbox.x0 < anchor.bbox.x0) continue;

      const sameLine = isSameLine(anchor, candidate1);
      const toRight = isToRight(anchor, candidate1);
      const vOverlap = verticalOverlap(anchor, candidate1);
      const hDist = horizontalDistance(anchor, candidate1);
      const inNutrition = isWordInNutrition(candidate1);

      // Check single word or word1 + word2
      const candidate2 = i + 1 < words.length ? words[i + 1] : null;
      const parsedQty = isValidQuantityValue(candidate1, candidate2);

      let score = 0;
      let accepted = false;
      let rejectionReason = null;

      if (!parsedQty) {
        rejectionReason = 'Not a valid quantity format';
      } else if (inNutrition) {
        rejectionReason = 'Token belongs to nutrition facts block';
        score -= 100;
      } else if (!sameLine) {
        rejectionReason = 'Not on the same horizontal line';
      } else if (!toRight) {
        rejectionReason = 'Token is to the left of the Net Quantity anchor';
      } else if (hDist > 500) {
        rejectionReason = `Too far horizontally (${Math.round(hDist)}px)`;
      } else {
        accepted = true;
        score += 40; // same line
        score += 30; // to right
        score += Math.round(vOverlap * 20); // vertical overlap up to 20
        if (hDist < 100) score += 15;
        else if (hDist < 250) score += 10;
        else score += 5;
      }

      debug.netQuantity.candidates.push({
        anchor: anchor.text,
        candidate: parsedQty ? parsedQty.value : candidate1.text,
        candidateText: parsedQty ? parsedQty.value : candidate1.text,
        candidateBbox: candidate1.bbox,
        sameLine,
        toRight,
        verticalOverlap: Math.round(vOverlap * 100) / 100,
        horizontalDistance: Math.round(hDist),
        score,
        accepted,
        rejectionReason,
      });

      if (accepted && score > bestNetScore) {
        bestNetScore = score;
        const lastWord = parsedQty.words[parsedQty.words.length - 1];
        const enclosingLine = findEnclosingLineText(anchor.bbox, lastWord.bbox, lines);
        bestNetQty = {
          value: parsedQty.value,
          status: 'Detected',
          confidence: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
          score,
          source: enclosingLine || `${anchor.text} ${parsedQty.value}`,
          anchor: {
            text: anchor.text,
            bbox: anchor.bbox,
          },
          valueToken: {
            text: parsedQty.value,
            bbox: {
              x0: parsedQty.words[0].bbox.x0,
              y0: Math.min(...parsedQty.words.map((w) => w.bbox.y0)),
              x1: lastWord.bbox.x1,
              y1: Math.max(...parsedQty.words.map((w) => w.bbox.y1)),
            },
          },
        };
      }
    }
  }

  // ------------------------------------------------------------
  // C. FSSAI LICENSE NUMBER SPATIAL EXTRACTION
  // ------------------------------------------------------------
  const fssaiAnchors = findFssaiAnchors(words, lines);
  debug.fssai = { anchorsFound: fssaiAnchors.length, candidates: [] };

  const detectedFssaiLicenses = [];

  for (const anchor of fssaiAnchors) {
    let bestCandidateForAnchor = null;
    let bestScoreForAnchor = -1;

    for (let i = 0; i < words.length; i++) {
      const candidate1 = words[i];
      // Skip words that are part of the anchor itself
      if (candidate1.bbox.x0 <= anchor.bbox.x0 && candidate1.bbox.x1 <= anchor.bbox.x1) continue;

      const sameLine = isSameLine(anchor, candidate1);
      const toRight = isToRight(anchor, candidate1);
      const vOverlap = verticalOverlap(anchor, candidate1);
      const hDist = horizontalDistance(anchor, candidate1);
      const inNutrition = isWordInNutrition(candidate1);

      // Wrapped line check: allow immediately following line if directly under the anchor
      const hA = anchor.bbox.y1 - anchor.bbox.y0;
      const isWrappedDirectlyBelow = (
        candidate1.bbox.y0 >= anchor.bbox.y1 &&
        candidate1.bbox.y0 <= anchor.bbox.y1 + 1.8 * hA &&
        candidate1.bbox.x0 >= anchor.bbox.x0 - 50 &&
        candidate1.bbox.x0 <= anchor.bbox.x1 + 150
      );

      const candidate2 = i + 1 < words.length ? words[i + 1] : null;
      const parsedFssai = isValidFssaiValue(candidate1, candidate2);

      let score = 0;
      let accepted = false;
      let rejectionReason = null;

      // Detect if candidate belongs to a phone line or barcode line
      const enclosingLineForCand = lines.find((l) => l.bbox && verticalOverlap(candidate1, l) >= 0.4);
      const isBarcodeLine = enclosingLineForCand && /(?:BARCODE|EAN|UPC)\s*(?:NO\.?|NUMBER)?/i.test(enclosingLineForCand.text);
      const isPhoneLine = enclosingLineForCand && /(?:PHONE|TEL|HELPLINE|CALL)\s*(?:NO\.?)?/i.test(enclosingLineForCand.text);

      if (!parsedFssai) {
        const digitsOnly = candidate1.text.replace(/[^0-9]/g, '');
        if (digitsOnly.length === 13) rejectionReason = 'Barcode number (13 digits), not FSSAI';
        else if (digitsOnly.length === 6) rejectionReason = 'Postal PIN code (6 digits), not FSSAI';
        else if (digitsOnly.length === 10) rejectionReason = 'Phone number, not FSSAI';
        else rejectionReason = 'Not a 14-digit FSSAI number';
      } else if (inNutrition) {
        rejectionReason = 'Token belongs to nutrition facts block';
        score -= 100;
      } else if (isBarcodeLine) {
        rejectionReason = 'Candidate is on Barcode line';
        score -= 100;
      } else if (isPhoneLine) {
        rejectionReason = 'Candidate is on Customer Care Phone line';
        score -= 100;
      } else if (!sameLine && !isWrappedDirectlyBelow) {
        rejectionReason = 'Not on same line or directly wrapped below FSSAI anchor';
      } else if (sameLine && !toRight) {
        rejectionReason = 'Token is to the left of the FSSAI anchor';
      } else if (sameLine && hDist > 450) {
        rejectionReason = `Too far horizontally (${Math.round(hDist)}px)`;
      } else {
        accepted = true;
        if (sameLine) {
          score += 40;
          score += 30; // to right
          score += Math.round(vOverlap * 20);
          if (hDist < 100) score += 15;
          else if (hDist < 250) score += 10;
        } else if (isWrappedDirectlyBelow) {
          score += 35; // wrapped directly beneath anchor
          score += 20; // adjacent vertical line
        }

        if (anchor.isCorporateFssai) score += 15;
      }

      debug.fssai.candidates.push({
        anchor: anchor.text,
        candidate: parsedFssai ? parsedFssai.licenseNumber : candidate1.text,
        candidateText: parsedFssai ? parsedFssai.licenseNumber : candidate1.text,
        candidateBbox: candidate1.bbox,
        sameLine,
        toRight,
        verticalOverlap: Math.round(vOverlap * 100) / 100,
        horizontalDistance: Math.round(hDist),
        score,
        accepted,
        rejectionReason,
      });

      if (accepted && score > bestScoreForAnchor) {
        bestScoreForAnchor = score;
        const lastWord = parsedFssai.words[parsedFssai.words.length - 1];
        const enclosingLine = findEnclosingLineText(anchor.bbox, lastWord.bbox, lines);

        const unitMatch = enclosingLine ? enclosingLine.match(/\(([A-Z0-9]{1,3})\)/) : null;
        const unitCode = unitMatch ? unitMatch[1] : null;
        const role = anchor.isCorporateFssai ? 'Corporate / Brand Owner' : (unitCode ? `Manufacturing Unit (${unitCode})` : 'Manufacturing Unit');

        bestCandidateForAnchor = {
          licenseNumber: parsedFssai.licenseNumber,
          status: 'Detected',
          confidence: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
          score,
          source: enclosingLine || `${anchor.text} ${parsedFssai.licenseNumber}`,
          unitCode,
          role,
          anchor: {
            text: anchor.text,
            bbox: anchor.bbox,
          },
          valueToken: {
            text: parsedFssai.licenseNumber,
            bbox: {
              x0: parsedFssai.words[0].bbox.x0,
              y0: Math.min(...parsedFssai.words.map((w) => w.bbox.y0)),
              x1: lastWord.bbox.x1,
              y1: Math.max(...parsedFssai.words.map((w) => w.bbox.y1)),
            },
          },
        };
      }
    }

    if (bestCandidateForAnchor) {
      if (!detectedFssaiLicenses.some((l) => l.licenseNumber === bestCandidateForAnchor.licenseNumber)) {
        detectedFssaiLicenses.push(bestCandidateForAnchor);
      }
    }
  }

  // ------------------------------------------------------------
  // D. DEFAULT WHEN NOT DETECTED (Strictly No Guessing)
  // ------------------------------------------------------------
  const defaultField = {
    value: 'Not detected',
    status: 'Not detected',
    confidence: 'LOW',
    score: 0,
    source: null,
    anchor: null,
    valueToken: null,
  };

  const primaryFssai = detectedFssaiLicenses.length > 0
    ? {
        value: detectedFssaiLicenses[0].licenseNumber,
        status: 'Detected',
        confidence: detectedFssaiLicenses[0].confidence,
        score: detectedFssaiLicenses[0].score,
        source: detectedFssaiLicenses[0].source,
        unitCode: detectedFssaiLicenses[0].unitCode,
        role: detectedFssaiLicenses[0].role,
        anchor: detectedFssaiLicenses[0].anchor,
        valueToken: detectedFssaiLicenses[0].valueToken,
      }
    : { ...defaultField };

  // ------------------------------------------------------------
  // E. PHASE 3B: SPATIAL MANUFACTURER / PACKER / MARKETER / MANUFACTURED FOR EXTRACTION
  // ------------------------------------------------------------
  const entityResults = extractSpatialEntities(lines, words, detectedFssaiLicenses);

  // ------------------------------------------------------------
  // F. PHASE 3C: SPATIAL CUSTOMER CARE / PHONE / EMAIL EXTRACTION
  // ------------------------------------------------------------
  const customerCareResult = extractSpatialCustomerCare(lines, words);

  // ------------------------------------------------------------
  // G. PHASE 3D: SPATIAL BATCH, MANUFACTURING DATE, AND BEST BEFORE EXTRACTION
  // ------------------------------------------------------------
  const batchAndDatesResult = extractSpatialBatchAndDates(lines, words);

  return {
    mrp: bestMrp || { ...defaultField },
    netQuantity: bestNetQty || { ...defaultField },
    fssaiNumber: primaryFssai,
    fssaiLicenses: detectedFssaiLicenses,
    manufacturers: entityResults.manufacturers,
    manufacturedFor: entityResults.manufacturedFor,
    packers: entityResults.packers,
    marketers: entityResults.marketers,
    customerCare: customerCareResult.customerCare,
    batch: batchAndDatesResult.batch,
    manufacturingDate: batchAndDatesResult.manufacturingDate,
    bestBefore: batchAndDatesResult.bestBefore,
    debug: {
      ...debug,
      entities: entityResults.debug,
      customerCare: customerCareResult.debug,
      batchAndDates: batchAndDatesResult.debug,
    },
  };
}

module.exports = {
  extractSpatialDeclarations,
  extractSpatialEntities,
  extractSpatialCustomerCare,
  extractSpatialBatchAndDates,
  parseCompanyAndAddressFromText,
  isValidAddress,
  cleanAddress,
  cleanCompany,
  normalizePhone,
  normalizeDuration,
  isValidBatchToken,
  // Export helpers for unit testing
  verticalOverlap,
  isSameLine,
  isToRight,
  horizontalDistance,
  isReasonablyClose,
  isValidMrpValue,
  isValidQuantityValue,
  isValidFssaiValue,
  findMrpAnchors,
  findNetQuantityAnchors,
  findFssaiAnchors,
};

