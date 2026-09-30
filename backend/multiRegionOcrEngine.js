/**
 * Multi-Region OCR with Geometry Merging Engine (Phase 5A)
 *
 * Implements:
 * 1. Overlapping region tiles (upper-left, upper-right, lower-left, lower-right)
 *    with ~15-20% overlap on the working OCR image.
 * 2. Local-to-global coordinate transformation preserving original image space.
 * 3. Geometry deduplication merging full-image OCR + regional OCR words.
 * 4. Spatial line reconstruction preserving top-to-bottom and left-to-right order.
 * 5. Diagnostic reporting for statutory target terms.
 */

function cleanWordText(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Creates 4 overlapping quadrant regions covering the working image
 * with approximately 16% overlap between neighbors.
 */
function createOverlappingRegions(imageWidth, imageHeight) {
  const overlapRatio = 0.58; // 58% width/height yields 16% center overlap
  const tileW = Math.round(imageWidth * overlapRatio);
  const tileH = Math.round(imageHeight * overlapRatio);

  return [
    {
      name: 'upper-left',
      x: 0,
      y: 0,
      width: tileW,
      height: tileH,
    },
    {
      name: 'upper-right',
      x: imageWidth - tileW,
      y: 0,
      width: tileW,
      height: tileH,
    },
    {
      name: 'lower-left',
      x: 0,
      y: imageHeight - tileH,
      width: tileW,
      height: tileH,
    },
    {
      name: 'lower-right',
      x: imageWidth - tileW,
      y: imageHeight - tileH,
      width: tileW,
      height: tileH,
    },
  ];
}

/**
 * Transforms word tokens from local tile coordinates to original global coordinates
 */
function shiftWordsToGlobal(words, offsetX, offsetY, regionName) {
  if (!Array.isArray(words)) return [];

  return words.map((w) => ({
    text: w.text ? String(w.text).trim() : '',
    confidence: typeof w.confidence === 'number' ? Math.round(w.confidence) : 0,
    bbox: {
      x0: (w.bbox?.x0 ?? 0) + offsetX,
      y0: (w.bbox?.y0 ?? 0) + offsetY,
      x1: (w.bbox?.x1 ?? 0) + offsetX,
      y1: (w.bbox?.y1 ?? 0) + offsetY,
    },
    sourceRegion: regionName,
  })).filter((w) => w.text.length > 0);
}

/**
 * Evaluates whether two words represent the same physical text token
 */
function wordsAreDuplicates(w1, w2) {
  const b1 = w1.bbox;
  const b2 = w2.bbox;

  const h1 = b1.y1 - b1.y0;
  const h2 = b2.y1 - b2.y0;
  const avgH = (h1 + h2) / 2;

  const cx1 = (b1.x0 + b1.x1) / 2;
  const cy1 = (b1.y0 + b1.y1) / 2;
  const cx2 = (b2.x0 + b2.x1) / 2;
  const cy2 = (b2.y0 + b2.y1) / 2;

  // Words must sit on approximately the same horizontal line
  if (Math.abs(cy1 - cy2) > Math.max(avgH * 0.7, 15)) return false;

  const interX0 = Math.max(b1.x0, b2.x0);
  const interY0 = Math.max(b1.y0, b2.y0);
  const interX1 = Math.min(b1.x1, b2.x1);
  const interY1 = Math.min(b1.y1, b2.y1);

  const interArea = Math.max(0, interX1 - interX0) * Math.max(0, interY1 - interY0);
  if (interArea <= 0) return false;

  const a1 = (b1.x1 - b1.x0) * (b1.y1 - b1.y0);
  const a2 = (b2.x1 - b2.x0) * (b2.y1 - b2.y0);
  const ioMin = interArea / Math.min(a1, a2);
  const iou = interArea / (a1 + a2 - interArea);

  const t1 = cleanWordText(w1.text);
  const t2 = cleanWordText(w2.text);

  // Condition 1: Heavy physical overlap + Equivalent text
  if (ioMin > 0.35 || iou > 0.25) {
    if (t1 === t2 && t1.length > 0) return true;
    if (t1 && t2) {
      if (t1.includes(t2) || t2.includes(t1)) return true;
      if (Math.min(t1.length, t2.length) >= 3 && levenshtein(t1, t2) <= 1) return true;
    }
  }

  // Condition 2: Extreme ink collision occupying identical coordinates
  if (ioMin > 0.60 && Math.abs(cx1 - cx2) < Math.max(20, avgH * 0.7)) {
    return true;
  }

  return false;
}

/**
 * Combines full-image words with regional words, deduplicating overlapping detections
 * and retaining higher-confidence and more complete representations.
 */
function mergeWordLists(fullWords, regionalWords) {
  let merged = [...fullWords];
  let duplicatesCount = 0;

  for (const rw of regionalWords) {
    const overlappingIndices = [];
    for (let i = 0; i < merged.length; i++) {
      if (wordsAreDuplicates(merged[i], rw)) {
        overlappingIndices.push(i);
      }
    }

    if (overlappingIndices.length === 0) {
      merged.push(rw);
    } else if (overlappingIndices.length === 1) {
      duplicatesCount++;
      const idx = overlappingIndices[0];
      const existing = merged[idx];
      const tExist = cleanWordText(existing.text);
      const tNew = cleanWordText(rw.text);

      // If one word is a longer valid string containing the other (e.g. 10013022002253 vs 3022002253),
      // preserve the more complete declaration!
      if (tNew.length > tExist.length && tNew.includes(tExist)) {
        merged[idx] = rw;
      } else if (tExist.length > tNew.length && tExist.includes(tNew)) {
        // Keep existing longer word
      } else if (rw.confidence > existing.confidence) {
        merged[idx] = rw;
      }
    } else {
      // rw overlaps multiple words (e.g. compound word like BATCHNO: overlapping BATCH and NO.:)
      duplicatesCount += overlappingIndices.length;
      const overlappedWords = overlappingIndices.map((i) => merged[i]);
      const combinedExistText = cleanWordText(overlappedWords.map((w) => w.text).join(''));
      const tNew = cleanWordText(rw.text);

      if (tNew === combinedExistText || tNew.includes(combinedExistText) || combinedExistText.includes(tNew)) {
        merged = merged.filter((_, idx) => !overlappingIndices.includes(idx));
        merged.push(rw);
      } else {
        const maxExistConf = Math.max(...overlappedWords.map((w) => w.confidence));
        if (rw.confidence > maxExistConf) {
          merged = merged.filter((_, idx) => !overlappingIndices.includes(idx));
          merged.push(rw);
        }
      }
    }
  }

  return { mergedWords: merged, duplicatesRemoved: duplicatesCount };
}

/**
 * Reconstructs lines from global words, spatially ordered from top to bottom.
 * If primaryLines from the full-image OCR pass are provided, updates them with
 * the merged/higher-confidence tokens while seamlessly incorporating any newly
 * detected regional words.
 */
function reconstructLinesFromWords(words, primaryLines = null) {
  if (!words || words.length === 0) return [];

  if (Array.isArray(primaryLines) && primaryLines.length > 0) {
    const mergedRemaining = [...words];
    const updatedLines = [];

    for (const pLine of primaryLines) {
      const lineWords = [];
      const ly0 = pLine.bbox?.y0 ?? 0;
      const ly1 = pLine.bbox?.y1 ?? 0;
      const lHeight = Math.max(1, ly1 - ly0);
      const lCenter = (ly0 + ly1) / 2;

      for (let i = mergedRemaining.length - 1; i >= 0; i--) {
        const mw = mergedRemaining[i];
        const wy0 = mw.bbox.y0;
        const wy1 = mw.bbox.y1;
        const wHeight = Math.max(1, wy1 - wy0);
        const wCenter = (wy0 + wy1) / 2;

        const vOverlap = Math.max(0, Math.min(wy1, ly1) - Math.max(wy0, ly0));
        const overlapRatio = vOverlap / Math.min(wHeight, lHeight);

        // Check if word sits on this line and within horizontal line bounds (with small margin)
        if (overlapRatio > 0.4 && Math.abs(wCenter - lCenter) <= lHeight * 0.7) {
          if (mw.bbox.x0 >= (pLine.bbox.x0 - 60) && mw.bbox.x1 <= (pLine.bbox.x1 + 60)) {
            lineWords.push(mw);
            mergedRemaining.splice(i, 1);
          }
        }
      }

      if (lineWords.length > 0) {
        lineWords.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        const minX0 = Math.min(...lineWords.map((w) => w.bbox.x0));
        const minY0 = Math.min(...lineWords.map((w) => w.bbox.y0));
        const maxX1 = Math.max(...lineWords.map((w) => w.bbox.x1));
        const maxY1 = Math.max(...lineWords.map((w) => w.bbox.y1));
        const text = lineWords.map((w) => w.text).join(' ');
        const conf = Math.round(lineWords.reduce((s, w) => s + (w.confidence || 0), 0) / lineWords.length);
        updatedLines.push({
          text,
          confidence: conf,
          bbox: { x0: minX0, y0: minY0, x1: maxX1, y1: maxY1 },
          words: lineWords,
        });
      } else {
        updatedLines.push(pLine);
      }
    }

    // Attach any newly discovered orphan words from regional tiles
    if (mergedRemaining.length > 0) {
      const orphanLines = [];
      mergedRemaining.sort((a, b) => a.bbox.y0 - b.bbox.y0);
      for (const ow of mergedRemaining) {
        let matched = false;
        for (const ol of orphanLines) {
          const vOverlap = Math.max(0, Math.min(ow.bbox.y1, ol.bbox.y1) - Math.max(ow.bbox.y0, ol.bbox.y0));
          const oH = ol.bbox.y1 - ol.bbox.y0;
          if (vOverlap / Math.min(ow.bbox.y1 - ow.bbox.y0, oH) > 0.45) {
            ol.words.push(ow);
            ol.bbox.x0 = Math.min(ol.bbox.x0, ow.bbox.x0);
            ol.bbox.y0 = Math.min(ol.bbox.y0, ow.bbox.y0);
            ol.bbox.x1 = Math.max(ol.bbox.x1, ow.bbox.x1);
            ol.bbox.y1 = Math.max(ol.bbox.y1, ow.bbox.y1);
            matched = true;
            break;
          }
        }
        if (!matched) {
          orphanLines.push({
            words: [ow],
            bbox: { ...ow.bbox },
          });
        }
      }

      for (const ol of orphanLines) {
        ol.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        updatedLines.push({
          text: ol.words.map((w) => w.text).join(' '),
          confidence: Math.round(ol.words.reduce((s, w) => s + (w.confidence || 0), 0) / ol.words.length),
          bbox: ol.bbox,
          words: ol.words,
        });
      }
    }

    return updatedLines;
  }

  // Fallback: direct line reconstruction from raw words
  const sorted = [...words].sort((a, b) => {
    const yDiff = a.bbox.y0 - b.bbox.y0;
    if (Math.abs(yDiff) > 6) return yDiff;
    return a.bbox.x0 - b.bbox.x0;
  });

  const rawLines = [];

  for (const w of sorted) {
    const wy0 = w.bbox.y0;
    const wy1 = w.bbox.y1;
    const wCenter = (wy0 + wy1) / 2;
    const wHeight = Math.max(1, wy1 - wy0);

    let bestLine = null;
    let maxOverlap = 0;

    for (const line of rawLines) {
      const lHeight = line.avgHeight || (line.bbox.y1 - line.bbox.y0);
      const lCenter = (line.bbox.y0 + line.bbox.y1) / 2;

      const vOverlap = Math.max(0, Math.min(wy1, line.bbox.y1) - Math.max(wy0, line.bbox.y0));
      const overlapRatio = vOverlap / Math.min(wHeight, lHeight);

      if (overlapRatio > 0.45 && Math.abs(wCenter - lCenter) <= Math.min(wHeight, lHeight) * 0.7) {
        if (overlapRatio > maxOverlap) {
          maxOverlap = overlapRatio;
          bestLine = line;
        }
      }
    }

    if (bestLine) {
      bestLine.words.push(w);
      bestLine.bbox.x0 = Math.min(bestLine.bbox.x0, w.bbox.x0);
      bestLine.bbox.y0 = Math.min(bestLine.bbox.y0, w.bbox.y0);
      bestLine.bbox.x1 = Math.max(bestLine.bbox.x1, w.bbox.x1);
      bestLine.bbox.y1 = Math.max(bestLine.bbox.y1, w.bbox.y1);
      const totalH = bestLine.words.reduce((sum, item) => sum + (item.bbox.y1 - item.bbox.y0), 0);
      bestLine.avgHeight = totalH / bestLine.words.length;
    } else {
      rawLines.push({
        words: [w],
        bbox: { ...w.bbox },
        avgHeight: wHeight,
      });
    }
  }

  // Construct lines: sort words left-to-right
  const finalized = rawLines.map((line) => {
    line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const minX0 = Math.min(...line.words.map((w) => w.bbox.x0));
    const minY0 = Math.min(...line.words.map((w) => w.bbox.y0));
    const maxX1 = Math.max(...line.words.map((w) => w.bbox.x1));
    const maxY1 = Math.max(...line.words.map((w) => w.bbox.y1));

    const text = line.words.map((w) => w.text).join(' ');
    const confSum = line.words.reduce((sum, w) => sum + (w.confidence || 0), 0);
    const confidence = line.words.length > 0 ? Math.round(confSum / line.words.length) : 0;

    return {
      text,
      confidence,
      bbox: { x0: minX0, y0: minY0, x1: maxX1, y1: maxY1 },
      words: line.words,
    };
  });

  // Sort lines top-to-bottom
  finalized.sort((a, b) => a.bbox.y0 - b.bbox.y0);
  return finalized;
}

/**
 * Diagnostic helper checking for presence of statutory target terms in merged geometry
 */
function findTargetTermMatches(mergedWords, mergedLines) {
  const targetTerms = [
    'NET',
    'WT',
    '200',
    'g',
    'FSSAI',
    '10013022002253',
    'BATCH',
    'B20260915',
    'MFD',
    '15/09/2026',
    'BEST BEFORE',
  ];

  const results = {};

  for (const term of targetTerms) {
    const termUpper = term.toUpperCase();
    const inWords = mergedWords.some((w) => {
      const wt = (w.text || '').toUpperCase().trim();
      return wt === termUpper || wt.includes(termUpper) || (termUpper.includes(wt) && wt.length >= 3);
    });

    const inLines = mergedLines.some((l) => {
      const lt = (l.text || '').toUpperCase();
      return lt.includes(termUpper);
    });

    results[term] = inWords || inLines ? 'FOUND' : 'NOT FOUND';
  }

  return results;
}

module.exports = {
  cleanWordText,
  levenshtein,
  createOverlappingRegions,
  shiftWordsToGlobal,
  wordsAreDuplicates,
  mergeWordLists,
  reconstructLinesFromWords,
  findTargetTermMatches,
};
