/**
 * One-off script that writes decorative gold-maroon placeholder SVG images
 * into public/images/placeholders/. These are used by the seed script so a
 * freshly-installed site already looks like a temple site (not empty grey
 * boxes) before the admin uploads any real photos.
 *
 * Run with: node scripts/generate-placeholders.js
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'placeholders');
fs.mkdirSync(OUT_DIR, { recursive: true });

const GOLD = '#e8c368';
const GOLD_LIGHT = '#f5deA0';
const MAROON_DARK = '#4a0d0d';
const MAROON = '#7a1414';
const CREAM = '#fff8ec';

function galleryPlaceholder({ emoji, tint }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="Sample temple gallery photo placeholder">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tint[0]}"/>
      <stop offset="100%" stop-color="${tint[1]}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="45%">
      <stop offset="0%" stop-color="${GOLD_LIGHT}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${GOLD_LIGHT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#glow)"/>
  <rect x="24" y="24" width="752" height="552" fill="none" stroke="${GOLD}" stroke-width="3" rx="10"/>
  <rect x="34" y="34" width="732" height="532" fill="none" stroke="${GOLD}" stroke-width="1" rx="6" opacity="0.6"/>
  <!-- corner flourishes -->
  ${[
    [24, 24, 0],
    [776, 24, 90],
    [776, 576, 180],
    [24, 576, 270],
  ]
    .map(
      ([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">
      <path d="M0 0 h34 M0 0 v34" stroke="${GOLD}" stroke-width="3" fill="none"/>
      <circle cx="10" cy="10" r="3.5" fill="${GOLD}"/>
    </g>`
    )
    .join('\n  ')}
  <text x="400" y="320" font-size="180" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="400" y="500" font-family="Georgia, 'Times New Roman', serif" font-size="24" fill="${CREAM}" text-anchor="middle" opacity="0.85">Sample photo &#8212; replace anytime from Admin &#8594; Gallery</text>
</svg>`;
}

const galleryVariants = [
  { name: 'gallery-om', emoji: '\u{1F549}️', tint: [MAROON_DARK, MAROON] },
  { name: 'gallery-temple', emoji: '\u{1F6D5}', tint: ['#5c1010', '#8a1c1c'] },
  { name: 'gallery-diya', emoji: '\u{1FA94}', tint: [MAROON_DARK, '#6e1414'] },
  { name: 'gallery-lotus', emoji: '\u{1FAB7}', tint: ['#5a1010', MAROON] },
  { name: 'gallery-bell', emoji: '\u{1F514}', tint: [MAROON_DARK, '#7a1414'] },
  { name: 'gallery-conch', emoji: '\u{1F41A}', tint: ['#621212', '#8a1c1c'] },
];

for (const v of galleryVariants) {
  fs.writeFileSync(path.join(OUT_DIR, `${v.name}.svg`), galleryPlaceholder(v));
}

// --- Avatar placeholder (committee members without a photo) ---
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Committee member photo placeholder">
  <defs>
    <linearGradient id="abg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${MAROON}"/>
      <stop offset="100%" stop-color="${MAROON_DARK}"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="98" fill="url(#abg)" stroke="${GOLD}" stroke-width="3"/>
  <circle cx="100" cy="80" r="34" fill="${GOLD}" opacity="0.9"/>
  <path d="M40 172 c0 -40 27 -64 60 -64 s60 24 60 64 z" fill="${GOLD}" opacity="0.9"/>
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, 'avatar-placeholder.svg'), avatar);

// --- Logo placeholder ---
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Temple logo placeholder">
  <defs>
    <linearGradient id="lbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${MAROON}"/>
      <stop offset="100%" stop-color="${MAROON_DARK}"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="57" fill="url(#lbg)" stroke="${GOLD}" stroke-width="3"/>
  <circle cx="60" cy="60" r="47" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
  <text x="60" y="66" font-size="52" text-anchor="middle" dominant-baseline="middle">\u{1F549}️</text>
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, 'logo-placeholder.svg'), logo);

// --- UPI QR placeholder (obviously a sample, not a scannable code) ---
const qr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" role="img" aria-label="Sample UPI QR placeholder, not scannable">
  <rect width="260" height="260" rx="12" fill="${CREAM}" stroke="${MAROON}" stroke-width="2" stroke-dasharray="8 6"/>
  ${[
    [18, 18],
    [174, 18],
    [18, 174],
  ]
    .map(
      ([x, y]) => `<g transform="translate(${x} ${y})">
      <rect width="68" height="68" fill="none" stroke="${MAROON_DARK}" stroke-width="8"/>
      <rect x="20" y="20" width="28" height="28" fill="${MAROON_DARK}"/>
    </g>`
    )
    .join('\n  ')}
  <g fill="${MAROON_DARK}" opacity="0.55">
    ${Array.from({ length: 26 })
      .map(() => {
        const x = 100 + Math.floor(Math.random() * 12) * 10;
        const y = 100 + Math.floor(Math.random() * 12) * 10;
        return `<rect x="${x}" y="${y}" width="8" height="8"/>`;
      })
      .join('')}
  </g>
  <rect x="20" y="112" width="220" height="40" fill="${CREAM}" stroke="${MAROON}" stroke-width="1.5" transform="rotate(-18 130 130)"/>
  <text x="130" y="138" font-family="Georgia, serif" font-weight="bold" font-size="22" fill="${MAROON_DARK}" text-anchor="middle" transform="rotate(-18 130 130)">SAMPLE QR</text>
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, 'upi-qr-placeholder.svg'), qr);

// --- Hero fallback pattern (used behind the homepage hero text if no photo uploaded) ---
const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="Temple hero background placeholder" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${MAROON_DARK}"/>
      <stop offset="55%" stop-color="${MAROON}"/>
      <stop offset="100%" stop-color="#5c1010"/>
    </linearGradient>
    <radialGradient id="hglow" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${GOLD_LIGHT}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${GOLD_LIGHT}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
      <circle cx="30" cy="30" r="1.6" fill="${GOLD}" opacity="0.35"/>
    </pattern>
  </defs>
  <rect width="1600" height="900" fill="url(#hbg)"/>
  <rect width="1600" height="900" fill="url(#dots)"/>
  <rect width="1600" height="900" fill="url(#hglow)"/>
  <text x="800" y="470" font-size="260" text-anchor="middle" opacity="0.16">\u{1F6D5}</text>
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, 'hero-placeholder.svg'), hero);

console.log('Placeholder images written to', OUT_DIR);
