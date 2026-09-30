/**
 * Camera Quality & Framing Stabilization Utilities (Phase 4)
 * 
 * Provides:
 * - Real-time Laplacian variance (sharpness / blur estimation)
 * - Average luminance (brightness / exposure estimation)
 * - Quality feedback thresholds (blurry warning, framing guidance)
 * - 3-frame rapid burst capture with best-frame selection
 * - Safe / conservative crop evaluator (never crops edges with declarations)
 * - 2x working image upscaler for fine text OCR
 */

/**
 * Computes average brightness (luminance) from ImageData
 * Range: 0 (pure black) to 255 (pure white)
 */
export function calculateBrightness(imageData) {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  if (totalPixels === 0) return 128;

  let sumLuminance = 0;
  // Step by 4 bytes (RGBA)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Standard Rec. 601 luma coefficients
    sumLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return Math.round((sumLuminance / totalPixels) * 10) / 10;
}

/**
 * Computes Laplacian variance (sharpness) from ImageData
 * Higher values = crisper edges & sharper text
 * Lower values (< 35) = blurred / out-of-focus / motion smear
 */
export function calculateSharpness(imageData) {
  const { data, width, height } = imageData;
  if (width < 3 || height < 3) return 0;

  // Convert to grayscale grid for fast convolution
  const gray = new Uint8Array(width * height);
  let gIdx = 0;
  for (let i = 0; i < data.length; i += 4) {
    gray[gIdx++] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114 + 500) / 1000;
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  // Apply discrete 3x3 Laplacian kernel:
  // [ 0,  1,  0 ]
  // [ 1, -4,  1 ]
  // [ 0,  1,  0 ]
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const upOffset = (y - 1) * width;
    const downOffset = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const center = gray[rowOffset + x];
      const up = gray[upOffset + x];
      const down = gray[downOffset + x];
      const left = gray[rowOffset + (x - 1)];
      const right = gray[rowOffset + (x + 1)];

      const lap = up + down + left + right - 4 * center;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);
  return Math.max(0, Math.round(variance * 10) / 10);
}

/**
 * Samples a lightweight thumbnail from a live <video> element to assess real-time quality
 * Returns { sharpness, brightness, isBlurry, isTooDark, isTooBright, statusText, canCapture }
 */
export function evaluateLiveVideoQuality(videoElement, sampleCanvas) {
  if (!videoElement || videoElement.readyState < 2) {
    return {
      sharpness: 0,
      brightness: 128,
      isBlurry: false,
      isTooDark: false,
      isTooBright: false,
      statusText: 'Initializing camera...',
      canCapture: false,
    };
  }

  const vw = videoElement.videoWidth || 640;
  const vh = videoElement.videoHeight || 480;

  // Sample at small resolution (e.g. 320x180) for 60fps performance
  const sampleW = 320;
  const sampleH = Math.round((vh / vw) * sampleW);

  const canvas = sampleCanvas || document.createElement('canvas');
  canvas.width = sampleW;
  canvas.height = sampleH;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(videoElement, 0, 0, sampleW, sampleH);

  const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  const sharpness = calculateSharpness(imgData);
  const brightness = calculateBrightness(imgData);

  // Sharpness thresholds:
  // < 30: clearly blurry (motion blur or severe defocus)
  // 30 - 70: marginally acceptable
  // > 70: good sharpness
  const isBlurry = sharpness < 30;
  const isTooDark = brightness < 35;
  const isTooBright = brightness > 240;

  let statusText = 'Move closer until the package fills the frame';
  let canCapture = true;

  if (isBlurry) {
    statusText = 'Hold steady — text is not sharp enough';
    canCapture = false; // Discourage capturing badly blurred frames
  } else if (isTooDark) {
    statusText = 'Lighting is dim — turn on torch or move to light';
  } else if (isTooBright) {
    statusText = 'Avoid reflection glare on the package label';
  }

  return {
    sharpness,
    brightness,
    isBlurry,
    isTooDark,
    isTooBright,
    statusText,
    canCapture,
    dimensions: `${vw}x${vh}`,
  };
}

/**
 * Captures 3 rapid frames in a burst and selects the best frame based on sharpness & exposure
 */
export async function captureBurstFrames(videoElement, count = 3, intervalMs = 65) {
  if (!videoElement) throw new Error('Video element not available');

  const vw = videoElement.videoWidth || 1920;
  const vh = videoElement.videoHeight || 1080;

  // Target full-quality capture resolution (max 1920px for mobile sensor fidelity)
  const maxDim = 1920;
  let targetW = vw;
  let targetH = vh;
  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  const capturedFrames = [];

  for (let i = 0; i < count; i++) {
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = targetW;
    frameCanvas.height = targetH;
    const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(videoElement, 0, 0, targetW, targetH);

    // Compute quality metrics on a scaled down version for speed
    const evalCanvas = document.createElement('canvas');
    evalCanvas.width = 320;
    evalCanvas.height = Math.round((targetH / targetW) * 320);
    const evalCtx = evalCanvas.getContext('2d', { willReadFrequently: true });
    evalCtx.drawImage(frameCanvas, 0, 0, evalCanvas.width, evalCanvas.height);
    const evalData = evalCtx.getImageData(0, 0, evalCanvas.width, evalCanvas.height);

    const sharpness = calculateSharpness(evalData);
    const brightness = calculateBrightness(evalData);

    const dataUrl = frameCanvas.toDataURL('image/jpeg', 0.94);

    capturedFrames.push({
      index: i + 1,
      canvas: frameCanvas,
      dataUrl,
      sharpness,
      brightness,
      width: targetW,
      height: targetH,
    });

    if (i < count - 1 && intervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  // Select the frame with highest sharpness and balanced brightness
  // (penalty if brightness is extreme: < 35 or > 240)
  let bestFrame = capturedFrames[0];
  let bestScore = -1;

  for (const f of capturedFrames) {
    let score = f.sharpness;
    if (f.brightness < 35) score *= 0.6;
    if (f.brightness > 240) score *= 0.7;

    if (score > bestScore) {
      bestScore = score;
      bestFrame = f;
    }
  }

  return {
    bestFrame,
    allFrames: capturedFrames.map((f) => ({
      index: f.index,
      sharpness: f.sharpness,
      brightness: f.brightness,
    })),
  };
}

/**
 * Conservative package crop evaluator
 * IMPORTANT:
 * Never crop away package edges containing:
 * - MRP, Net Quantity, Batch, MFD, FSSAI, Barcode.
 * If confidence is low, uses complete image rather than making a bad crop.
 */
export function evaluateConservativeCrop(canvas) {
  // Safe default: return full uncropped canvas to strictly guarantee
  // no outer statutory declarations (MRP, FSSAI, Batch, MFD) are ever clipped.
  return {
    canvas,
    cropApplied: false,
    cropRect: null,
  };
}

/**
 * Generates an OCR working image enlarged approximately 2x where practical
 * Preserves the original image separately as legal evidence.
 */
export function generateOcrWorkingImage(canvas, maxUpscaleDim = 2800) {
  const origW = canvas.width;
  const origH = canvas.height;
  const maxCurrentDim = Math.max(origW, origH);

  let scale = 1.0;
  if (maxCurrentDim <= 1920) {
    scale = 2.0;
  } else if (maxCurrentDim < maxUpscaleDim) {
    scale = Math.min(2.0, maxUpscaleDim / maxCurrentDim);
  }

  let upscaleApplied = false;
  let ocrCanvas = canvas;

  if (scale > 1.1) {
    upscaleApplied = true;
    const upW = Math.round(origW * scale);
    const upH = Math.round(origH * scale);

    ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = upW;
    ocrCanvas.height = upH;
    const ctx = ocrCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, upW, upH);
  }

  const workingImageUrl = ocrCanvas.toDataURL('image/jpeg', 0.94);

  return {
    workingImageUrl,
    upscaleApplied,
    ocrDimensions: `${ocrCanvas.width}x${ocrCanvas.height}`,
  };
}
