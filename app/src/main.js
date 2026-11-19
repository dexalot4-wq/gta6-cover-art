// Wires the editor: state, undo/redo, drag-to-pan and scroll-to-zoom on the canvas,
// the control panel, and PNG export. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import { drawCoverArt, SAMPLES, SIZES } from './cover.js';
import { GRADES } from './grades.js';
import { LAYOUTS, layoutById, panelsFor } from './layouts.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const slotLabel = document.getElementById('slotLabel');

const TITLES = ['SUNSET HEIST', 'NEON SHORE', 'PALM DRIVE', 'VICE LIGHTS', 'BOARDWALK KINGS', 'PIER PRESSURE'];
const SUBTITLES = ['Neon Shore nights', 'Golden hour getaway', 'Chase the last light', 'Where the palms meet the pink sky'];

/** A fresh cover state: 9 slots (the most any layout uses), each holding a sample. */
export function defaultState() {
  const cycle = ['pier', 'rooftop', 'surfer', 'boulevard'];
  return {
    layout: 'grid4',
    grade: 'sunset',
    size: '1080x1080',
    title: 'SUNSET HEIST',
    subtitle: 'Neon Shore nights',
    badge: 'EST. 2026',
    heat: 4,
    frame: true,
    grain: true,
    vignette: true,
    slots: Array.from({ length: 9 }, (_, i) => ({ photo: cycle[i % cycle.length], x: 0, y: 0, zoom: 1 })),
  };
}

let state = defaultState();
let selectedSlot = 0;
/** Loaded images by sample key, plus uploads by object URL. */
const imageCache = new Map();
/** Undo/redo stacks hold JSON snapshots of the state (photos by key). */
const undoStack = [];
const redoStack = [];

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function imageForSlot(slot) {
  if (!slot.photo) return null;
  if (slot.upload) {
    if (!imageCache.has(slot.upload)) imageCache.set(slot.upload, await loadImage(slot.upload));
    return imageCache.get(slot.upload);
  }
  if (!imageCache.has(slot.photo)) imageCache.set(slot.photo, await loadImage(`samples/${slot.photo}.jpg`));
  return imageCache.get(slot.photo);
}

/** The images for every slot, in slot order (null where a slot is empty). */
export async function slotImages() {
  return Promise.all(state.slots.map((s) => imageForSlot(s).catch(() => null)));
}

function redraw() {
  slotImages().then((images) => {
    drawCoverArt(canvas, state, images);
    window.__coverReady = true;
  });
}

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}

function applySnapshot(json) {
  state = JSON.parse(json);
  syncControls();
  redraw();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
  syncUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = !undoStack.length;
  document.getElementById('redo').disabled = !redoStack.length;
}

/** Reflects the state in every control (used after undo/redo/shuffle/shot). */
function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('heat').value = String(state.heat);
  document.getElementById('heatStars').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
  document.getElementById('frame').checked = state.frame;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  for (const b of document.querySelectorAll('#layouts button')) {
    b.setAttribute('aria-pressed', String(b.dataset.layout === state.layout));
  }
  for (const b of document.querySelectorAll('#grades button')) {
    b.setAttribute('aria-pressed', String(b.dataset.grade === state.grade));
  }
  for (const b of document.querySelectorAll('#sizes button')) {
    b.setAttribute('aria-pressed', String(b.dataset.size === state.size));
  }
  for (const b of document.querySelectorAll('#samples button')) {
    b.setAttribute('aria-pressed', String(state.slots[selectedSlot].photo === b.dataset.sample));
  }
  slotLabel.textContent = `Panel ${selectedSlot + 1}`;
}

/** Builds the sample, layout, grade and size pickers. */
function buildPickers() {
  const samplesEl = document.getElementById('samples');
  for (const key of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.sample = key;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<img src="samples/${key}.jpg" alt="${key} sample photo"><span>${key}</span>`;
    b.addEventListener('click', () => {
      pushHistory();
      state.slots[selectedSlot] = { photo: key, x: 0, y: 0, zoom: 1 };
      syncControls();
      redraw();
    });
    samplesEl.appendChild(b);
  }
  const layoutsEl = document.getElementById('layouts');
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = l.id;
    b.textContent = l.name;
    b.setAttribute('aria-pressed', String(l.id === state.layout));
    b.addEventListener('click', () => {
      if (state.layout === l.id) return;
      pushHistory();
      state.layout = l.id;
      selectedSlot = 0;
      syncControls();
      redraw();
    });
    layoutsEl.appendChild(b);
  }
  const gradesEl = document.getElementById('grades');
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = g.id;
    b.title = g.name;
    b.setAttribute('aria-label', g.name);
    b.style.background = g.swatch;
    b.setAttribute('aria-pressed', String(g.id === state.grade));
    b.addEventListener('click', () => {
      if (state.grade === g.id) return;
      pushHistory();
      state.grade = g.id;
      syncControls();
      redraw();
    });
    gradesEl.appendChild(b);
  }
  const sizesEl = document.getElementById('sizes');
  for (const key of Object.keys(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = key;
    b.textContent = key.replace('x', ' × ');
    b.setAttribute('aria-pressed', String(key === state.size));
    b.addEventListener('click', () => {
      if (state.size === key) return;
      pushHistory();
      state.size = key;
      syncControls();
      redraw();
    });
    sizesEl.appendChild(b);
  }
}

/** Which panel (if any) contains the canvas point (px, py, in canvas pixels). */
function panelAt(px, py) {
  const [w, h] = SIZES[state.size] ?? SIZES['1080x1080'];
  for (const p of panelsFor(state.layout)) {
    if (px >= p.x * w && px <= (p.x + p.w) * w && py >= p.y * h && py <= (p.y + p.h) * h) return p;
  }
  return null;
}

/** Canvas point from a pointer event, in canvas pixels. */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const [w, h] = SIZES[state.size] ?? SIZES['1080x1080'];
  return [(e.clientX - rect.left) * (w / rect.width), (e.clientY - rect.top) * (h / rect.height)];
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  const [px, py] = canvasPoint(e);
  const panel = panelAt(px, py);
  if (!panel) return;
  selectedSlot = panel.slot;
  syncControls();
  const slot = state.slots[selectedSlot];
  drag = { x0: px, y0: py, slotX: slot.x, slotY: slot.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [px, py] = canvasPoint(e);
  const [w, h] = SIZES[state.size] ?? SIZES['1080x1080'];
  const slot = state.slots[selectedSlot];
  slot.x = drag.slotX + (px - drag.x0) / w;
  slot.y = drag.slotY + (py - drag.y0) / h;
  if (Math.abs(px - drag.x0) + Math.abs(py - drag.y0) > 4) drag.moved = true;
  redraw();
});

canvas.addEventListener('pointerup', () => {
  if (drag?.moved) pushHistory();
  drag = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [px, py] = canvasPoint(e);
  const panel = panelAt(px, py);
  if (!panel) return;
  selectedSlot = panel.slot;
  const slot = state.slots[selectedSlot];
  pushHistory();
  slot.zoom = Math.max(1, Math.min(4, slot.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  syncControls();
  redraw();
}, { passive: false });

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pushHistory();
  const url = URL.createObjectURL(file);
  state.slots[selectedSlot] = { photo: file.name, upload: url, x: 0, y: 0, zoom: 1 };
  syncControls();
  redraw();
  e.target.value = '';
});

document.getElementById('resetSlot').addEventListener('click', () => {
  pushHistory();
  state.slots[selectedSlot] = { ...state.slots[selectedSlot], x: 0, y: 0, zoom: 1 };
  redraw();
});

for (const id of ['title', 'subtitle', 'badge']) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[id] = e.target.value;
    redraw();
  });
  document.getElementById(id).addEventListener('change', pushHistory);
}
document.getElementById('heat').addEventListener('input', (e) => {
  state.heat = Number(e.target.value);
  document.getElementById('heatStars').textContent = '★'.repeat(state.heat) + '☆'.repeat(5 - state.heat);
  redraw();
});
document.getElementById('heat').addEventListener('change', pushHistory);
for (const id of ['frame', 'grain', 'vignette']) {
  document.getElementById(id).addEventListener('change', (e) => {
    pushHistory();
    state[id] = e.target.checked;
    redraw();
  });
}

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.getElementById('shuffle').addEventListener('click', () => {
  pushHistory();
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(LAYOUTS).id;
  state.grade = pick(GRADES).id;
  state.title = pick(TITLES);
  state.subtitle = pick(SUBTITLES);
  const shuffled = [...SAMPLES].sort(() => Math.random() - 0.5);
  state.slots.forEach((s, i) => {
    s.photo = shuffled[i % shuffled.length];
    s.upload = undefined;
    s.x = 0; s.y = 0; s.zoom = 1;
  });
  selectedSlot = 0;
  syncControls();
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${state.size}.png`;
    a.click();
    status.textContent = `Saved cover-${state.size}.png (${state.size.replace('x', ' × ')}).`;
  }, 'image/png');
});

buildPickers();
syncUndoButtons();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), { getState: () => state, setState: (s) => { state = s; }, redraw, syncControls, imageForSlot });
} else {
  // Wait for the display fonts so the first paint already uses Anton and Pacifico.
  document.fonts.ready.then(redraw);
  redraw();
}
