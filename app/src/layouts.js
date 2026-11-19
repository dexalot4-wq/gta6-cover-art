// Panel layouts for the cover engine. Every layout returns its panels as fractions of
// the cover (x, y, w, h in 0..1) plus the slot each panel shows. `rot` tilts a panel
// (the snapshot layout). The title block is drawn over the bottom of every layout, so
// panels always fill the whole cover — the classic multi-panel poster look.

/** All layouts the editor offers, in the order the UI lists them. */
export const LAYOUTS = [
  { id: 'grid4', name: 'Grid 2×2', slots: 4 },
  { id: 'hero3', name: 'Hero + 3', slots: 4 },
  { id: 'full', name: 'Full bleed', slots: 1 },
  { id: 'grid9', name: 'Grid 3×3', slots: 9 },
  { id: 'tilted', name: 'Snapshots', slots: 3 },
  { id: 'duo', name: 'Duo split', slots: 2 },
];

/** Looks a layout up by id; falls back to the 2×2 grid. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * Panel rectangles for a layout id, as fractions of the cover.
 * Each panel: { x, y, w, h, slot, rot? } — rot is a tilt in radians.
 */
export function panelsFor(layoutId) {
  const g = 0.012; // white gutter between panels, as a fraction of the cover
  switch (layoutId) {
    case 'grid4': {
      const s = (1 - g) / 2;
      return [
        { x: 0, y: 0, w: s, h: s, slot: 0 },
        { x: s + g, y: 0, w: s, h: s, slot: 1 },
        { x: 0, y: s + g, w: s, h: s, slot: 2 },
        { x: s + g, y: s + g, w: s, h: s, slot: 3 },
      ];
    }
    case 'hero3': {
      const heroW = 0.62;
      const colX = heroW + g;
      const colW = 1 - colX;
      const rowH = (1 - 2 * g) / 3;
      return [
        { x: 0, y: 0, w: heroW, h: 1, slot: 0 },
        { x: colX, y: 0, w: colW, h: rowH, slot: 1 },
        { x: colX, y: rowH + g, w: colW, h: rowH, slot: 2 },
        { x: colX, y: 2 * (rowH + g), w: colW, h: rowH, slot: 3 },
      ];
    }
    case 'full':
      return [{ x: 0, y: 0, w: 1, h: 1, slot: 0 }];
    case 'grid9': {
      const s = (1 - 2 * g) / 3;
      const panels = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          panels.push({ x: c * (s + g), y: r * (s + g), w: s, h: s, slot: r * 3 + c });
        }
      }
      return panels;
    }
    case 'tilted':
      // Three overlapping snapshots over the sunset background, tilted like prints
      // tossed on a table; the title block sits at the foot.
      return [
        { x: 0.04, y: 0.05, w: 0.52, h: 0.52, slot: 0, rot: -0.07 },
        { x: 0.46, y: 0.03, w: 0.5, h: 0.5, slot: 1, rot: 0.06 },
        { x: 0.22, y: 0.42, w: 0.56, h: 0.42, slot: 2, rot: -0.02 },
      ];
    case 'duo': {
      const s = (1 - g) / 2;
      return [
        { x: 0, y: 0, w: s, h: 1, slot: 0 },
        { x: s + g, y: 0, w: s, h: 1, slot: 1 },
      ];
    }
    default:
      return panelsFor('grid4');
  }
}
