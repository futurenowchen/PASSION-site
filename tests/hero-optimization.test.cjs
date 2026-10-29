'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { inputName } = require('../scripts/optimize-hero.cjs');
const root = path.resolve(__dirname, '..');
const slides = JSON.parse(fs.readFileSync(path.join(root, 'data/hero.json'), 'utf8')).slides;
test('photo pool remains intact and sources are safe', () => {
  assert.equal(slides.length, 46);
  assert.equal(slides[0].src, '/PASSION-site/images/hero/00-cover.jpg');
  for (const slide of slides) assert.ok(fs.existsSync(path.join(root,'images/hero', inputName(slide.src))));
});
test('unsafe image sources rejected', () => {
  assert.throws(() => inputName('/PASSION-site/images/hero/..%2Fsecret.jpg'));
  assert.throws(() => inputName('https://example.com/remote.jpg'));
});
test('responsive markup defers inactive photos and supports all formats', () => {
  const source = fs.readFileSync(path.join(root,'home.js'),'utf8');
  assert.match(source,/document\.createElement\('picture'\)/);
  assert.match(source,/image\/avif/);
  assert.match(source,/image\/webp/);
  assert.match(source,/dataset\.lazySrc/);
  assert.match(source,/hero-optimized\.json/);
});
