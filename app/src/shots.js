// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo loaded;
// ?shot=cover shows the cover alone, full-window. Query knobs: layout, grade, size
// (1080x1080, 1080x1350 or 1920x1080), photos (comma list of sample keys), title,
// subtitle, badge, heat, frame, grain, vignette. window.__shotReady is set once the
// cover is painted with its display fonts loaded.
import { defaultState } from './main.js';
import { SIZES } from './cover.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function paintReady(api) {
  // Load the display fonts explicitly, then repaint: measuring the title before
  // Anton arrives would size it for the fallback font and leave the first paint
  // in the wrong lettering.
  try {
    await Promise.race([
      Promise.all([document.fonts.load('100px Anton'), document.fonts.load('40px Pacifico'), document.fonts.ready]),
      sleep(5000),
    ]);
  } catch { /* fall through with whatever fonts arrived */ }
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await sleep(200);
  window.__shotReady = true;
}

export async function runShot(shot, query, api) {
  const state = defaultState();
  if (shot === 'cover') document.body.classList.add('shot-cover');

  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('badge')) state.badge = query.get('badge');
  if (query.get('heat') !== null) state.heat = Math.max(0, Math.min(5, Number(query.get('heat') ?? 4)));
  if (query.get('frame') !== null) state.frame = query.get('frame') !== '0';
  if (query.get('grain') !== null) state.grain = query.get('grain') !== '0';
  if (query.get('vignette') !== null) state.vignette = query.get('vignette') !== '0';

  const photos = (query.get('photos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (photos.length) {
    state.slots.forEach((slot, i) => {
      slot.photo = photos[i % photos.length];
      slot.upload = undefined;
      slot.x = 0;
      slot.y = 0;
      slot.zoom = 1;
    });
  }
  // Vertical pan per slot, as fractions of the panel height (e.g. pan=0,0,0.1).
  const pans = (query.get('pan') ?? '').split(',').map(Number);
  if (pans.some((n) => Number.isFinite(n))) {
    state.slots.forEach((slot, i) => {
      if (Number.isFinite(pans[i])) slot.y = pans[i];
    });
  }

  api.setState(state);
  api.syncControls();
  // Preload every sample the cover uses so the shot never catches a blank panel.
  await Promise.all(state.slots.map((s) => api.imageForSlot(s).catch(() => null)));
  api.redraw();
  await paintReady(api);
}
