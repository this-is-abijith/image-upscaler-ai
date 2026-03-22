// upscale.js
//
// PRIORITY ORDER:
//   1. Flask /api/upscale  → Real-ESRGAN AI on your RTX 3050  (best quality)
//   2. Flask /api/upscale  → Pillow LANCZOS fallback           (if AI errors)
//   3. Canvas bicubic      → browser-side fallback             (if Flask is down)
//
// The frontend never needs to know which path ran —
// it always gets back a PNG data URL either way.
// ─────────────────────────────────────────────────────────────────────────────


// ── Main export: upscale a File object ────────────────────────────────────────
/**
 * @param {File}   file          — original image File
 * @param {number} scale         — 2, 3, or 4
 * @param {function} onProgress  — called with (0–100) during processing
 * @returns {Promise<{ dataUrl: string, method: string, newWidth: number, newHeight: number }>}
 */
export async function upscaleFile(file, scale = 2, onProgress = () => {}) {
  onProgress(10);

  // ── Try Flask AI backend first ─────────────────────────────────────────────
  try {
    const form = new FormData();
    form.append("image", file);
    form.append("scale", String(scale));

    onProgress(20);

    const res = await fetch("/api/upscale", {
      method: "POST",
      body:   form,
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    onProgress(70);

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    onProgress(95);

    return {
      dataUrl:   `data:image/png;base64,${data.image}`,
      method:    data.method,        // "realesrgan" | "pillow" | "pillow_fallback"
      newWidth:  data.new_width,
      newHeight: data.new_height,
    };

  } catch (flaskErr) {
    console.warn("Flask upscale failed — using Canvas fallback:", flaskErr.message);
    onProgress(30);

    // ── Canvas fallback (browser-side) ─────────────────────────────────────
    const { img, objectUrl } = await loadImageFromFile(file);
    onProgress(60);
    const dataUrl = await canvasUpscale(img, scale, 0.4);
    URL.revokeObjectURL(objectUrl);
    onProgress(95);

    return {
      dataUrl,
      method:    "canvas",
      newWidth:  img.naturalWidth  * scale,
      newHeight: img.naturalHeight * scale,
    };
  }
}


// ── Canvas bicubic + unsharp mask (browser fallback) ─────────────────────────
export function canvasUpscale(img, scale = 2, sharpStrength = 0.4) {
  return new Promise((resolve) => {
    const src  = document.createElement("canvas");
    src.width  = img.naturalWidth;
    src.height = img.naturalHeight;
    src.getContext("2d").drawImage(img, 0, 0);

    const dst  = document.createElement("canvas");
    dst.width  = img.naturalWidth  * scale;
    dst.height = img.naturalHeight * scale;
    const dCtx = dst.getContext("2d");
    dCtx.imageSmoothingEnabled = true;
    dCtx.imageSmoothingQuality = "high";
    dCtx.drawImage(src, 0, 0, dst.width, dst.height);

    if (sharpStrength > 0) {
      const imageData = dCtx.getImageData(0, 0, dst.width, dst.height);
      const original  = new Uint8ClampedArray(imageData.data);
      const output    = imageData.data;
      const W = dst.width, H = dst.height;
      const kernel = [-1,-1,-1, -1,9,-1, -1,-1,-1];

      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const idx = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++)
              for (let kx = -1; kx <= 1; kx++)
                sum += original[((y+ky)*W+(x+kx))*4+c] * kernel[(ky+1)*3+(kx+1)];
            output[idx+c] = Math.min(255, Math.max(0,
              sum * sharpStrength + original[idx+c] * (1 - sharpStrength)
            ));
          }
          output[idx+3] = original[idx+3];
        }
      }
      dCtx.putImageData(imageData, 0, 0);
    }

    resolve(dst.toDataURL("image/png"));
  });
}


// ── Load a File into an HTMLImageElement ──────────────────────────────────────
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => resolve({ img, objectUrl });
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = objectUrl;
  });
}


// ── Trigger a browser download ────────────────────────────────────────────────
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename; a.click();
}