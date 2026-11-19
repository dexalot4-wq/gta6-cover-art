// The cover engine: draws a GTA-style multi-panel cover onto a canvas from the editor
// state. Photos are painted to an offscreen layer first (so the grade filter and the
// gradient overlays touch the photos only), then the title block, badge, grain and
// vignette are painted on top. All art is original; the lettering is Anton and Pacifico,
// vendored under the SIL Open Font License.
import { gradeById } from './grades.js';
import { panelsFor } from './layouts.js';

/** Export sizes the editor offers, as [width, height]. */
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** The sample photos shipped with the app, in the order the UI lists them. */
export const SAMPLES = ['pier', 'boulevard', 'surfer', 'rooftop'];

/** A tiny seeded PRNG so the film grain is identical on every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainCanvas = null;
/** A reusable 160x160 noise tile, drawn with 'overlay' at low alpha. */
function grainTile() {
  if (grainCanvas) return grainCanvas;
  const rand = mulberry32(20261119);
  grainCanvas = document.createElement('canvas');
  grainCanvas.width = 160;
  grainCanvas.height = 160;
  const g = grainCanvas.getContext('2d');
  const data = g.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  return grainCanvas;
}

/** Keeps a slot's pan inside the photo so the panel never shows empty space. */
export function clampSlot(slot, img, rectW, rectH) {
  if (!img) return;
  const scale = Math.max(rectW / img.naturalWidth, rectH / img.naturalHeight) * slot.zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const maxX = Math.max(0, (pw - rectW) / 2 / rectW);
  const maxY = Math.max(0, (ph - rectH) / 2 / rectH);
  slot.x = Math.max(-maxX, Math.min(maxX, slot.x));
  slot.y = Math.max(-maxY, Math.min(maxY, slot.y));
}

/** Paints one photo into a panel rect, cover-fit, panned and zoomed per its slot. */
function paintPhoto(ctx, img, rect, slot) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * slot.zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + slot.x * rect.w;
  const cy = rect.y + rect.h / 2 + slot.y * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

/** Paints the empty-panel placeholder: a warm gradient and an invitation. */
function paintEmptyPanel(ctx, rect) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#3d1a5e');
  grad.addColorStop(1, '#8a2a6e');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const size = Math.min(rect.w, rect.h) * 0.09;
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
}

/** Paints one gradient overlay over the whole photo layer. */
function paintOverlay(ctx, w, h, overlay) {
  let grad;
  if (overlay.kind === 'linear') {
    grad = ctx.createLinearGradient(overlay.from[0] * w, overlay.from[1] * h, overlay.to[0] * w, overlay.to[1] * h);
  } else {
    const r = overlay.r * Math.max(w, h);
    grad = ctx.createRadialGradient(overlay.at[0] * w, overlay.at[1] * h, 0, overlay.at[0] * w, overlay.at[1] * h, r);
  }
  for (const [stop, color] of overlay.stops) grad.addColorStop(stop, color);
  ctx.save();
  ctx.globalCompositeOperation = overlay.composite;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The largest Anton size whose text fits maxWidth. */
function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** Draws a five-pointed star path centred at (cx, cy) with radius r. */
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Paints the title block: heat stars, Anton title, Pacifico subtitle, halftone dots. */
function paintTitleBlock(ctx, w, h, state) {
  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.62, 0, h);
  scrim.addColorStop(0, 'rgba(12,4,24,0)');
  scrim.addColorStop(0.45, 'rgba(12,4,24,0.55)');
  scrim.addColorStop(1, 'rgba(12,4,24,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  // Halftone dots across the title band on the snapshot layout.
  if (state.layout === 'tilted') {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    const step = Math.max(10, w * 0.016);
    for (let y = h * 0.70; y < h * 0.78; y += step) {
      for (let x = step / 2; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.5, w * 0.0022), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Heat meter: five stars above the title.
  const starR = Math.max(8, h * 0.016);
  const gap = starR * 2.6;
  const starsW = gap * 4;
  const cy = h * 0.755;
  for (let i = 0; i < 5; i++) {
    const cx = w / 2 - starsW / 2 + i * gap;
    starPath(ctx, cx, cy, starR);
    ctx.fillStyle = i < state.heat ? '#ffd76a' : 'rgba(255,255,255,0.28)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, starR * 0.12);
    ctx.strokeStyle = 'rgba(10,4,18,0.8)';
    ctx.stroke();
  }

  // Title: Anton capitals, sunset gradient fill, dark outline, soft shadow.
  const title = (state.title || 'UNTITLED').trim().toUpperCase();
  const size = fitTitleSize(ctx, title, w * 0.92, h * 0.115);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleY = h * 0.885;
  const grad = ctx.createLinearGradient(0, titleY - size, 0, titleY);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.6, '#ffe9a8');
  grad.addColorStop(1, '#ff9a5c');
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = 'rgba(16,4,28,0.92)';
  ctx.strokeText(title, w / 2, titleY);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.03;
  ctx.fillText(title, w / 2, titleY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Subtitle: Pacifico script in neon pink, under the title.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    let subSize = h * 0.042;
    ctx.font = `${subSize}px Pacifico, cursive`;
    while (subSize > 10 && ctx.measureText(sub).width > w * 0.86) {
      subSize -= 1;
      ctx.font = `${subSize}px Pacifico, cursive`;
    }
    ctx.lineWidth = Math.max(2, subSize * 0.12);
    ctx.strokeStyle = 'rgba(16,4,28,0.9)';
    ctx.strokeText(sub, w / 2, h * 0.945);
    ctx.fillStyle = '#ff7ad9';
    ctx.fillText(sub, w / 2, h * 0.945);
  }
}

/** Paints the rotated badge ribbon in the top-right corner. */
function paintBadge(ctx, w, h, text) {
  const label = (text || '').trim();
  if (!label) return;
  const fontPx = Math.max(16, Math.floor(h * 0.02));
  ctx.font = `${fontPx}px Anton, sans-serif`;
  const textW = ctx.measureText(label.toUpperCase()).width;
  const bw = textW + w * 0.045;
  const bh = Math.max(20, h * 0.038);
  ctx.save();
  ctx.translate(w - bw / 2 - w * 0.035, bh * 1.05);
  ctx.rotate(0.05);
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, h * 0.002);
  ctx.beginPath();
  ctx.rect(-bw / 2, -bh / 2, bw, bh);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${fontPx}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), 0, bh * 0.03);
  ctx.restore();
}

/**
 * Renders the whole cover onto `canvas` (resized to the state's export size).
 * `images` is an array indexed by slot: an HTMLImageElement, or null for empty.
 */
export function drawCoverArt(canvas, state, images) {
  const [w, h] = SIZES[state.size] ?? SIZES['1080x1080'];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  const grade = gradeById(state.grade);
  const panels = panelsFor(state.layout);
  const gutter = Math.max(2, Math.round(w * 0.006));

  // --- Photo layer (offscreen, so the grade filter touches photos only). ---
  const layer = document.createElement('canvas');
  layer.width = w;
  layer.height = h;
  const lctx = layer.getContext('2d');
  lctx.fillStyle = '#1c0b33';
  lctx.fillRect(0, 0, w, h);

  if (state.layout === 'tilted') {
    const bg = lctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#ff9a5c');
    bg.addColorStop(0.5, '#e84a8a');
    bg.addColorStop(1, '#3d1a5e');
    lctx.fillStyle = bg;
    lctx.fillRect(0, 0, w, h);
  }

  lctx.filter = grade.filter;
  for (const p of panels) {
    const rect = { x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h };
    const img = images[p.slot] ?? null;
    const slot = state.slots[p.slot];
    if (slot && img) clampSlot(slot, img, rect.w, rect.h);
    lctx.save();
    if (p.rot) {
      lctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      lctx.rotate(p.rot);
      lctx.translate(-rect.w / 2, -rect.h / 2);
      rect.x = 0; rect.y = 0;
    }
    lctx.beginPath();
    lctx.rect(rect.x, rect.y, rect.w, rect.h);
    lctx.clip();
    if (img) paintPhoto(lctx, img, rect, slot ?? { x: 0, y: 0, zoom: 1 });
    else paintEmptyPanel(lctx, rect);
    lctx.restore();
    if (p.rot) {
      // White print border around the tilted snapshot.
      lctx.save();
      lctx.translate(p.x * w + (p.w * w) / 2, p.y * h + (p.h * h) / 2);
      lctx.rotate(p.rot);
      lctx.lineWidth = Math.max(4, w * 0.008);
      lctx.strokeStyle = '#ffffff';
      lctx.strokeRect(-(p.w * w) / 2, -(p.h * h) / 2, p.w * w, p.h * h);
      lctx.restore();
    } else if (state.layout !== 'full') {
      lctx.lineWidth = gutter;
      lctx.strokeStyle = '#ffffff';
      lctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  }
  lctx.filter = 'none';

  // --- Composite: photo layer, grade overlays, grain, vignette. ---
  ctx.drawImage(layer, 0, 0);
  for (const overlay of grade.overlays) paintOverlay(ctx, w, h, overlay);

  if (state.grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette) {
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(10,4,18,0)');
    vg.addColorStop(1, 'rgba(10,4,18,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  // --- Lettering, badge, frame. ---
  paintTitleBlock(ctx, w, h, state);
  paintBadge(ctx, w, h, state.badge);
  if (state.frame) {
    const fw = Math.max(6, Math.round(w * 0.014));
    ctx.lineWidth = fw;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(fw / 2, fw / 2, w - fw, h - fw);
  }
}
