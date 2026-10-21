'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PINNED_COVER = '00-cover.jpg';
const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp|avif)$/i;
const PUBLIC_PATH = '/PASSION-site/images/hero/';

function fileNameFromSource(source) {
  if (typeof source !== 'string') return null;
  try {
    const name = decodeURIComponent(source.split('/').pop());
    return name && !name.includes('/') && !name.includes('\\') ? name : null;
  } catch {
    return null;
  }
}

function buildSlides(fileNames, previousSlides = []) {
  const available = new Set(fileNames.filter((name) => IMAGE_EXTENSIONS.test(name)));
  const used = new Set();
  const slides = [];

  function add(name, description) {
    if (!available.has(name) || used.has(name)) return;
    used.add(name);
    const fallbackAlt = name === PINNED_COVER
      ? 'PASSION 扎根教學團隊首頁輪播首圖'
      : 'PASSION 教育現場：' + name.replace(/\.[^.]+$/, '');
    slides.push({
      src: PUBLIC_PATH + encodeURIComponent(name),
      alt: description || fallbackAlt,
    });
  }

  // The reserved cover name always wins, independent of existing sort order.
  if (available.has(PINNED_COVER)) {
    const previousCover = previousSlides.find((slide) => fileNameFromSource(slide.src) === PINNED_COVER);
    add(PINNED_COVER, previousCover?.alt);
  }

  // Keep all other existing slides in their current order.
  for (const slide of previousSlides) {
    add(fileNameFromSource(slide.src), slide.alt);
  }

  // Append newly uploaded photos in predictable filename order.
  for (const name of [...available].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))) {
    add(name);
  }
  return slides;
}

function sync(root = path.resolve(__dirname, '..')) {
  const directory = path.join(root, 'images', 'hero');
  const manifest = path.join(root, 'data', 'hero.json');
  const files = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile()).map((entry) => entry.name);
  const current = fs.readFileSync(manifest, 'utf8');
  const previous = JSON.parse(current).slides || [];
  const slides = buildSlides(files, previous);
  if (!slides.length) throw new Error('Photo pool must contain at least one image.');
  const next = JSON.stringify({ slides }, null, 2) + '\n';
  if (next === current) {
    console.log('UNCHANGED: ' + slides.length + ' images');
    return false;
  }
  fs.writeFileSync(manifest, next, 'utf8');
  console.log('UPDATED: ' + slides.length + ' images');
  return true;
}

if (require.main === module) {
  try { sync(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildSlides, sync };
