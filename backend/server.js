const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const { authRouter, verifyToken } = require('./auth');
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/auth', authRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'LegalMetriScan Backend', time: new Date().toISOString() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e8, // 100 MB buffer for photo payloads
});

// Helper to find local network IPv4 address
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 4000;
const VITE_PORT = process.env.VITE_PORT || 5173;

// Active pairing sessions: sessionId -> { laptopSocketId, phoneSocketId, device, createdAt }
const sessions = new Map();

// REST route to get network info and generate session
app.get('/api/session/new', (req, res) => {
  const localIp = getLocalNetworkIp();
  const sessionId = 'LMS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const baseUrl = process.env.PUBLIC_FRONTEND_URL || (req.get('origin') || `https://${localIp}:${VITE_PORT}`);
  const mobileUrl = `${baseUrl.replace(/\/+$/, '')}/?sessionId=${sessionId}&mode=mobile`;

  res.json({
    sessionId,
    localIp,
    backendPort: PORT,
    vitePort: VITE_PORT,
    mobileUrl,
  });
});

app.get('/api/network-info', (req, res) => {
  const localIp = getLocalNetworkIp();
  res.json({
    localIp,
    backendPort: PORT,
    vitePort: VITE_PORT,
  });
});

// REAL OCR ANALYSIS ENDPOINT WITH ADVANCED PREPROCESSING & ORIENTATION HANDLING
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
let cachedOcrWorker = null;

async function getOcrWorker(psm = '3') {
  if (!cachedOcrWorker) {
    cachedOcrWorker = await createWorker('eng', 1);
  }
  await cachedOcrWorker.setParameters({
    tessedit_pageseg_mode: String(psm), // 3: Automatic, 11: Sparse text, 6: Uniform block
  });
  return cachedOcrWorker;
}

// Packaging keyword weights for selecting the best OCR candidate
const PACKAGING_KEYWORDS = [
  'MRP', 'RS.', 'RS ', 'RS:', '₹', 'MAXIMUM RETAIL', 'INCL', 'TAXES',
  'NET QTY', 'NET QUANTITY', 'NET WT', 'NET WEIGHT', 'QUANTITY',
  'PACKED', 'PACKED BY', 'MANUFACTURED', 'MANUFACTURER', 'MFD', 'MFD BY', 'MKTD BY',
  'PKD', 'BATCH', 'LOT', 'B.NO', 'LOT NO',
  'BEST BEFORE', 'EXPIRY', 'EXP DATE', 'USE BY',
  'CUSTOMER CARE', 'CONSUMER CARE', 'HELPLINE', 'FEEDBACK',
  'FSSAI', 'LIC NO', 'LICENCE NO', 'LIC. NO',
  '1 KG', '500 G', '250 G', '100 G', 'KG', 'GM', 'GMS', 'ML', 'LTR', 'UNITS', 'PCS',
  'TAMIL NADU', 'MAHARASHTRA', 'INDIA', 'PLOT', 'ESTATE'
];

function scoreOcrCandidate(text, confidence) {
  if (!text || text.trim().length === 0) return 0;
  const upper = text.toUpperCase();

  // 1. Statutory Packaging Keywords count
  let matchedKeywords = 0;
  for (const kw of PACKAGING_KEYWORDS) {
    if (upper.includes(kw)) {
      matchedKeywords++;
    }
  }
  const keywordScore = Math.min(matchedKeywords * 25, 150);

  // 2. Meaningful English words (at least 3 letters with vowel)
  const candidateWords = upper.match(/[A-Z]{3,}/g) || [];
  const wordsWithVowels = candidateWords.filter(w => /[AEIOU]/.test(w));
  const wordScore = Math.min(wordsWithVowels.length * 2.5, 60);

  // 3. Statutory regex pattern bonuses (MRP, Net Qty, Dates, FSSAI)
  let patternBonus = 0;
  // MRP pattern
  if (/(?:MRP|M\.?R\.?P|MAX(?:IMUM)?\s*RETAIL|RS\.?|₹)\s*[:.\-]?\s*(?:₹|Rs\.?|INR)?\s*[0-9]+(?:\.[0-9]{1,2})?/i.test(text)) {
    patternBonus += 40;
  }
  // Net Qty pattern
  if (/(?:NET\s*(?:QTY|QUANTITY|WT|WEIGHT|VOLUME|CONTENT)?|N\.?\s*WT\.?)\s*[:.\-]?\s*[0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|ml|l|ltr|pcs|units|u|N)\b/i.test(text) ||
      /\b[0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|ml|l|ltr|pcs|units)\b/i.test(text)) {
    patternBonus += 40;
  }
  // Date pattern (Mfg / Expiry)
  if (/\b(?:0[1-9]|1[0-2]|[1-9])[\/\.\-](?:20\d\d|\d{2})\b/.test(text) || /\b(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*20\d\d/i.test(text)) {
    patternBonus += 25;
  }
  // Batch or FSSAI pattern
  if (/\b(?:BATCH|LOT|B\.NO|FSSAI|LIC)\b/i.test(upper) || /\b1\d{13}\b/.test(text)) {
    patternBonus += 25;
  }

  // 4. OCR Confidence weighting
  const confScore = (confidence || 0) * 0.4;

  return keywordScore + wordScore + patternBonus + confScore;
}

function detectStatutoryAnchors(text) {
  if (!text || typeof text !== 'string') return [];
  const upper = text.toUpperCase();
  const anchors = [];

  const checks = [
    { name: 'MRP', test: /(?:MRP|M\.?R\.?P|MAX(?:IMUM)?\s*RETAIL|RS\.?|₹)/i },
    { name: 'Net Quantity', test: /(?:NET\s*(?:QTY|QUANTITY|WT|WEIGHT|VOLUME|CONTENT)?|N\.?\s*WT\.?)\b|\b(?:KG|GMS?|GM|ML|LTR|PCS|UNITS)\b/i },
    { name: 'FSSAI', test: /(?:FSSAI|LIC\s*NO|LICENCE\s*NO|LIC\.\s*NO)\b|\b1\d{13}\b/i },
    { name: 'Batch', test: /(?:BATCH|LOT|B\.NO|BATCH\s*NO)\b/i },
    { name: 'MFD', test: /(?:MFD|MFG|PACKED|PKD|DATE\s*OF\s*MFG|DATE\s*OF\s*PACKING)\b/i },
    { name: 'Best Before', test: /(?:BEST\s*BEFORE|EXPIRY|EXP\s*DATE|USE\s*BY)\b/i },
    { name: 'Customer Care', test: /(?:CUSTOMER\s*CARE|CONSUMER\s*CARE|FEEDBACK|TOLL\s*FREE|HELPLINE)\b/i },
    { name: 'Manufacturer', test: /(?:MANUFACTURED\s*(?:BY|FOR)|MFD\.?\s*(?:BY|FOR)|MFG\.?\s*(?:BY|FOR)|PACKED\s*BY|PKD\.?\s*BY|MARKETED\s*BY|MKTD\.?\s*BY)\b/i },
  ];

  for (const c of checks) {
    if (c.test.test(upper)) {
      anchors.push(c.name);
    }
  }
  return anchors;
}

const { extractDeclarationsFromText, normalizeOcrText } = require('./extractionEngine.js');
const { extractSpatialDeclarations } = require('./spatialExtractionEngine.js');
const {
  createOverlappingRegions,
  shiftWordsToGlobal,
  mergeWordLists,
  reconstructLinesFromWords,
  findTargetTermMatches,
} = require('./multiRegionOcrEngine.js');

function extractGeometryFromOcrData(data) {
  const words = [];
  const lines = [];

  // 1. Direct top-level arrays (if present)
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

  // 2. Traversal through blocks hierarchy (Tesseract.js v5/v6/v7)
  if (words.length === 0 && Array.isArray(data?.blocks)) {
    for (const block of data.blocks) {
      const paragraphs = block.paragraphs || [];
      for (const para of paragraphs) {
        const pLines = para.lines || [];
        for (const line of pLines) {
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

          const lineWords = line.words || [];
          for (const w of lineWords) {
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
}

/**
 * Calculates sharpness (Laplacian variance) and brightness from an image buffer
 */
async function calculateImageQualityMetrics(sharpInstance, width, height) {
  try {
    const sampleW = 320;
    const sampleH = Math.round((height / width) * sampleW);
    const raw = await sharpInstance.clone().resize(sampleW, sampleH).grayscale().raw().toBuffer();

    let sum = 0, sumSq = 0, count = 0, lumSum = 0;
    for (let y = 1; y < sampleH - 1; y++) {
      const rowOffset = y * sampleW;
      const upOffset = (y - 1) * sampleW;
      const downOffset = (y + 1) * sampleW;

      for (let x = 1; x < sampleW - 1; x++) {
        const val = raw[rowOffset + x];
        lumSum += val;
        const up = raw[upOffset + x];
        const down = raw[downOffset + x];
        const left = raw[rowOffset + (x - 1)];
        const right = raw[rowOffset + (x + 1)];

        const lap = up + down + left + right - 4 * val;
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    const variance = count > 0 ? (sumSq / count) - ((sum / count) ** 2) : 0;
    const brightness = count > 0 ? lumSum / count : 128;

    return {
      sharpness: Math.round(variance * 10) / 10,
      brightness: Math.round(brightness * 10) / 10,
    };
  } catch (err) {
    return { sharpness: 0, brightness: 128 };
  }
}

/**
 * Net Quantity Fallback Rule:
 * 1. Look for number+unit (g, kg, ml, l, gm, litre) within same line or next line after
 *    label like "NET WT", "NET QTY", "NET QUANTITY", "NET CONTENT", "NET WEIGHT".
 * 2. Number+unit must be a whole token: unit not preceded/followed by other letters.
 * 3. Fall back to unlabeled number+unit only if exactly one exists and number >= 5 (for g/ml)
 *    or otherwise plausible. If 2+ candidates, return "Not detected".
 * 4. Otherwise return "Not detected".
 */
function extractNetQuantityFallback(text) {
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

  // Exactly one candidate
  if (candidates.length === 1) {
    return candidates[0].formatted;
  }

  // 4. Return "Not detected" if 0 or 2+ candidates
  return 'Not detected';
}

app.post('/api/ocr/analyze', async (req, res) => {
  const startTime = Date.now();
  try {
    const { image, originalImage, clientQualityDebug } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    console.log('[OCR] Received image for analysis. Preparing advanced multi-variant preprocessing pipeline...');
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // 1. Inspect image dimensions and normalize EXIF orientation
    // Calling .rotate() with no parameters auto-rotates based on EXIF tag from smartphone cameras
    const baseSharp = sharp(inputBuffer).rotate();
    const meta = await baseSharp.metadata();
    const width = meta.width || 1280;
    const height = meta.height || 720;
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);

    // Calculate server-side image quality metrics
    const serverQuality = await calculateImageQualityMetrics(baseSharp, width, height);

    // 2. High-Quality Upscale (Phase 4): enlarge ~2x where practical for small packaging fonts
    let resizePipeline = baseSharp;
    let upscaleApplied = false;
    let ocrW = width;
    let ocrH = height;

    if (maxDim <= 2000) {
      ocrW = width * 2;
      ocrH = height * 2;
      resizePipeline = resizePipeline.resize(ocrW, ocrH, { kernel: 'lanczos3' });
      upscaleApplied = true;
    } else if (maxDim < 2800) {
      const scale = Math.min(2.0, 2800 / maxDim);
      if (scale > 1.08) {
        ocrW = Math.round(width * scale);
        ocrH = Math.round(height * scale);
        resizePipeline = resizePipeline.resize(ocrW, ocrH, { kernel: 'lanczos3' });
        upscaleApplied = true;
      }
    }

    const imageQualityDebug = {
      selectedFrame: clientQualityDebug?.selectedFrame || 1,
      sharpness: clientQualityDebug?.sharpness || serverQuality.sharpness,
      brightness: clientQualityDebug?.brightness || serverQuality.brightness,
      original: clientQualityDebug?.original || `${width}x${height}`,
      ocrImage: `${ocrW}x${ocrH}`,
      cropApplied: Boolean(clientQualityDebug?.cropApplied),
      upscaleApplied: upscaleApplied || Boolean(clientQualityDebug?.upscaleApplied),
    };

    console.log(`[OCR Image Quality Debug]`, imageQualityDebug);

    // 3. Build Candidate 1: Grayscale + Dynamic Range Normalization + Moderate Sharpening
    // Note: avoid tiny median filters or micro-CLAHE patches that erode punctuation or small fonts
    const baseEnhancedBuffer = await resizePipeline
      .clone()
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.0, m1: 1.2, m2: 0.5 })
      .toBuffer();

    const worker = await getOcrWorker('3'); // Fully automatic page segmentation (PSM 3)

    // 4. Orientation Testing (0°, 90°, 180°, 270°)
    // Real packages are often placed sideways or photographed in landscape
    const orientations = [
      { angle: 0, label: '0° standard' },
      { angle: 90, label: '90° clockwise (sideways package)' },
      { angle: 180, label: '180° inverted' },
      { angle: 270, label: '270° counter-clockwise (sideways package)' },
    ];

    let variantsTestedCount = 0;
    const orientationCandidates = [];

    for (const orient of orientations) {
      variantsTestedCount++;
      let candidateBuffer = baseEnhancedBuffer;
      if (orient.angle !== 0) {
        candidateBuffer = await sharp(baseEnhancedBuffer).rotate(orient.angle).toBuffer();
      }

      const ocrPass = await worker.recognize(candidateBuffer, {}, { text: true, blocks: true });
      const passText = ocrPass.data.text || '';
      const passConf = Math.round(ocrPass.data.confidence || 0);
      const passScore = scoreOcrCandidate(passText, passConf);
      const geom = extractGeometryFromOcrData(ocrPass.data);
      const detectedAnchors = detectStatutoryAnchors(passText);

      console.log(`[OCR Pass] ${orient.label} -> Score: ${passScore}, Conf: ${passConf}%, Words: ${geom.words.length}, Lines: ${geom.lines.length}, Anchors: [${detectedAnchors.join(', ')}]`);

      orientationCandidates.push({
        orientation: `${orient.angle}°`,
        angle: orient.angle,
        label: orient.label,
        ocrScore: passScore,
        ocrConfidence: passConf,
        wordCount: geom.words.length,
        lineCount: geom.lines.length,
        detectedStatutoryAnchors: detectedAnchors,
        rawText: passText,
        words: geom.words,
        lines: geom.lines,
      });
    }

    // Select highest-scoring candidate AFTER all orientations have been evaluated
    let winningCandidate = orientationCandidates[0];
    for (const cand of orientationCandidates) {
      if (cand.ocrScore > winningCandidate.ocrScore) {
        winningCandidate = cand;
      }
    }

    let bestResult = {
      score: winningCandidate.ocrScore,
      rawText: winningCandidate.rawText,
      confidence: winningCandidate.ocrConfidence,
      variantName: `${winningCandidate.label} + grayscale + contrast normalize + sharpening`,
      angle: winningCandidate.angle,
      psmMode: '3 (Automatic)',
      words: winningCandidate.words,
      lines: winningCandidate.lines,
    };

    console.log(`[OCR Winner] Selected ${winningCandidate.orientation} (${winningCandidate.label}) -> Score: ${winningCandidate.ocrScore}, Conf: ${winningCandidate.ocrConfidence}% after evaluating all ${orientations.length} orientations.`);

    // 5. Test High-Contrast Binarized Thresholding at the winning orientation
    // Useful for shiny packaging, reflection gradients, or colored labels
    if (bestResult.score < 110) {
      try {
        variantsTestedCount++;
        const thresholdedBuffer = await sharp(baseEnhancedBuffer)
          .rotate(bestResult.angle || 0)
          .threshold(135, { grayscale: true })
          .toBuffer();

        const threshPass = await worker.recognize(thresholdedBuffer, {}, { text: true, blocks: true });
        const threshText = threshPass.data.text || '';
        const threshConf = Math.round(threshPass.data.confidence || 0);
        const threshScore = scoreOcrCandidate(threshText, threshConf);

        console.log(`[OCR Threshold Pass] Angle ${bestResult.angle}° -> Score: ${threshScore}, Conf: ${threshConf}%`);

        if (threshScore > bestResult.score) {
          console.log(`[OCR Threshold Pass] Thresholded variant outperformed previous best: ${threshScore} vs ${bestResult.score}`);
          const geom = extractGeometryFromOcrData(threshPass.data);
          bestResult = {
            score: threshScore,
            rawText: threshText,
            confidence: threshConf,
            variantName: `${bestResult.angle}° rotated + high-contrast binarized threshold`,
            angle: bestResult.angle,
            psmMode: '3 (Automatic)',
            words: geom.words,
            lines: geom.lines,
          };
        }
      } catch (threshErr) {
        console.warn('[OCR Threshold Pass] Threshold check skipped:', threshErr.message);
      }
    }

    // 6. Test Inverted Thresholding if text might be white/light on dark packaging (e.g. dark blue/black bags)
    if (bestResult.score < 80) {
      try {
        variantsTestedCount++;
        const invertedBuffer = await sharp(baseEnhancedBuffer)
          .rotate(bestResult.angle || 0)
          .threshold(135, { grayscale: true })
          .negate({ alpha: false })
          .toBuffer();

        const invertPass = await worker.recognize(invertedBuffer, {}, { text: true, blocks: true });
        const invertText = invertPass.data.text || '';
        const invertConf = Math.round(invertPass.data.confidence || 0);
        const invertScore = scoreOcrCandidate(invertText, invertConf);

        console.log(`[OCR Inverted Pass] Angle ${bestResult.angle}° -> Score: ${invertScore}, Conf: ${invertConf}%`);

        if (invertScore > bestResult.score) {
          console.log(`[OCR Inverted Pass] Inverted variant outperformed: ${invertScore} vs ${bestResult.score}`);
          const geom = extractGeometryFromOcrData(invertPass.data);
          bestResult = {
            score: invertScore,
            rawText: invertText,
            confidence: invertConf,
            variantName: `${bestResult.angle}° rotated + inverted dark-mode threshold`,
            angle: bestResult.angle,
            psmMode: '3 (Automatic)',
            words: geom.words,
            lines: geom.lines,
          };
        }
      } catch (invertErr) {
        console.warn('[OCR Inverted Pass] Inverted check skipped:', invertErr.message);
      }
    }

    // 7. Sparse Text PSM (PSM 11) fallback if confidence/words remain low on multi-column label
    if (bestResult.score < 60) {
      try {
        variantsTestedCount++;
        const sparseWorker = await getOcrWorker('11'); // PSM 11: Sparse text
        let candidateBuffer = baseEnhancedBuffer;
        if (bestResult.angle !== 0) {
          candidateBuffer = await sharp(baseEnhancedBuffer).rotate(bestResult.angle).toBuffer();
        }

        const sparsePass = await sparseWorker.recognize(candidateBuffer, {}, { text: true, blocks: true });
        const sparseText = sparsePass.data.text || '';
        const sparseConf = Math.round(sparsePass.data.confidence || 0);
        const sparseScore = scoreOcrCandidate(sparseText, sparseConf);

        console.log(`[OCR Sparse PSM 11 Pass] Score: ${sparseScore}, Conf: ${sparseConf}%`);

        if (sparseScore > bestResult.score) {
          const geom = extractGeometryFromOcrData(sparsePass.data);
          bestResult = {
            score: sparseScore,
            rawText: sparseText,
            confidence: sparseConf,
            variantName: `${bestResult.angle}° rotated + sparse text mode (PSM 11)`,
            angle: bestResult.angle,
            psmMode: '11 (Sparse text)',
            words: geom.words,
            lines: geom.lines,
          };
        }
        // Reset worker to PSM 3
        await getOcrWorker('3');
      } catch (psmErr) {
        console.warn('[OCR Sparse Pass] Skipped:', psmErr.message);
      }
    }

    // ============================================================
    // PHASE 5A: MULTI-REGION OCR WITH GEOMETRY MERGING
    // ============================================================
    console.log('[Phase 5A] Initiating overlapping multi-region OCR passes...');
    let workingImageBuffer = baseEnhancedBuffer;
    if (bestResult.angle !== 0) {
      workingImageBuffer = await sharp(baseEnhancedBuffer).rotate(bestResult.angle).toBuffer();
    }
    const workingMeta = await sharp(workingImageBuffer).metadata();
    const workingW = workingMeta.width || ocrW;
    const workingH = workingMeta.height || ocrH;

    const regions = createOverlappingRegions(workingW, workingH);
    const regionReports = [
      {
        name: 'full-image',
        x: 0,
        y: 0,
        width: workingW,
        height: workingH,
        wordCount: bestResult.words.length,
        confidence: bestResult.confidence,
      },
    ];

    const allRegionalWords = [];
    for (const r of regions) {
      try {
        const tileBuffer = await sharp(workingImageBuffer)
          .extract({ left: r.x, top: r.y, width: r.width, height: r.height })
          .toBuffer();

        const tilePass = await worker.recognize(tileBuffer, {}, { text: true, blocks: true });
        const tileGeom = extractGeometryFromOcrData(tilePass.data);
        const tileWordsGlobal = shiftWordsToGlobal(tileGeom.words, r.x, r.y, r.name);

        regionReports.push({
          name: r.name,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          wordCount: tileWordsGlobal.length,
          confidence: Math.round(tilePass.data.confidence || 0),
        });

        console.log(`[Phase 5A Region] "${r.name}" (${r.width}x${r.height} at [${r.x},${r.y}]) -> ${tileWordsGlobal.length} words (conf: ${tilePass.data.confidence}%)`);
        allRegionalWords.push(...tileWordsGlobal);
      } catch (tileErr) {
        console.warn(`[Phase 5A Region] Tile "${r.name}" skipped:`, tileErr.message);
      }
    }

    // Merge full-image words with regional words + deduplication
    const fullImageWords = bestResult.words.map((w) => ({
      ...w,
      sourceRegion: 'full-image',
    }));

    const { mergedWords, duplicatesRemoved } = mergeWordLists(fullImageWords, allRegionalWords);
    const mergedLines = reconstructLinesFromWords(mergedWords, bestResult.lines);

    console.log(`[Phase 5A Merge] ${fullImageWords.length} full + ${allRegionalWords.length} regional words -> ${mergedWords.length} merged words (${duplicatesRemoved} duplicates removed, ${mergedLines.length} lines)`);

    // Diagnostic matches for Net Quantity and target terms
    const netQuantityOCRCandidates = mergedWords
      .filter((w) => /NET|WT|QTY|QUANTITY|200|GMS?|GRAM|WEIGHT/i.test(w.text))
      .map((w) => ({ text: w.text, conf: w.confidence, bbox: w.bbox }));

    const targetDiagnostic = findTargetTermMatches(mergedWords, mergedLines);

    const multiRegionDebug = {
      fullImageWords: fullImageWords.length,
      regionalWords: allRegionalWords.length,
      mergedWords: mergedWords.length,
      duplicateWordsRemoved: duplicatesRemoved,
      regionsProcessed: regionReports,
      netQuantityOCRCandidates,
      targetDiagnostic,
    };

    const durationMs = Date.now() - startTime;
    const extractedFields = extractDeclarationsFromText(bestResult.rawText, bestResult.confidence);
    const spatialFields = extractSpatialDeclarations({ words: mergedWords, lines: mergedLines });

    // Net Quantity fallback rule:
    // 1. Look for number+unit (g, kg, ml, l, gm, litre) on same line or next line after label (NET WT, NET QTY, etc.)
    // 2. Number+unit must be a whole token (not preceded/followed by letters)
    // 3. Fall back to unlabeled candidate only if exactly one exists and number >= 5 (for g/ml) or plausible
    // 4. Otherwise return "Not detected"
    if (!spatialFields.netQuantity || !spatialFields.netQuantity.value || spatialFields.netQuantity.value === 'Not detected') {
      const netFallback = extractNetQuantityFallback(bestResult.rawText);
      if (netFallback !== 'Not detected') {
        spatialFields.netQuantity = {
          value: netFallback,
          status: 'Detected',
          confidence: 'MEDIUM',
          source: netFallback,
        };
      }
    }

    const detectedCount = Object.keys(extractedFields).filter(
      (k) => extractedFields[k] && extractedFields[k].value && extractedFields[k].value !== 'Not detected'
    ).length;

    console.log(`[OCR Complete in ${durationMs}ms] Selected: "${bestResult.variantName}" (${bestResult.confidence}% conf, Spatial MRP: ${spatialFields.mrp.value}, NetQty: ${spatialFields.netQuantity.value}, FSSAI: ${spatialFields.fssaiNumber.value}, Batch: ${spatialFields.batch.value}, MfgDate: ${spatialFields.manufacturingDate.value}, BestBefore: ${spatialFields.bestBefore.value})`);

    // ============================================================
    // LIVE OCR DEBUG INSTRUMENTATION (Diagnostic analysis only)
    // ============================================================
    const searchTerms = [
      'BATCH',
      'B20260915',
      'MFD',
      '15/09/2026',
      'BEST BEFORE',
      'SIX MONTHS',
      'MRP',
      '60.00',
      'NET WT',
      '200 g',
      'MANUFACTURED',
      'PARLE BISCUITS',
    ];

    const termAnalysis = searchTerms.map((term) => {
      const upperTerm = term.toUpperCase();
      const inRaw = bestResult.rawText.toUpperCase().includes(upperTerm);
      const matchingLines = bestResult.lines.filter((l) => l.text.toUpperCase().includes(upperTerm));
      const matchingWords = bestResult.words.filter((w) => w.text.toUpperCase().includes(upperTerm));

      let classification = 'A. completely missing from OCR';
      if (inRaw) {
        if (matchingWords.length > 0 || matchingLines.length > 0) {
          classification = 'Present in OCR';
        } else {
          classification = 'B. present but split across words/lines';
        }
      } else {
        const cleanTerm = upperTerm.replace(/[^A-Z0-9]/g, '');
        const cleanRaw = bestResult.rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleanTerm.length >= 3 && cleanRaw.includes(cleanTerm)) {
          classification = 'B. present but split across punctuation/whitespace';
        } else {
          const part1 = cleanTerm.slice(0, Math.ceil(cleanTerm.length / 2));
          if (part1.length >= 3 && cleanRaw.includes(part1)) {
            classification = 'C. present with OCR character errors';
          }
        }
      }

      return {
        term,
        inRaw,
        classification,
        matchingLines: matchingLines.map((l) => ({ text: l.text, bbox: l.bbox, conf: l.confidence })),
        matchingWords: matchingWords.map((w) => ({ text: w.text, bbox: w.bbox, conf: w.confidence })),
      };
    });

    const liveDebugDump = {
      timestamp: new Date().toISOString(),
      variant: bestResult.variantName,
      selectedOrientation: `${bestResult.angle}°`,
      orientationScores: {
        '0°': (orientationCandidates.find((c) => c.angle === 0) || {}).ocrScore ?? 0,
        '90°': (orientationCandidates.find((c) => c.angle === 90) || {}).ocrScore ?? 0,
        '180°': (orientationCandidates.find((c) => c.angle === 180) || {}).ocrScore ?? 0,
        '270°': (orientationCandidates.find((c) => c.angle === 270) || {}).ocrScore ?? 0,
      },
      orientationEvaluations: orientationCandidates.map((c) => ({
        orientation: c.orientation,
        angle: c.angle,
        label: c.label,
        ocrScore: c.ocrScore,
        ocrConfidence: c.ocrConfidence,
        wordCount: c.wordCount,
        lineCount: c.lineCount,
        detectedStatutoryAnchors: c.detectedStatutoryAnchors,
      })),
      rawText: bestResult.rawText,
      confidence: bestResult.confidence,
      lineCount: bestResult.lines.length,
      wordCount: bestResult.words.length,
      lines: bestResult.lines,
      words: bestResult.words,
      termAnalysis,
      spatialFields,
      oldParserExtractedFields: extractedFields,
    };

    try {
      const scratchDir = path.join(__dirname, '../scratch');
      if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
      fs.writeFileSync(path.join(scratchDir, 'latest_live_ocr_dump.json'), JSON.stringify(liveDebugDump, null, 2), 'utf8');
      const evidenceBuffer = originalImage
        ? Buffer.from(originalImage.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        : inputBuffer;
      if (evidenceBuffer.length > 200000) {
        fs.writeFileSync(path.join(scratchDir, 'latest_live_image.jpg'), evidenceBuffer);
      }
      console.log(`[DEBUG LIVE OCR] Successfully saved live capture image and dump to scratch/latest_live_ocr_dump.json`);
    } catch (e) {
      console.warn('[DEBUG LIVE OCR] Write dump failed:', e.message);
    }

    res.json({
      orientationScores: {
        '0°': (orientationCandidates.find((c) => c.angle === 0) || {}).ocrScore ?? 0,
        '90°': (orientationCandidates.find((c) => c.angle === 90) || {}).ocrScore ?? 0,
        '180°': (orientationCandidates.find((c) => c.angle === 180) || {}).ocrScore ?? 0,
        '270°': (orientationCandidates.find((c) => c.angle === 270) || {}).ocrScore ?? 0,
      },
      orientationEvaluations: orientationCandidates.map((c) => ({
        orientation: c.orientation,
        angle: c.angle,
        label: c.label,
        ocrScore: c.ocrScore,
        ocrConfidence: c.ocrConfidence,
        wordCount: c.wordCount,
        lineCount: c.lineCount,
        detectedStatutoryAnchors: c.detectedStatutoryAnchors,
      })),
      rawText: bestResult.rawText,
      confidence: bestResult.confidence,
      selectedVariant: bestResult.variantName,
      ocrVariant: bestResult.variantName,
      processingTimeMs: durationMs,
      variantsTested: variantsTestedCount,
      psmMode: bestResult.psmMode,
      words: mergedWords,
      lines: mergedLines,
      wordCount: mergedWords.length,
      lineCount: mergedLines.length,
      fullImageWords: multiRegionDebug.fullImageWords,
      regionalWords: multiRegionDebug.regionalWords,
      mergedWords: multiRegionDebug.mergedWords,
      duplicateWordsRemoved: multiRegionDebug.duplicateWordsRemoved,
      regionsProcessed: multiRegionDebug.regionsProcessed,
      netQuantityOCRCandidates: multiRegionDebug.netQuantityOCRCandidates,
      multiRegionDebug,
      imageQualityDebug,
      ocr: {
        text: bestResult.rawText,
        confidence: bestResult.confidence,
        variant: bestResult.variantName,
        wordCount: mergedWords.length,
        words: mergedWords,
      },
      comparison: {
        oldParser: {
          mrp: extractedFields.mrp?.value || 'Not detected',
          netQuantity: extractedFields.netQuantity?.value || 'Not detected',
          fssaiNumber: extractedFields.fssaiNumber?.value || 'Not detected',
          fssaiCount: extractedFields.fssaiLicenses?.length || 0,
        },
        spatialParser: {
          mrp: spatialFields.mrp.value,
          netQuantity: spatialFields.netQuantity.value,
          fssaiNumber: spatialFields.fssaiNumber.value,
          fssaiLicenses: spatialFields.fssaiLicenses.map((l) => ({
            licenseNumber: l.licenseNumber,
            unitCode: l.unitCode,
            role: l.role,
            source: l.source,
          })),
          manufacturers: spatialFields.manufacturers,
          manufacturersCount: spatialFields.manufacturers.length,
          manufacturedFor: spatialFields.manufacturedFor,
          packers: spatialFields.packers,
          marketers: spatialFields.marketers,
          customerCare: spatialFields.customerCare,
          batch: spatialFields.batch,
          manufacturingDate: spatialFields.manufacturingDate,
          bestBefore: spatialFields.bestBefore,
          status: {
            mrp: spatialFields.mrp.status,
            netQuantity: spatialFields.netQuantity.status,
            fssaiNumber: spatialFields.fssaiNumber.status,
            manufacturers: spatialFields.manufacturers.length > 0 ? 'Detected' : 'Not detected',
            manufacturedFor: spatialFields.manufacturedFor ? 'Detected' : 'Not detected',
            customerCare: spatialFields.customerCare ? 'Detected' : 'Not detected',
            batch: spatialFields.batch.status,
            manufacturingDate: spatialFields.manufacturingDate.status,
            bestBefore: spatialFields.bestBefore.status,
          },
        },
      },
      spatialFields: {
        mrp: spatialFields.mrp,
        netQuantity: spatialFields.netQuantity,
        fssaiNumber: spatialFields.fssaiNumber,
        fssaiLicenses: spatialFields.fssaiLicenses,
        manufacturers: spatialFields.manufacturers,
        manufacturedFor: spatialFields.manufacturedFor,
        packers: spatialFields.packers,
        marketers: spatialFields.marketers,
        customerCare: spatialFields.customerCare,
        batch: spatialFields.batch,
        manufacturingDate: spatialFields.manufacturingDate,
        bestBefore: spatialFields.bestBefore,
      },
      spatialDebug: spatialFields.debug,
      extractedFields,
      detectedCount,
    });
  } catch (err) {
    console.error('[OCR Error] Failed in preprocessing/recognition:', err);
    res.status(500).json({
      error: 'OCR processing failed',
      details: err.message,
      processingTimeMs: Date.now() - startTime,
    });
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      socket.user = decoded;
      socket.userId = decoded.id;
    }
  }
  next();
});

io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id} (User: ${socket.userId || 'unauthenticated'})`);

  // Auto-join authenticated user's private channel if token was provided in handshake
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
    console.log(`[Socket] Joined user room: user:${socket.userId}`);
  }

  // Handle client runtime authentication / identity declaration
  socket.on('auth:identify', ({ token, user }) => {
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        socket.user = decoded;
        socket.userId = decoded.id;
        socket.join(`user:${decoded.id}`);
        console.log(`[Socket] Identified user ${decoded.name} (${decoded.id}) -> joined user:${decoded.id}`);

        // Announce device connection to any stations under this user's account
        io.to(`user:${decoded.id}`).emit('device:connected', {
          sessionId: 'AUTH-USER-' + decoded.id,
          device: {
            name: `${decoded.name} (Mobile Field Unit)`,
            model: 'Authenticated Mobile Scanner',
          },
          connectedAt: new Date().toLocaleTimeString(),
        });
      }
    }
  });

  // 1. Laptop station registers/starts session
  socket.on('session:init', ({ sessionId }) => {
    if (!sessionId) return;
    socket.join(sessionId);

    const existing = sessions.get(sessionId) || {};
    const updated = {
      ...existing,
      laptopSocketId: socket.id,
      createdAt: existing.createdAt || new Date(),
    };
    sessions.set(sessionId, updated);
    console.log(`[Session Init] Laptop joined session: ${sessionId}`);

    // If mobile is already connected to this session, announce to laptop immediately!
    if (updated.phoneSocketId && updated.device) {
      socket.emit('device:connected', {
        sessionId,
        device: updated.device,
        connectedAt: new Date().toLocaleTimeString(),
      });
    } else {
      socket.emit('session:ready', { sessionId, status: 'Waiting for mobile scanner' });
    }
  });

  // 2. Mobile scanner connects via QR code
  socket.on('session:join', ({ sessionId, deviceInfo }) => {
    if (!sessionId) return;
    socket.join(sessionId);

    const session = sessions.get(sessionId) || {};
    // Cancel any pending disconnect grace timer
    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
      session.disconnectTimer = null;
    }

    session.phoneSocketId = socket.id;
    session.device = deviceInfo || session.device || {
      name: 'Mobile Scanner Unit',
      model: 'Handheld Scanner',
    };
    sessions.set(sessionId, session);

    console.log(`[Session Connected] Mobile joined session: ${sessionId}`);

    // Notify the laptop station in this room that device is CONNECTED!
    io.to(sessionId).emit('device:connected', {
      sessionId,
      device: session.device,
      connectedAt: new Date().toLocaleTimeString(),
    });

    // Notify the mobile phone that pairing succeeded
    socket.emit('session:joined_success', {
      sessionId,
      status: 'Connected to Laptop Station',
    });
  });

  // 3. Mobile submits a scan package
  socket.on('scan:submit', ({ sessionId, scanData }) => {
    const userId = socket.userId || scanData?.userId;
    console.log(`[Scan Submitted] Session: ${sessionId || 'none'}, User: ${userId || 'anonymous'}, Product: ${scanData?.productName}`);
    try {
      const scratchDir = path.join(__dirname, '../scratch');
      if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
      fs.writeFileSync(path.join(scratchDir, 'latest_scan_submitted.json'), JSON.stringify(scanData, null, 2), 'utf8');
      if (scanData?.evidenceImageUrl) {
        const b64 = scanData.evidenceImageUrl.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(path.join(scratchDir, 'latest_submitted_image.jpg'), Buffer.from(b64, 'base64'));
      }
    } catch (e) {
      console.warn('[Scan Submitted Save Error]:', e.message);
    }

    // Broadcast scan to user-specific channel (for persistent authenticated pairing)
    if (userId) {
      io.to(`user:${userId}`).emit('scan:received', scanData);
      io.to(`user:${userId}`).emit('device:connected', {
        sessionId: sessionId || 'AUTH-USER-' + userId,
        device: {
          name: socket.user?.name ? `${socket.user.name} (Field Unit)` : 'Mobile Scanner Unit',
          model: 'Authenticated Mobile Scanner',
        },
        connectedAt: new Date().toLocaleTimeString(),
      });
    }

    // Broadcast scan to laptop station via session room if specified
    if (sessionId) {
      io.to(sessionId).emit('scan:received', scanData);
    }
    // Global broadcast for station listeners
    io.emit('scan:received', scanData);
  });

  // 4. Disconnect handling with 10-second Grace Period for mobile reconnection
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ${socket.id}`);
    for (const [sessionId, session] of sessions.entries()) {
      if (session.phoneSocketId === socket.id) {
        session.phoneSocketId = null;
        // Give phone a 10s grace period to reconnect (e.g. while camera app is open or heavy POST executes)
        session.disconnectTimer = setTimeout(() => {
          if (session.phoneSocketId === null) {
            session.device = null;
            io.to(sessionId).emit('device:disconnected', { sessionId });
            console.log(`[Session Disconnect] Mobile confirmed left session: ${sessionId}`);
          }
        }, 10000);
      } else if (session.laptopSocketId === socket.id) {
        // Laptop disconnected: keep session alive briefly in case of quick page reload
        setTimeout(() => {
          const s = sessions.get(sessionId);
          if (s && s.laptopSocketId === socket.id) {
            sessions.delete(sessionId);
          }
        }, 15000);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`\n========================================`);
  console.log(`  LegalMetriScan Backend Server Running  `);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIp}:${PORT}`);
  console.log(`  Vite UI: http://${localIp}:${VITE_PORT}`);
  console.log(`========================================\n`);
});
