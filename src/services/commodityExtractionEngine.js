/**
 * LegalMetriScan — Comprehensive Context-Aware OCR Field Extraction Engine (ESM)
 * Conforming strictly to Legal Metrology (Packaged Commodities) Rules, 2011.
 *
 * Core Principle: NEVER extract a field merely because a number exists.
 * Values require explicit labels or strong contextual evidence.
 * When uncertain, "Not detected" is strictly returned.
 */

export function makeField(value = 'Not detected', source = null, confidence = 'low') {
  return {
    value,
    source,
    confidence, // 'high' | 'medium' | 'low'
    toString() {
      return this.value;
    },
    valueOf() {
      return this.value;
    },
  };
}

/**
 * Normalizes raw OCR text for context-aware analysis while preserving original raw text.
 */
export function normalizeOcrText(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    // Normalize OCR currency typos
    .replace(/\bR5[.\s]/gi, 'Rs. ')
    .replace(/\bR\.s\.?/gi, 'Rs. ')
    .replace(/\b1NR\b/gi, 'INR')
    // Normalize OCR FSSAI typos
    .replace(/\bFSSAl\b/gi, 'FSSAI')
    .replace(/\bF5SAI\b/gi, 'FSSAI')
    .replace(/\bLic\.?\s*N0\b/gi, 'Lic. No')
    // Normalize OCR Net Wt typos
    .replace(/\bN\.?\s*WT\.?\b/gi, 'Net Wt.')
    .replace(/\bNet\s*0ty\b/gi, 'Net Qty')
    .trim();
}

/**
 * Classifies lines to isolate Nutrition Facts, Ingredients, Allergens, Storage, and Headers.
 * Expands compound pipe-delimited lines (e.g. "NET WT: 200 g | MRP ₹ 60.00") into isolated segments.
 */
function classifyLines(rawLines, normLines) {
  const classified = [];
  let inNutritionBlock = false;
  let inIngredientsBlock = false;

  const rawSegments = [];
  const normSegments = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i] || '';
    const norm = normLines[i] || '';

    if (raw.includes('|')) {
      const rParts = raw.split(/\s*\|\s*/);
      const nParts = norm.split(/\s*\|\s*/);
      for (let p = 0; p < rParts.length; p++) {
        if (rParts[p].trim()) {
          rawSegments.push(rParts[p].trim());
          normSegments.push((nParts[p] || rParts[p]).trim());
        }
      }
    } else {
      rawSegments.push(raw);
      normSegments.push(norm);
    }
  }

  for (let i = 0; i < normSegments.length; i++) {
    const raw = rawSegments[i] || '';
    const norm = normSegments[i] || '';
    const up = norm.toUpperCase();

    // Check block headers
    if (/(?:NUTRITION\s*(?:FACTS|INFORMATION|INFO)|NUTRITIONAL\s*INFORMATION)/i.test(up)) {
      inNutritionBlock = true;
    }
    if (/(?:INGREDIENTS|INGREDIENT\s*LIST)/i.test(up)) {
      inIngredientsBlock = true;
    }
    // Block terminators (statutory declaration markers or prominent brand/product headers)
    if (/(?:NET\s*(?:WT|QTY|QUANTITY)|MFD\s*BY|MKT\s*BY|PACKED\s*BY|PACKAGING\s*MATERIAL|FSSAI|MRP|BEST\s*BEFORE|BATCH\s*NO|OREO|PARLE)/i.test(up)) {
      inNutritionBlock = false;
      inIngredientsBlock = false;
    }

    const isNutrition = inNutritionBlock || /(?:serving\s*size|servings\s*(?:per|container)|calories|energy\s*kcal|total\s*fat|saturated\s*fat|trans\s*fat|cholesterol|sodium|carbohydrate|dietary\s*fiber|total\s*sugars|added\s*sugars|protein|vitamin\s*[a-d]|calcium|potassium|%\s*daily\s*value|%\s*rda)/i.test(up);
    const isIngredient = (inIngredientsBlock && !/(?:OREO|PARLE|CADBURY|TATA|SUNFEAST|BRITANNIA|NESTLE)/i.test(up)) || /(?:cocoa\s*solids|invert\s*sugar|leavening\s*agents|emulsifier|acidity\s*regulator|preservative|edible\s*vegetable\s*oil|hydrogenated\s*vegetable)/i.test(up);
    const isAllergen = /(?:allergen\s*information|contains\s*(?:wheat|milk|soy|peanut|nuts|sulphite|gluten)|may\s*contain)/i.test(up);
    const isStorage = /(?:storage\s*conditions?|store\s*in\s*a\s*cool|keep\s*refrigerated|keep\s*frozen|dry\s*place|hygienic\s*and\s*dry)/i.test(up);
    const isHeaderRow = /PKD.*(?:CODE|BATCH).*USE\s*BY.*MRP/i.test(up) || /(?:MRP|USE\s*BY|BATCH|PKD)\s*,\s*(?:MRP|USE\s*BY|BATCH|PKD)/i.test(up);
    const isCustomerMsg = /(?:if\s*you\s*are\s*not\s*satisfied|product\s*quality|consumer\s*feedback|retain\s*the\s*package)/i.test(up);

    classified.push({
      index: i,
      raw,
      norm,
      up,
      isNutrition,
      isIngredient,
      isAllergen,
      isStorage,
      isHeaderRow,
      isCustomerMsg,
    });
  }

  return classified;
}

/**
 * Extracts structured, context-aware packaged-commodity fields from raw OCR text
 */
export function extractDeclarationsFromText(rawText, ocrConfidence = 0) {
  const raw = rawText || '';
  const normalized = normalizeOcrText(raw);

  const rawLines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const normLines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const classified = classifyLines(rawLines, normLines);

  const result = {
    productName: makeField('Not detected', null, 'low'),
    brand: makeField('Not detected', null, 'low'),
    mrp: makeField('Not detected', null, 'low'),
    netQuantity: makeField('Not detected', null, 'low'),
    packCount: makeField('Not detected', null, 'low'),
    individualPackQuantity: makeField('Not detected', null, 'low'),
    manufacturer: makeField('Not detected', null, 'low'),
    manufacturedFor: makeField('Not detected', null, 'low'),
    manufacturingUnits: [],
    packer: makeField('Not detected', null, 'low'),
    marketer: makeField('Not detected', null, 'low'),
    packagingMaterialManufacturer: makeField('Not detected', null, 'low'),
    address: makeField('Not detected', null, 'low'),
    customerCare: makeField('Not detected', null, 'low'),
    customerCarePhone: makeField('Not detected', null, 'low'),
    customerCareEmail: makeField('Not detected', null, 'low'),
    customerCareAddress: makeField('Not detected', null, 'low'),
    batchNumber: makeField('Not detected', null, 'low'),
    manufacturingDate: makeField('Not detected', null, 'low'),
    expiryDate: makeField('Not detected', null, 'low'),
    bestBefore: makeField('Not detected', null, 'low'),
    fssaiNumber: makeField('Not detected', null, 'low'),
    fssaiLicenses: [],
    barcode: makeField('Not detected', null, 'low'),

    // Isolated Non-Metrology Information Protection
    nutrition: {},
    ingredients: makeField('Not detected', null, 'low'),
    allergens: makeField('Not detected', null, 'low'),
    storageConditions: makeField('Not detected', null, 'low'),
    website: makeField('Not detected', null, 'low'),
    registrationNumber: makeField('Not detected', null, 'low'),

    rawText: raw,
    normalizedText: normalized,
    ocrConfidence: typeof ocrConfidence === 'number' ? Math.round(ocrConfidence) : 0,
    evidence: {},
  };

  if (!raw.trim()) return result;

  // ============================================================
  // 1. ISOLATE AUXILIARY SECTIONS (Allergens, Storage, Reg No, Website)
  // ============================================================
  for (const item of classified) {
    if (item.isAllergen && result.allergens.value === 'Not detected') {
      result.allergens = makeField(item.raw, item.raw, 'high');
    }
    if (item.isStorage && result.storageConditions.value === 'Not detected') {
      result.storageConditions = makeField(item.raw, item.raw, 'high');
    }

    const regMatch = item.norm.match(/(?:Registration\s*No\.?|Regd?\.?\s*No\.?)\s*[:.\-]?\s*([A-Za-z0-9\-]+)/i);
    if (regMatch && regMatch[1] && !/^(?:fssai|lic)/i.test(item.norm)) {
      result.registrationNumber = makeField(regMatch[1].trim(), item.raw, 'high');
    }

    const webMatch = item.norm.match(/\b(?:https?:\/\/|www\.)[a-z0-9\-]+(?:\.[a-z0-9\-]+)+[^\s]*/i) ||
                     item.norm.match(/\b[a-z0-9\-]+\.(?:com|in|org|net|co\.in)\b/i);
    if (webMatch && !webMatch[0].includes('@') && result.website.value === 'Not detected') {
      result.website = makeField(webMatch[0].trim(), item.raw, 'high');
    }
  }

  // ============================================================
  // 2. ISOLATE NUTRITION FACTS (To protect Legal Metrology fields)
  // ============================================================
  for (const item of classified) {
    if (!item.isNutrition) continue;

    const servMatch = item.norm.match(/serving\s*size\s*[:.\-]?\s*([^\n\r,;]+)/i);
    if (servMatch && !result.nutrition.servingSize) {
      result.nutrition.servingSize = servMatch[1].trim();
    }
    const servCountMatch = item.norm.match(/(?:about\s*)?([0-9]+)\s*servings\s*(?:per\s*container|per\s*pack|in\s*pack)?/i) ||
                           item.norm.match(/(?:no\.\s*of\s*servings\s*per\s*package)\s*[:.\-]?\s*([0-9]+)/i);
    if (servCountMatch && !result.nutrition.servingsPerContainer) {
      result.nutrition.servingsPerContainer = servCountMatch[1].trim();
    }
    const calMatch = item.norm.match(/(?:calories|energy)\s*[:.\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:kcal)?/i);
    if (calMatch && !result.nutrition.calories) {
      result.nutrition.calories = calMatch[1].trim();
    }
    const fatMatch = item.norm.match(/total\s*fat\s*[:.\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:g|mg)/i);
    if (fatMatch && !result.nutrition.totalFat) {
      result.nutrition.totalFat = fatMatch[1].trim() + ' g';
    }
    const carbMatch = item.norm.match(/total\s*carbohydrate\s*[:.\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:g|mg)/i);
    if (carbMatch && !result.nutrition.totalCarbohydrate) {
      result.nutrition.totalCarbohydrate = carbMatch[1].trim() + ' g';
    }
    const sugMatch = item.norm.match(/(?:total\s*sugars|sugars)\s*[:.\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:g|mg)/i);
    if (sugMatch && !result.nutrition.totalSugars) {
      result.nutrition.totalSugars = sugMatch[1].trim() + ' g';
    }
    const sodMatch = item.norm.match(/sodium\s*[:.\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mg|g)/i);
    if (sodMatch && !result.nutrition.sodium) {
      result.nutrition.sodium = sodMatch[1].trim() + ' mg';
    }
    const proMatch = item.norm.match(/protein\s*[:.\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:g|mg)/i);
    if (proMatch && !result.nutrition.protein) {
      result.nutrition.protein = proMatch[1].trim() + ' g';
    }
  }

  // ============================================================
  // 3. MRP EXTRACTION (Strict Label + Price, Reject Headers & Nutrition)
  // ============================================================
  const mrpCandidates = [];

  for (const item of classified) {
    if (item.isNutrition || item.isIngredient || item.isHeaderRow) continue;

    // Reject unpriced header
    if (/(?:MRP|M\.?R\.?P\.?|MAX(?:IMUM)?\s*RETAIL\s*PRICE)\s*(?:[.:\-])?\s*(?:₹|Rs\.?|INR)?\s*(?:\([A-Z\s.]+\))?\s*$/i.test(item.norm)) {
      continue;
    }

    // Pattern 1: Explicit MRP label followed by currency and digits
    const p1 = item.norm.match(/(?:M\.?R\.?P\.?|MAX(?:IMUM)?\s*RETAIL\s*PRICE)\s*[:.\-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]{1,2})?)\b/i);
    // Pattern 2: Explicit MRP label with trailing currency indicator
    const p2 = item.norm.match(/(?:M\.?R\.?P\.?|MAX(?:IMUM)?\s*RETAIL\s*PRICE)[^0-9\n]{0,25}(?:₹|Rs\.?|INR)\s*[:.\-]?\s*([0-9]+(?:\.[0-9]{1,2})?)\b/i);
    // Pattern 3: ₹ or Rs. followed by price AND tax clause: "Rs. 85.00 (INCL. OF ALL TAXES)"
    const p3 = item.norm.match(/(?:₹|Rs\.?)\s*([0-9]+(?:\.[0-9]{1,2})?)\b(?:\s*\(?(?:INCL|OF\s*ALL)\b)/i);

    const match = p1 || p2 || p3;
    if (match && match[1]) {
      const matchIndex = match.index || 0;
      const followingSlice = item.norm.slice(matchIndex + match[0].length);
      if (/^\s*(?:g|gm|kg|mg|ml|l|%)\b/i.test(followingSlice)) continue;

      const numVal = parseFloat(match[1]);
      if (!isNaN(numVal) && numVal >= 1 && numVal <= 50000) {
        const isNormalizedNoise = /R5[.\s]/i.test(item.raw);
        mrpCandidates.push({
          value: `₹${match[1]}`,
          source: item.raw,
          confidence: isNormalizedNoise ? 'medium' : 'high',
        });
      }
    }
  }

  if (mrpCandidates.length === 1) {
    result.mrp = makeField(mrpCandidates[0].value, mrpCandidates[0].source, mrpCandidates[0].confidence);
  } else if (mrpCandidates.length > 1) {
    const explicitMrp = mrpCandidates.filter((c) => /(?:MRP|MAX.*RETAIL.*PRICE)/i.test(c.source));
    const pool = explicitMrp.length > 0 ? explicitMrp : mrpCandidates;
    const uniqueValues = [...new Set(pool.map((c) => c.value))];
    if (uniqueValues.length === 1) {
      result.mrp = makeField(pool[0].value, pool[0].source, pool[0].confidence);
    } else {
      const plausible = pool.filter((c) => parseFloat(c.value.replace('₹', '')) >= 5);
      if (plausible.length === 1) {
        result.mrp = makeField(plausible[0].value, plausible[0].source, plausible[0].confidence);
      } else {
        result.mrp = makeField('Multiple candidates detected', pool.map((c) => c.source).join(' | '), 'low');
      }
    }
  }

  // ============================================================
  // 4. NET QUANTITY & MULTI-PACK EXTRACTION
  // ============================================================
  for (const item of classified) {
    if (item.isNutrition || item.isIngredient || item.isHeaderRow) continue;

    if (/(?:serving\s*size|servings\s*per|nutrition|ingredients|cocoa\s*solids|protein|fat|carbohydrate)/i.test(item.norm)) {
      continue;
    }

    // Check if line contains an explicit total net quantity upfront:
    // e.g. "Net Wt.: 275.55 g (3 Packs X 91.85 g Each)"
    const explicitTotal = item.norm.match(/(?:Total\s*Net\s*(?:Wt|Quantity|Qty)?|Net\s*(?:Weight|Wt\.?|Quantity|Qty\.?|Contents?))\s*[:.\-]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:g|gm|kg|mg|ml|l|ltr))\b/i);

    // Multi-pack pattern: e.g. "3 Packs X 91.85 g Each", "Pack of 4 x 75g", "6 packs x 100g"
    const multiMatch = item.norm.match(/(?:Pack\s*of|Contains)\s*[:.\-]?\s*([0-9]+)\s*(?:units?|packs?|N)?\s*[xX*]\s*([0-9]+(?:\.[0-9]+)?\s*(?:g|gm|kg|mg|ml|l|ltr))\b/i) ||
                       item.norm.match(/([0-9]+)\s*(?:units?|packs?|N)\s*[xX*]\s*([0-9]+(?:\.[0-9]+)?\s*(?:g|gm|kg|mg|ml|l|ltr))\b/i);

    if (multiMatch && result.packCount.value === 'Not detected') {
      result.packCount = makeField(multiMatch[1].trim(), item.raw, 'high');
      const indQty = multiMatch[2].replace(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)/, '$1 $2').trim();
      result.individualPackQuantity = makeField(indQty, item.raw, 'high');

      if (explicitTotal) {
        const cleanTotal = explicitTotal[1].replace(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)/, '$1 $2').trim();
        result.netQuantity = makeField(cleanTotal, item.raw, 'high');
      } else {
        const totalInParen = item.norm.match(/\(\s*([0-9]+(?:\.[0-9]+)?\s*(?:g|gm|kg|mg|ml|l|ltr))\s*\)/i);
        if (totalInParen) {
          const cleanParen = totalInParen[1].replace(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)/, '$1 $2').trim();
          result.netQuantity = makeField(cleanParen, item.raw, 'high');
        } else {
          const count = parseInt(multiMatch[1], 10);
          const singleQty = parseFloat(multiMatch[2]);
          const unit = multiMatch[2].replace(/[0-9.\s]/g, '');
          if (!isNaN(count) && !isNaN(singleQty)) {
            const calculated = Number((count * singleQty).toFixed(2));
            result.netQuantity = makeField(`${calculated} ${unit}`, item.raw, 'high');
          }
        }
      }
      continue;
    }

    // Standard net quantity declaration with explicit label: "Net Weight: 200 g" or "Net Wt. 200g" or "Net Qty: 500ml"
    if (explicitTotal && result.netQuantity.value === 'Not detected') {
      const cleanQty = explicitTotal[1].replace(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)/, '$1 $2').trim();
      result.netQuantity = makeField(cleanQty, item.raw, 'high');
      continue;
    }
  }

  // ============================================================
  // 5. MANUFACTURER, PACKER, MARKETER & MANUFACTURING UNITS
  // ============================================================
  for (const item of classified) {
    if (item.isNutrition || item.isIngredient || item.isCustomerMsg || item.isHeaderRow) continue;

    // 5A. Packaging Material Manufacturer (Distinct entity under LM Rules)
    const pkgMatMatch = item.norm.match(/(?:Pkg\.?\s*Mat\.?\s*Mfd\.?\s*By|Packaging\s*Material\s*(?:Manufactured|Mfd\.?)\s*By)\s*[:.\-]?\s*([^,\n]+)/i);
    if (pkgMatMatch && pkgMatMatch[1]) {
      const co = pkgMatMatch[1].trim().replace(/^[:.\-\s]+/, '');
      if (co.length > 2) {
        result.packagingMaterialManufacturer = makeField(co, item.raw, 'high');
      }
      continue;
    }

    // 5B. Standalone or labeled FSSAI License Line: "FSSAI 10012345678901" or "FSSAI Lic. No. 10014022002711"
    const fssaiMatch = item.norm.match(/(?:(?:FSSAI(?:\s*LIC(?:EN[CS]E)?\.?\s*(?:NO\.?)?)?)|(?:LIC(?:EN[CS]E)?\.?\s*NO\.?))\s*[:.\-]?\s*([0-9]{14})\b/i);
    if (fssaiMatch && !/^\s*(?:MANUFACTURED\s*BY\s*[:.\-]?\s*)?\(([A-Z0-9]{1,3})\)/i.test(item.norm)) {
      const lic = fssaiMatch[1];
      if (!result.fssaiLicenses.some((l) => l.licenseNumber === lic)) {
        result.fssaiLicenses.push({
          licenseNumber: lic,
          unitCode: null,
          role: 'Corporate / Marketer',
          source: item.raw,
        });
      }
      if (result.fssaiNumber.value === 'Not detected') {
        result.fssaiNumber = makeField(lic, item.raw, 'high');
      }
      continue;
    }

    // 5C. Combined Manufacturer & Marketer / Packed & Marketed By
    const combinedMatch = item.norm.match(/(?:Manufactured\s*(?:&|AND)\s*Marketed\s*By)\s*[:.\-]?\s*([^,\n]+)/i);
    if (combinedMatch && combinedMatch[1]) {
      const co = combinedMatch[1].trim().replace(/^[:.\-\s]+/, '');
      if (co.length > 2) {
        result.manufacturer = makeField(co, item.raw, 'high');
        result.marketer = makeField(co, item.raw, 'high');
      }
      continue;
    }

    // 5D. Manufactured For / Marketed By
    const mfdForMatch = item.norm.match(/(?:MANUFACTURED\s*FOR|MFD\.?\s*FOR|MARKETED\s*BY|MKT\.?\s*BY)\s*[:.\-]?\s*(.*)$/i);
    if (mfdForMatch && result.manufacturedFor.value === 'Not detected') {
      const rest = mfdForMatch[1].trim();
      const corpMatch = rest.match(/^(.*?PVT\.?\s*LTD\.?|.*?PRIVATE\s*LIMITED|.*?LTD\.?|.*?LIMITED|.*?LLP)(?:[,\s]+(.*))?$/i);
      const company = corpMatch ? corpMatch[1].replace(/^[,\s\-]+|[,\s\-]+$/g, '').trim() : rest.split(',')[0].trim();
      const addr = corpMatch && corpMatch[2] ? corpMatch[2].replace(/^[,\s\-]+|[,\s\-]+$/g, '').trim() : '';

      result.manufacturedFor = makeField(company, item.raw, 'high');
      result.marketer = makeField(company, item.raw, 'high');
      if (addr && result.address.value === 'Not detected') {
        result.address = makeField(addr, item.raw, 'high');
      }
      continue;
    }

    // 5E. Manufacturing Unit with Code: "(HY) - ANAND FOOD PRODUCTS ... LIC. No.: ..."
    // or "MANUFACTURED BY: (HY) - ANAND FOOD PRODUCTS ..."
    const unitMatch = item.norm.match(/^(?:MANUFACTURED\s*BY\s*[:.\-]?\s*)?\(([A-Z0-9]{1,3})\)\s*[-:]?\s*(.*)$/i);
    if (unitMatch) {
      const code = unitMatch[1].toUpperCase();
      let rest = unitMatch[2].trim();

      let unitLic = null;
      const licMatch = rest.match(/(?:(?:FSSAI\s*)?LIC(?:EN[CS]E)?\.?\s*NO\.?[:.\-]?\s*)([0-9]{14})\b/i);
      if (licMatch) {
        unitLic = licMatch[1];
        rest = rest.replace(licMatch[0], '').trim();
      }

      let mfrName = rest;
      let mfrAddr = '';

      const corpMatch = rest.match(/^(.*?PVT\.?\s*LTD\.?|.*?PRIVATE\s*LIMITED|.*?LTD\.?|.*?LIMITED|.*?LLP)(?:[,\s]+(.*))?$/i);
      if (corpMatch) {
        mfrName = corpMatch[1].replace(/^[,\s\-]+|[,\s\-]+$/g, '').trim();
        mfrAddr = corpMatch[2] ? corpMatch[2].replace(/^[,\s\-]+|[,\s\-]+$/g, '').trim() : '';
      } else {
        const addrStart = rest.search(/\b(?:[0-9]+[-/][0-9A-Za-z]+|PLOT|SECTOR|INDL|SURVEY|VILLAGE|ROAD|STREET|POST|DIST|NO\.)\b/i);
        if (addrStart > 0) {
          mfrName = rest.substring(0, addrStart).replace(/^[,\s\-]+|[,\s\-]+$/g, '').trim();
          mfrAddr = rest.substring(addrStart).replace(/^[,\s\-]+|[,\s\-]+$/g, '').trim();
        }
      }

      mfrName = mfrName.replace(/^[,\s\-]+|[,\s\-]+$/g, '');
      mfrAddr = mfrAddr.replace(/^[,\s\-]+|[,\s\-]+$/g, '');

      result.manufacturingUnits.push({
        code,
        manufacturer: mfrName,
        address: mfrAddr,
        fssaiLicense: unitLic,
        source: item.raw,
      });

      if (unitLic && !result.fssaiLicenses.some((l) => l.licenseNumber === unitLic)) {
        result.fssaiLicenses.push({
          licenseNumber: unitLic,
          unitCode: code,
          role: `Manufacturing Unit (${code})`,
          source: item.raw,
        });
      }
      continue;
    }

    // 5F. Standard Single Manufacturer
    if (!/Packaging\s*Material/i.test(item.norm) && !/Marketed\s*By/i.test(item.norm) && !/Manufactured\s*For/i.test(item.norm)) {
      const mfdMatch = item.norm.match(/(?:Manufactured\s*By|Mfd\.?\s*By|Produced\s*By)\s*[:.\-]?\s*([^,\n]+)/i);
      if (mfdMatch && mfdMatch[1] && result.manufacturer.value === 'Not detected') {
        const candidate = mfdMatch[1].trim().replace(/^[:.\-\s]+/, '');
        if (candidate.length > 2 && !/^(?:by|at|unit|plot)$/i.test(candidate)) {
          result.manufacturer = makeField(candidate, item.raw, 'high');
        }
      }
    }

    // 5G. Standard Packer
    if (!/Packaging\s*Material/i.test(item.norm)) {
      const pkdMatch = item.norm.match(/(?:Packed\s*By|Pkd\.?\s*By|Packer)\s*[:.\-]?\s*([^,\n]+)/i);
      if (pkdMatch && pkdMatch[1] && result.packer.value === 'Not detected') {
        const co = pkdMatch[1].trim().replace(/^[:.\-\s]+/, '');
        if (co.length > 2) {
          result.packer = makeField(co, item.raw, 'high');
        }
      }
    }
  }

  // Populate overall manufacturer field from manufacturing units if multiple exist
  if (result.manufacturingUnits.length > 0 && result.manufacturer.value === 'Not detected') {
    if (result.manufacturingUnits.length === 1) {
      result.manufacturer = makeField(result.manufacturingUnits[0].manufacturer, result.manufacturingUnits[0].source, 'high');
    } else {
      result.manufacturer = makeField(
        `${result.manufacturingUnits[0].manufacturer} (and ${result.manufacturingUnits.length - 1} other units)`,
        result.manufacturingUnits[0].source,
        'high'
      );
    }
  }

  // ============================================================
  // 6. POSTAL ADDRESS EXTRACTION
  // ============================================================
  if (result.address.value === 'Not detected') {
    const addressRegex = /(?:REGD\.?\s*OFFICE|FACTORY\s*:|PLOT\s*NO|ESTATE|DIST(?:RICT)?|UNIT\s*NO\.?|TOWER|FLOOR|PIN\s*(?:CODE)?\s*[:.\-]?\s*\d{3}\s?\d{3}|(?:[A-Za-z\s]+),\s*(?:TAMIL NADU|MAHARASHTRA|DELHI|KARNATAKA|GUJARAT|UTTAR PRADESH|HARYANA|PUNJAB|KERALA|WEST BENGAL|ANDHRA PRADESH|TELANGANA|RAJASTHAN|MADHYA PRADESH|MUMBAI|CHENNAI|KOLKATA|BENGALURU)(?:\s*-\s*\d{3}\s?\d{3})?)/i;

    for (let i = 0; i < classified.length; i++) {
      const item = classified[i];
      if (item.isNutrition || item.isIngredient || item.isCustomerMsg) continue;

      if (addressRegex.test(item.norm)) {
        const splitAfterCo = item.norm.match(/(?:Mkt\.?\s*By|Mfd\.?\s*By|Manufactured\s*By|Marketed\s*By)\s*:[^,]+,\s*(.*)/i);
        let addrCandidate = '';
        if (splitAfterCo && splitAfterCo[1] && splitAfterCo[1].trim().length > 8) {
          addrCandidate = splitAfterCo[1].trim();
        } else {
          addrCandidate = item.raw.trim();
        }

        let combinedAddress = addrCandidate;
        for (let j = i + 1; j < Math.min(classified.length, i + 5); j++) {
          const next = classified[j];
          if (next.isNutrition || next.isIngredient || next.isCustomerMsg || next.isHeaderRow) break;
          if (/(?:fssai|mrp|net\s*wt|lic|batch|pkd|customer|consumer|packaging)/i.test(next.norm)) break;
          if (/(?:Unit\s*No|Floor|Tower|Centre|Centre|Parel|Road|Street|Estate|Mumbai|Delhi|PIN|\d{3}\s?\d{3})/i.test(next.norm)) {
            combinedAddress += ', ' + next.raw.trim();
          }
        }

        combinedAddress = combinedAddress.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
        result.address = makeField(combinedAddress, item.raw, 'high');
        break;
      }
    }
  }

  // ============================================================
  // 7. CUSTOMER CARE (Phone, Email, Address)
  // ============================================================
  for (const item of classified) {
    if (item.isNutrition || item.isIngredient) continue;

    const tollFreeMatch = item.norm.match(/\b(1800[\s\-]?(?:\d{2}[\s\-]?\d{4}|\d{3}[\s\-]?\d{3,4}|\d{6}))\b/);
    const phoneMatch = item.norm.match(/(?:PHONE\s*NO\.?|TEL(?:EPHONE)?\s*NO\.?|TOLL\s*FREE\s*(?:NO\.?)?|HELPLINE\s*NO\.?|CALL\s*(?:US\s*AT)?)\s*[:.\-]?\s*([0-9\s\-+()]{7,20})/i) ||
                       item.norm.match(/\b(0\d{2,4}[\s\-]?\d{6,8})\b/);
    const phone = tollFreeMatch ? tollFreeMatch[1].trim() : (phoneMatch ? phoneMatch[1].trim() : null);

    if (phone && result.customerCarePhone.value === 'Not detected') {
      result.customerCarePhone = makeField(phone, item.raw, 'high');
      if (result.customerCare.value === 'Not detected') {
        result.customerCare = makeField(phone, item.raw, 'high');
      }
    }

    const emailMatch = item.norm.match(/(?:Email|E-mail)\s*[:.\-]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                       item.norm.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i);
    if (emailMatch && result.customerCareEmail.value === 'Not detected') {
      result.customerCareEmail = makeField(emailMatch[1].trim(), item.raw, 'high');
    }

    const careCellMatch = item.norm.match(/(?:CONSUMER\s*CARE\s*CELL|CUSTOMER\s*CARE\s*CELL|CONSUMER\s*SERVICE\s*CELL)\s*[:.\-]?\s*(.*)$/i);
    if (careCellMatch && result.customerCareAddress.value === 'Not detected') {
      result.customerCareAddress = makeField(careCellMatch[1].trim(), item.raw, 'high');
    }
  }

  // ============================================================
  // 8. BARCODE
  // ============================================================
  for (const item of classified) {
    const bMatch = item.norm.match(/(?:Barcode(?:\s*(?:No\.?|Number))?|EAN(?:-?13)?|UPC(?:-?A)?)\s*[:.\-]?\s*([0-9\s\-]{8,25})/i);
    if (bMatch && result.barcode.value === 'Not detected') {
      const clean = bMatch[1].replace(/[\s\-]/g, '');
      if (clean.length >= 8 && clean.length <= 14) {
        result.barcode = makeField(clean, item.raw, 'high');
        break;
      }
    }
  }

  // ============================================================
  // 9. BEST BEFORE CLAUSE
  // ============================================================
  for (const item of classified) {
    if (item.isNutrition || item.isIngredient) continue;
    const bbMatch = item.norm.match(/BEST\s*BEFORE\s*[:.\-]?\s*(.+)$/i);
    if (bbMatch && result.bestBefore.value === 'Not detected') {
      const rawVal = bbMatch[1].trim().replace(/\.$/, '');
      const formatted = /^[0-9]/.test(rawVal)
        ? rawVal
        : (rawVal.charAt(0).toUpperCase() + rawVal.slice(1).toLowerCase());
      result.bestBefore = makeField(formatted, item.raw, 'high');
      if (result.expiryDate.value === 'Not detected') {
        result.expiryDate = makeField(rawVal, item.raw, 'high');
      }
      break;
    }
  }

  // ============================================================
  // 10. BATCH NUMBER (Reject Explanatory Sentences)
  // ============================================================
  for (const item of classified) {
    if (item.isNutrition || item.isIngredient || item.isHeaderRow) continue;

    // Reject instructional descriptions: e.g. "FIRST TWO CHARACTERS OF THE BATCH INDICATES..."
    if (/(?:first|for)\s*(?:two|three)?\s*(?:characters?|letters?|digits?)\s*of\s*(?:the\s*)?batch/i.test(item.norm) ||
        /(?:see|refer)\s*(?:batch|mfg|pkd)\s*for\s*(?:unit|mfg|address)/i.test(item.norm)) {
      continue;
    }

    const batchMatch = item.norm.match(/(?:Batch(?:\s*(?:No\.?|Number|Code))?|B\.?\s*No\.?|\bLOT\b)\s*[:.\-]?\s*([A-Za-z0-9\-_/]+)/i);
    if (batchMatch && batchMatch[1] && result.batchNumber.value === 'Not detected') {
      const candidate = batchMatch[1].trim();
      if (!/^(?:no|number|see|first|two)$/i.test(candidate) && candidate.length >= 2) {
        result.batchNumber = makeField(candidate, item.raw, 'high');
      }
    }
  }

  // ============================================================
  // 11. MANUFACTURING DATE
  // ============================================================
  for (const item of classified) {
    if (item.isNutrition || item.isIngredient || item.isHeaderRow) continue;

    const mfgMatch = item.norm.match(/(?:MFD\.?|MFG\.?|Date\s*of\s*(?:Mfg|Manufacturing|Packaging)|PKD\.?|Packed\s*Date|Packaging\s*Date|Packing\s*Date)\s*[:.\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.\-]*\d{2,4})\b/i);
    if (mfgMatch && mfgMatch[1] && result.manufacturingDate.value === 'Not detected') {
      result.manufacturingDate = makeField(mfgMatch[1].trim(), item.raw, 'high');
    }
  }

  // ============================================================
  // 12. EXPIRY DATE (Explicit Calendar Date)
  // ============================================================
  for (const item of classified) {
    if (item.isNutrition || item.isIngredient || item.isHeaderRow) continue;

    const expMatch = item.norm.match(/(?:EXP\.?|EXPIRY|USE\s*BY|BEFORE)\s*[:.\-]?\s*([0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{2,4}|[0-9]{1,2}[\/\.\-][0-9]{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s.\-]*\d{2,4})\b/i);
    if (expMatch && expMatch[1] && result.expiryDate.value === 'Not detected') {
      result.expiryDate = makeField(expMatch[1].trim(), item.raw, 'high');
    }
  }

  // ============================================================
  // 13. BRAND & PRODUCT NAME EXTRACTION
  // ============================================================
  const KNOWN_BRANDS = ['OREO', 'PARLE-G', 'PARLE', 'CADBURY', 'TATA', 'SUNFEAST', 'BRITANNIA', 'NESTLE', 'AMUL', 'HALDIRAM'];
  for (const b of KNOWN_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(raw)) {
      result.brand = makeField(b, b, 'high');
      break;
    }
  }

  const cleanHeaderLines = classified.filter((item) => {
    if (item.isNutrition || item.isIngredient || item.isAllergen || item.isStorage || item.isHeaderRow || item.isCustomerMsg) {
      return false;
    }
    const up = item.up;
    return (
      up.length > 2 &&
      !item.norm.includes('@') &&
      !/^(?:EMAIL|E-MAIL|PHONE|TEL|WEBSITE|HTTP|WWW|\([A-Z0-9]{1,3}\))/i.test(up) &&
      !/^(?:MRP|MAX(?:IMUM)?|NET|MFD|BATCH|PKD|EXP|FSSAI|LIC|BEST|CUSTOMER|CONSUMER|ALLERGEN|STORAGE|SERVING|NUTRITION|PRODUCT\s*QUALITY|BARCODE|REGISTRATION|INGREDIENTS|COCOA|PACKAGING|MKT|MANUFACTURED|PACKED|TOTAL|CALORIES|ENERGY|UNIT\s*NO|FLOOR|TOWER|PLOT\s*NO|REGD|FACTORY|ESTATE|\d+\s*PACKS?)/i.test(up) &&
      !/(?:Packaging\s*Material|Mkt\.?\s*By|Marketed\s*By|Mfd\.?\s*By|Manufactured\s*By|Manufactured\s*For|Packed\s*By|Pkd\.?\s*By|CONTAINS|STORE\s*IN|SATISFIED\s*WITH|Unit\s*No|Floor|Tower|Centre|Estate|Road|Street|Parel|Mumbai|Delhi|PIN|\d{3}\s?\d{3}|\b\d+\s*packs?\s*x\b)/i.test(item.norm) &&
      !/^\d+$/.test(up)
    );
  });

  let matchedProductLine = null;
  if (result.brand.value !== 'Not detected') {
    const brandRegex = new RegExp(`\\b${result.brand.value}\\b`, 'i');
    matchedProductLine = cleanHeaderLines.find((item) => brandRegex.test(item.norm));
  }
  if (!matchedProductLine && cleanHeaderLines.length > 0) {
    matchedProductLine = cleanHeaderLines[0];
  }
  if (matchedProductLine) {
    result.productName = makeField(matchedProductLine.raw, matchedProductLine.raw, 'high');
  }

  // Construct flat evidence map for UI compatibility
  for (const [key, field] of Object.entries(result)) {
    if (field && typeof field === 'object' && field.source) {
      result.evidence[key] = field.source;
    }
  }

  return result;
}

export const extractCommodityDeclarations = extractDeclarationsFromText;
