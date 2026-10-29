'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { sourceName, gitBlobSha } = require('../scripts/optimize-hero.cjs');
const root = path.resolve(__dirname, '..');
const slides = JSON.parse(fs.readFileSync(path.join(root, 'data/hero.json'), 'utf8')).slides;
const state = JSON.parse(fs.readFileSync(path.join(root, 'data/hero-source-state.json'), 'utf8'));

test('all 46 pinned/shuffled photos have web-safe JPEG sources', async () => {
  assert.equal(slides.length, 46);
  assert.equal(slides[0].src, '/PASSION-site/images/hero/00-cover.jpg');
  assert.equal(Object.keys(state.images).length, slides.length);
  for (const slide of slides) {
    const input = path.join(root, 'images/hero', sourceName(slide.src));
    const data = fs.readFileSync(input);
    assert.equal(state.images[slide.src], gitBlobSha(data), 'stale image: ' + slide.src);
    const meta = await sharp(data).metadata();
    const orientedWidth = [5,6,7,8].includes(meta.orientation) ? meta.height : meta.width;
    assert.ok(orientedWidth <= 1600, 'oversized image: ' + slide.src);
    assert.ok(data.length < 600000, 'oversized bytes: ' + slide.src);
  }
});

test('upload path validation prevents traversal and unsupported formats', () => {
  assert.equal(sourceName('/PASSION-site/images/hero/00-cover.jpg'),'00-cover.jpg');
  assert.throws(() => sourceName('/PASSION-site/images/hero/..%2Fprivate.jpg'));
  assert.throws(() => sourceName('https://external.example/image.jpg'));
  assert.throws(() => sourceName('/PASSION-site/images/hero/portrait.avif'));
});

test('homepage never requests server-unsupported AVIF/WebP assets', () => {
  const home = fs.readFileSync(path.join(root,'home.js'), 'utf8');
  const html = fs.readFileSync(path.join(root,'index.html'), 'utf8');
  assert.doesNotMatch(home, /hero-optimized|image\/avif|image\/webp|createElement\('picture'\)/);
  assert.match(home, /image\.dataset\.lazySrc = item\.src/);
  assert.match(home, /img\.src = img\.dataset\.lazySrc/);
  assert.match(html, /home\.js\?v=20261029-jpeg-only/);
});
