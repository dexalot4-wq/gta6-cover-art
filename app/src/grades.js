// Colour grades for the cover engine. A grade is a canvas `filter` applied while the
// photos are painted, plus gradient overlays painted over the photo layer. Every grade
// is an original combination — no look is copied from any game.

/** All grades the editor offers, in the order the UI lists them. */
export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: 'linear-gradient(135deg,#ffd76a,#ff5e3a 55%,#c82878)',
    filter: 'saturate(1.25) contrast(1.06)',
    overlays: [
      { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,190,90,0)'], [0.55, 'rgba(255,120,60,0.10)'], [1, 'rgba(200,40,120,0.38)']], composite: 'source-over' },
      { kind: 'linear', from: [0, 0], to: [1, 1], stops: [[0, 'rgba(255,140,60,0.14)'], [1, 'rgba(255,140,60,0)']], composite: 'overlay' },
    ],
  },
  {
    id: 'neon',
    name: 'Neon',
    swatch: 'linear-gradient(135deg,#ff2e88,#7a2eff 55%,#19e3d6)',
    filter: 'saturate(1.35) contrast(1.08)',
    overlays: [
      { kind: 'radial', at: [0.15, 0.1], r: 0.9, stops: [[0, 'rgba(255,46,136,0.30)'], [1, 'rgba(255,46,136,0)']], composite: 'soft-light' },
      { kind: 'radial', at: [0.9, 0.95], r: 0.9, stops: [[0, 'rgba(25,227,214,0.32)'], [1, 'rgba(25,227,214,0)']], composite: 'soft-light' },
      { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(122,46,255,0.10)'], [1, 'rgba(25,227,214,0.12)']], composite: 'overlay' },
    ],
  },
  {
    id: 'vice',
    name: 'Vice',
    swatch: 'linear-gradient(135deg,#b04dff,#ff5e9c 55%,#2a0a4a)',
    filter: 'saturate(1.3) contrast(1.05)',
    overlays: [
      { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(176,77,255,0.22)'], [0.5, 'rgba(255,94,156,0.08)'], [1, 'rgba(42,10,74,0.30)']], composite: 'soft-light' },
      { kind: 'linear', from: [0, 0], to: [1, 0], stops: [[0, 'rgba(255,94,156,0.12)'], [1, 'rgba(176,77,255,0.12)']], composite: 'overlay' },
    ],
  },
  {
    id: 'noir',
    name: 'Noir',
    swatch: 'linear-gradient(135deg,#e8e8e8,#5a5a5a 55%,#111)',
    filter: 'grayscale(0.9) contrast(1.18) brightness(1.05)',
    overlays: [
      { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,190,120,0.10)'], [1, 'rgba(255,120,60,0.16)']], composite: 'soft-light' },
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    swatch: 'linear-gradient(135deg,#ffe9a8,#ffb347 55%,#8a4b00)',
    filter: 'sepia(0.32) saturate(1.35) contrast(1.05)',
    overlays: [
      { kind: 'radial', at: [0.5, 0.35], r: 0.85, stops: [[0, 'rgba(255,215,106,0.22)'], [1, 'rgba(255,215,106,0)']], composite: 'soft-light' },
      { kind: 'linear', from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,180,70,0)'], [1, 'rgba(138,75,0,0.20)']], composite: 'source-over' },
    ],
  },
];

/** Looks a grade up by id; falls back to Sunset. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}
