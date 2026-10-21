'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSlides, sync } = require('../scripts/sync-hero-pool.cjs');

const src = (file) => '/PASSION-site/images/hero/' + file;
const oldOrder = [
  { src: src('b.jpg'), alt: 'B photo' },
  { src: src('a.jpg'), alt: 'A photo' },
];

test('without 00-cover.jpg preserves current first image', () => {
  const slides = buildSlides(['a.jpg', 'b.jpg', 'c.jpg'], oldOrder);
  assert.deepEqual(slides.map((x) => x.src), ['b.jpg', 'a.jpg', 'c.jpg'].map(src));
});

test('00-cover.jpg becomes first when uploaded, with no duplicates', () => {
  const slides = buildSlides(['a.jpg', 'b.jpg', '00-cover.jpg'], oldOrder);
  assert.deepEqual(slides.map((x) => x.src), ['00-cover.jpg', 'b.jpg', 'a.jpg'].map(src));
  assert.match(slides[0].alt, /PASSION/);
});

test('pinned cover stays first despite manual changes to order', () => {
  const old = [...oldOrder, { src: src('00-cover.jpg'), alt: 'Custom cover caption' }];
  const slides = buildSlides(['a.jpg', 'b.jpg', '00-cover.jpg'], old);
  assert.deepEqual(slides.map((x) => x.src), ['00-cover.jpg', 'b.jpg', 'a.jpg'].map(src));
  assert.equal(slides[0].alt, 'Custom cover caption');
});

test('deleting pinned cover restores the previous order', () => {
  const old = [{ src: src('00-cover.jpg'), alt: 'Cover' }, ...oldOrder];
  const slides = buildSlides(['a.jpg', 'b.jpg'], old);
  assert.deepEqual(slides.map((x) => x.src), ['b.jpg', 'a.jpg'].map(src));
});

test('more than 30 images work, excluding unsupported formats', () => {
  const files = Array.from({ length: 100 }, (_, i) => 'photo-' + i + '.jpg')
    .concat('not-image.svg', 'notes.txt', '00-cover.jpg');
  const slides = buildSlides(files);
  assert.equal(slides.length, 101);
  assert.equal(slides[0].src, src('00-cover.jpg'));
  assert.ok(slides.every((item) => item.alt));
});

test('sync persists priority cover and is idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'passion-cover-'));
  try {
    fs.mkdirSync(path.join(root, 'images', 'hero'), { recursive: true });
    fs.mkdirSync(path.join(root, 'data'));
    for (const name of ['a.jpg', 'b.jpg', '00-cover.jpg']) {
      fs.writeFileSync(path.join(root, 'images', 'hero', name), 'fixture');
    }
    fs.writeFileSync(path.join(root, 'data', 'hero.json'), JSON.stringify({ slides: oldOrder }, null, 2) + '\n');
    assert.equal(sync(root), true);
    assert.equal(sync(root), false);
    const result = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero.json'), 'utf8'));
    assert.equal(result.slides[0].src, src('00-cover.jpg'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('current website hero manifest is valid and includes every image file', () => {
  const root = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'hero.json'), 'utf8'));
  const files = fs.readdirSync(path.join(root, 'images', 'hero'));
  assert.deepEqual(buildSlides(files, data.slides), data.slides);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /home-hero-carousel-dots|data-hero-dot/);
});
