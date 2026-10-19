// Provider-free, dependency-free structural acceptance for the home photo pool.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/hero.json'), 'utf8'));

test('initial hero pool preserves all 11 photo entries and allows any first photo', () => {
  assert.equal(config.slides.length, 11);
  assert.deepEqual(config.slides.map(s => s.alt).length, 11);
  assert.match(config.slides[0].src, /home-2026-07-06\.png$/);
  for (const slide of config.slides) {
    assert.ok(slide.alt.trim());
    assert.match(slide.src, /^\/PASSION-site\/images\/hero\//);
    assert.ok(fs.existsSync(path.join(root, slide.src.replace(/^\/PASSION-site\//, ''))), slide.src);
  }
});
test('home renders from JSON, not frozen inline photos', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'home.js'), 'utf8');
  assert.doesNotMatch(html, /data-hero-slide/);
  assert.match(js, /fetch\('data\/hero\.json'/);
  assert.match(js, /loadHeroCarousel\(\)/);
  assert.match(js, /replaceChildren\(slideNodes\)/);
});
test('CMS scope is limited to the home photo pool', () => {
  const configYaml = fs.readFileSync(path.join(root, 'admin/config.yml'), 'utf8');
  assert.match(configYaml, /file: data\/hero\.json/);
  assert.match(configYaml, /allow_reorder: true/);
  assert.match(configYaml, /name: src/);
  assert.doesNotMatch(configYaml, /data\/activities\.json|data\/news\.json/);
});
