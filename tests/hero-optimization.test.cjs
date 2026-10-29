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

test('all original-path JPEGs are web sized and match generated JPEG fallbacks', () => {
  const optimized = JSON.parse(fs.readFileSync(path.join(root,'data/hero-optimized.json'), 'utf8'));
  assert.equal(Object.keys(optimized.variants).length, slides.length);
  for (const slide of slides) {
    const original = fs.readFileSync(path.join(root,'images/hero',inputName(slide.src)));
    const variant = optimized.variants[slide.src];
    assert.ok(variant, 'variant missing');
    const jpg = fs.readFileSync(path.join(root,variant.jpeg.at(-1).src));
    if (/\.jpe?g$/i.test(slide.src)) assert.ok(original.equals(jpg), 'uncompressed source retained: ' + slide.src);
  }
});
test('picture container fills hero and has an image error fallback', () => {
  const css = fs.readFileSync(path.join(root,'styles.css'),'utf8');
  const home = fs.readFileSync(path.join(root,'home.js'),'utf8');
  assert.match(css, /\.home-hero-slide picture\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%/);
  assert.match(home, /originalFallbackTried/);
});
