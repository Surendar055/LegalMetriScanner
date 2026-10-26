import { createWorker } from 'tesseract.js';

import {
  extractDeclarationsFromText,
  normalizeOcrText,
  makeField,
} from './commodityExtractionEngine.js';

const extractCommodityDeclarations = extractDeclarationsFromText;

/**
 * Unifies Phase 1-3D Spatial Extraction results with legacy auxiliary fields.
 *
 * Priority: SPATIAL RESULT > OLD REGEX RESULT
 *
 * The spatial engine is authoritative for:
 * - MRP
 * - Net Quantity
 * - FSSAI
 * - Manufacturer / Address
 * - Manufactured For
 * - Packer
 * - Marketer
 * - Customer Care
 * - Batch / Lot
 * - Manufacturing Date
 * - Best Before / Expiry
 */
export function unifyExtractionResults(spatialFields, legacyFields = {}) {
  // Start with legacy fields to preserve non-statutory auxiliary data
  // (nutrition, ingredients, allergens, storage, website, productName, rawText, etc.)
  const unified = { ...legacyFields };

  const makeFieldObj = (field, defaultVal = 'Not detected', defaultConf = 'low') => {
    if (!field) {
      return {
        value: defaultVal,
        source: null,
        confidence: defaultConf,
        toString() { return this.value; },
        valueOf() { return this.value; },
      };
    }
    if (typeof field === 'string') {
      return {
        value: field,
        source: null,
        confidence: field === 'Not detected' ? 'low' : 'high',
        toString() { return this.value; },
        valueOf() { return this.value; },
      };
    }
    return {
      ...field,
      value: field.value || defaultVal,
      source: field.source || null,
      confidence: field.confidence || (field.value && field.value !== 'Not detected' ? 'high' : defaultConf),
      toString() { return this.value; },
      valueOf() { return this.value; },
    };
  };

  if (!spatialFields) {
    return unified;
  }

  // 1. MRP (Authoritative: spatialFields.mrp)
  if (spatialFields.mrp) {
    unified.mrp = makeFieldObj(spatialFields.mrp);
  }

  // 2. Net Quantity (Authoritative: spatialFields.netQuantity)
  if (spatialFields.netQuantity) {
    unified.netQuantity = makeFieldObj(spatialFields.netQuantity);
  }

  // 3. FSSAI Number & Licenses (Authoritative: spatialFields.fssaiNumber & fssaiLicenses)
  if (spatialFields.fssaiNumber) {
    unified.fssaiNumber = makeFieldObj(spatialFields.fssaiNumber);
  }
  if (spatialFields.fssaiLicenses) {
    unified.fssaiLicenses = spatialFields.fssaiLicenses;
  }

  // 4. Manufacturers & Address (Authoritative: spatialFields.manufacturers)
  const mfrList = Array.isArray(spatialFields.manufacturers) ? spatialFields.manufacturers : [];
  unified.manufacturers = mfrList;
  if (mfrList.length > 0) {
    const firstMfr = mfrList[0];
    unified.manufacturer = makeFieldObj({
      value: firstMfr.company || 'Not detected',
      source: firstMfr.source || null,
      confidence: firstMfr.confidence || 'HIGH',
    });
    if (firstMfr.address) {
      unified.address = makeFieldObj({
        value: firstMfr.address,
        source: firstMfr.source || null,
        confidence: firstMfr.confidence || 'HIGH',
      });
    }
  } else {
    unified.manufacturer = makeFieldObj(null);
  }

  // 5. Manufactured For (Authoritative: spatialFields.manufacturedFor)
  if (spatialFields.manufacturedFor) {
    unified.manufacturedFor = makeFieldObj({
      value: spatialFields.manufacturedFor.company || 'Not detected',
      address: spatialFields.manufacturedFor.address || null,
      source: spatialFields.manufacturedFor.source || null,
      confidence: spatialFields.manufacturedFor.confidence || 'HIGH',
    });
  } else {
    unified.manufacturedFor = makeFieldObj(null);
  }

  // 6. Packers (Authoritative: spatialFields.packers)
  const pkrList = Array.isArray(spatialFields.packers) ? spatialFields.packers : [];
  unified.packers = pkrList;
  if (pkrList.length > 0) {
    const firstPkr = pkrList[0];
    unified.packer = makeFieldObj({
      value: firstPkr.company || 'Not detected',
      address: firstPkr.address || null,
      source: firstPkr.source || null,
      confidence: firstPkr.confidence || 'HIGH',
    });
  } else {
    unified.packer = makeFieldObj(null);
  }

  // 7. Marketers (Authoritative: spatialFields.marketers)
  const mktList = Array.isArray(spatialFields.marketers) ? spatialFields.marketers : [];
  unified.marketers = mktList;
  if (mktList.length > 0) {
    const firstMkt = mktList[0];
    unified.marketer = makeFieldObj({
      value: firstMkt.company || 'Not detected',
      address: firstMkt.address || null,
      source: firstMkt.source || null,
      confidence: firstMkt.confidence || 'HIGH',
    });
  } else {
    unified.marketer = makeFieldObj(null);
  }

  // 8. Customer Care (Authoritative: spatialFields.customerCare)
  if (spatialFields.customerCare) {
    const cc = spatialFields.customerCare;
    unified.customerCareDetails = cc;
    const firstPhone = Array.isArray(cc.phones) && cc.phones.length > 0 ? cc.phones[0] : null;
    const firstEmail = Array.isArray(cc.emails) && cc.emails.length > 0 ? cc.emails[0] : null;
    const ccVal = firstPhone ? firstPhone.value : (firstEmail ? firstEmail.value : (cc.organization || 'Not detected'));
    const ccSrc = firstPhone ? firstPhone.source : (firstEmail ? firstEmail.source : null);

    unified.customerCare = makeFieldObj({
      value: ccVal,
      source: ccSrc,
      confidence: cc.confidence || 'HIGH',
    });

    if (firstEmail) {
      unified.customerCareEmail = makeFieldObj({
        value: firstEmail.value,
        source: firstEmail.source,
        confidence: firstEmail.confidence || 'HIGH',
      });
    }
  } else {
    unified.customerCare = makeFieldObj(null);
    unified.customerCareDetails = null;
  }

  // 9. Batch Number (Authoritative: spatialFields.batch)
  if (spatialFields.batch) {
    unified.batchNumber = makeFieldObj(spatialFields.batch);
    unified.batch = makeFieldObj(spatialFields.batch);
  }

  // 10. Manufacturing Date (Authoritative: spatialFields.manufacturingDate)
  if (spatialFields.manufacturingDate) {
    unified.manufacturingDate = makeFieldObj(spatialFields.manufacturingDate);
    unified.mfgDate = makeFieldObj(spatialFields.manufacturingDate);
  }

  // 11. Best Before / Expiry (Authoritative: spatialFields.bestBefore)
  if (spatialFields.bestBefore) {
    unified.bestBefore = makeFieldObj(spatialFields.bestBefore);
    unified.expiryDate = makeFieldObj(spatialFields.bestBefore);
  }

  return unified;
}

export {
  extractDeclarationsFromText,
  extractCommodityDeclarations,
  normalizeOcrText,
  makeField,
};

/**
 * Runs OCR on an image (base64 dataURL or image URL)
 * Supports progress callback for real-time UI updates
 */
export async function runOcrOnImage(imageDataUrl, onProgress, options = {}) {
  if (!imageDataUrl) {
    throw new Error('No image provided for OCR analysis');
  }

  const startTime = Date.now();

  // Strategy 1: Primary Backend OCR API with Sharp Preprocessing + Multi-Orientation
  try {
    onProgress?.({ stage: 'connecting', message: 'Connecting to multi-variant OCR engine...', progress: 15 });
    
    const res = await fetch('/api/ocr/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageDataUrl,
        originalImage: options.originalImage || null,
        clientQualityDebug: options.clientQualityDebug || null,
      }),
    });

    if (res.ok) {
      onProgress?.({ stage: 'processing', message: 'Analyzing label orientation & text...', progress: 75 });
      const data = await res.json();
      onProgress?.({ stage: 'extracting', message: 'Extracting packaged commodity declarations...', progress: 95 });

      // UNIFIED EXTRACTION: Use spatialFields as authoritative statutory declarations
      const legacyFields = data.extractedFields || extractCommodityDeclarations(data.rawText);
      const extractedFields = data.spatialFields
        ? unifyExtractionResults(data.spatialFields, legacyFields)
        : legacyFields;

      const getVal = (f) => (f && typeof f === 'object' && 'value' in f ? f.value : (f || 'Not detected'));
      const extractionSource = data.spatialFields ? 'SPATIAL' : 'LEGACY FALLBACK';

      console.log(`[UNIFIED EXTRACTION]
Source: ${extractionSource}
MRP: ${getVal(extractedFields.mrp)}
Net Quantity: ${getVal(extractedFields.netQuantity)}
FSSAI: ${getVal(extractedFields.fssaiNumber)}
Manufacturer: ${getVal(extractedFields.manufacturer)}
Customer Care: ${getVal(extractedFields.customerCare)}
Batch: ${getVal(extractedFields.batchNumber)}
Manufacturing Date: ${getVal(extractedFields.manufacturingDate)}
Best Before: ${getVal(extractedFields.bestBefore)}`);

      return {
        rawText: data.rawText || '',
        ocrConfidence: data.confidence || 0,
        selectedVariant: data.selectedVariant || data.ocrVariant || 'Adaptive Multi-Orientation Preprocessing',
        ocrVariant: data.ocrVariant || data.selectedVariant || 'Adaptive Multi-Orientation Preprocessing',
        processingTimeMs: data.processingTimeMs || (Date.now() - startTime),
        variantsTested: data.variantsTested || 1,
        psmMode: data.psmMode || '3 (Automatic)',
        words: data.words || data.ocr?.words || [],
        lines: data.lines || [],
        wordCount: data.wordCount || data.ocr?.wordCount || 0,
        ocr: data.ocr || null,
        comparison: data.comparison || null,
        spatialFields: data.spatialFields || null,
        spatialDebug: data.spatialDebug || null,
        imageQualityDebug: data.imageQualityDebug || options.clientQualityDebug || null,
        extractedFields,
      };
    }
  } catch (backendErr) {
    console.warn('[OCR Service] Backend OCR route unavailable or failed, falling back to in-browser Tesseract:', backendErr);
  }

  // Strategy 2: In-browser Tesseract.js Worker fallback with client-side canvas rotation
  onProgress?.({ stage: 'worker_init', message: 'Initializing optical character recognition...', progress: 25 });
  
  let worker = null;
  try {
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress != null) {
          const pct = Math.round(30 + m.progress * 60);
          onProgress?.({
            stage: 'recognizing',
            message: `Reading package text (${Math.round(m.progress * 100)}%)...`,
            progress: pct,
          });
        }
      },
    });

    await worker.setParameters({
      tessedit_pageseg_mode: '3',
    });

    onProgress?.({ stage: 'recognizing', message: 'Reading package text at 0°...', progress: 45 });

    let bestText = '';
    let bestConf = 0;
    let bestVariant = '0° in-browser standard';
    let bestWords = [];
    let bestLines = [];

    const mapGeom = (data) => {
      const words = [];
      const lines = [];

      if (Array.isArray(data?.words) && data.words.length > 0) {
        for (const w of data.words) {
          const text = w.text ? String(w.text).trim() : '';
          if (text.length > 0) {
            words.push({
              text,
              confidence: typeof w.confidence === 'number' ? Math.round(w.confidence) : 0,
              bbox: {
                x0: w.bbox?.x0 ?? 0,
                y0: w.bbox?.y0 ?? 0,
                x1: w.bbox?.x1 ?? 0,
                y1: w.bbox?.y1 ?? 0,
              },
            });
          }
        }
      }

      if (Array.isArray(data?.lines) && data.lines.length > 0) {
        for (const l of data.lines) {
          const text = l.text ? String(l.text).trim() : '';
          if (text.length > 0) {
            lines.push({
              text,
              confidence: typeof l.confidence === 'number' ? Math.round(l.confidence) : 0,
              bbox: {
                x0: l.bbox?.x0 ?? 0,
                y0: l.bbox?.y0 ?? 0,
                x1: l.bbox?.x1 ?? 0,
                y1: l.bbox?.y1 ?? 0,
              },
            });
          }
        }
      }

      if (words.length === 0 && Array.isArray(data?.blocks)) {
        for (const block of data.blocks) {
          for (const para of (block.paragraphs || [])) {
            for (const line of (para.lines || [])) {
              const lineText = line.text ? String(line.text).trim() : '';
              if (lineText.length > 0) {
                lines.push({
                  text: lineText,
                  confidence: typeof line.confidence === 'number' ? Math.round(line.confidence) : 0,
                  bbox: {
                    x0: line.bbox?.x0 ?? 0,
                    y0: line.bbox?.y0 ?? 0,
                    x1: line.bbox?.x1 ?? 0,
                    y1: line.bbox?.y1 ?? 0,
                  },
                });
              }
              for (const w of (line.words || [])) {
                const wText = w.text ? String(w.text).trim() : '';
                if (wText.length > 0) {
                  words.push({
                    text: wText,
                    confidence: typeof w.confidence === 'number' ? Math.round(w.confidence) : 0,
                    bbox: {
                      x0: w.bbox?.x0 ?? 0,
                      y0: w.bbox?.y0 ?? 0,
                      x1: w.bbox?.x1 ?? 0,
                      y1: w.bbox?.y1 ?? 0,
                    },
                  });
                }
              }
            }
          }
        }
      }

      return { words, lines };
    };

    const ret0 = await worker.recognize(imageDataUrl, {}, { text: true, blocks: true });
    bestText = ret0.data.text || '';
    bestConf = Math.round(ret0.data.confidence || 0);
    const geom0 = mapGeom(ret0.data);
    bestWords = geom0.words;
    bestLines = geom0.lines;

    // If 0° text didn't detect strong keywords, test rotations in canvas
    const hasKeywords = /(MRP|RS\.|NET|MFD|BATCH|PKD|EXPIRY|FSSAI|₹)/i.test(bestText);
    if (!hasKeywords && typeof document !== 'undefined') {
      const testAngles = [90, 270, 180];
      for (const angle of testAngles) {
        try {
          onProgress?.({ stage: 'recognizing', message: `Checking ${angle}° sideways orientation...`, progress: 70 });
          const rotatedDataUrl = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              if (angle === 90 || angle === 270) {
                canvas.width = img.height;
                canvas.height = img.width;
              } else {
                canvas.width = img.width;
                canvas.height = img.height;
              }
              const ctx = canvas.getContext('2d');
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate((angle * Math.PI) / 180);
              ctx.drawImage(img, -img.width / 2, -img.height / 2);
              resolve(canvas.toDataURL('image/jpeg', 0.92));
            };
            img.src = imageDataUrl;
          });

          const ret = await worker.recognize(rotatedDataUrl, {}, { text: true, blocks: true });
          const retText = ret.data.text || '';
          const retConf = Math.round(ret.data.confidence || 0);
          if (/(MRP|RS\.|NET|MFD|BATCH|PKD|EXPIRY|FSSAI|₹)/i.test(retText) || (retText.length > bestText.length && retConf > bestConf)) {
            bestText = retText;
            bestConf = retConf;
            bestVariant = `${angle}° rotated (in-browser canvas)`;
            const geom = mapGeom(ret.data);
            bestWords = geom.words;
            bestLines = geom.lines;
            if (/(MRP|RS\.|₹)/i.test(retText) && /NET/i.test(retText)) break;
          }
        } catch (rotErr) {
          console.warn(`Canvas rotation ${angle}° fallback error:`, rotErr);
        }
      }
    }

    onProgress?.({ stage: 'extracting', message: 'Extracting package declarations...', progress: 95 });

    const legacyFields = extractCommodityDeclarations(bestText);
    const extractedFields = unifyExtractionResults(null, legacyFields);

    const getVal = (f) => (f && typeof f === 'object' && 'value' in f ? f.value : (f || 'Not detected'));
    console.log(`[UNIFIED EXTRACTION]
Source: LEGACY FALLBACK
MRP: ${getVal(extractedFields.mrp)}
Net Quantity: ${getVal(extractedFields.netQuantity)}
FSSAI: ${getVal(extractedFields.fssaiNumber)}
Manufacturer: ${getVal(extractedFields.manufacturer)}
Customer Care: ${getVal(extractedFields.customerCare)}
Batch: ${getVal(extractedFields.batchNumber)}
Manufacturing Date: ${getVal(extractedFields.manufacturingDate)}
Best Before: ${getVal(extractedFields.bestBefore)}`);

    await worker.terminate();

    return {
      rawText: bestText,
      ocrConfidence: bestConf,
      selectedVariant: bestVariant,
      ocrVariant: bestVariant,
      processingTimeMs: Date.now() - startTime,
      variantsTested: 2,
      psmMode: '3 (Automatic)',
      words: bestWords,
      lines: bestLines,
      wordCount: bestWords.length,
      lineCount: bestLines.length,
      ocr: {
        text: bestText,
        confidence: bestConf,
        variant: bestVariant,
        wordCount: bestWords.length,
        words: bestWords,
      },
      extractedFields,
    };
  } catch (err) {
    console.error('[OCR Service] In-browser OCR failed:', err);
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {}
    }
    throw err;
  }
}

export default {
  runOcrOnImage,
  extractCommodityDeclarations,
};
