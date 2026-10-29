'use strict';
// Canonical photos stay in images/hero; this generates web-only derivatives.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const version = 'hero-avif52-webp74-jpeg76-v1';
const sizes = [900, 1600];
const formats = {
  avif: ['avif', { quality: 52, effort: 4 }],
  webp: ['webp', { quality: 74, effort: 5 }],
  jpeg: ['jpg', { quality: 76, progressive: true, mozjpeg: true }]
};
function inputName(src) {
  const prefix = '/PASSION-site/images/hero/';
  if (typeof src !== 'string' || !src.startsWith(prefix)) throw new Error('Invalid hero source');
  const encoded = src.slice(prefix.length);
  const name = decodeURIComponent(encoded);
  if (!name || encodeURIComponent(name) !== encoded || /[/\\]/.test(name) ||
      !/\.(jpe?g|png|webp|avif)$/i.test(name)) throw new Error('Unsafe hero filename: ' + src);
  return name;
}
async function generate(base = root) {
  const srcDir = path.join(base, 'images/hero');
  const destDir = path.join(base, 'images/hero-optimized');
  const manifestPath = path.join(base, 'data/hero-optimized.json');
  const slides = JSON.parse(fs.readFileSync(path.join(base, 'data/hero.json'), 'utf8')).slides;
  if (!Array.isArray(slides) || slides.length === 0) throw new Error('No hero slides');
  fs.mkdirSync(destDir, { recursive: true });
  const keep = new Set();
  const variants = {};
  let inputBytes = 0, created = 0;
  const desktopBytes = { avif: 0, webp: 0, jpeg: 0 };
  for (const slide of slides) {
    const input = path.join(srcDir, inputName(slide.src));
    const bytes = fs.readFileSync(input);
    inputBytes += bytes.length;
    const hash = crypto.createHash('sha256').update(version).update(bytes).digest('hex').slice(0, 24);
    const info = await sharp(input).metadata();
    const nativeWidth = [5,6,7,8].includes(info.orientation) ? info.height : info.width;
    if (!nativeWidth) throw new Error('Invalid photo: ' + input);
    const widths = [...new Set(sizes.map(n => Math.min(n, nativeWidth)))];
    variants[slide.src] = {};
    for (const [format, [extension, options]] of Object.entries(formats)) {
      const outputs = [];
      for (const width of widths) {
        const file = hash + '-' + width + '.' + extension;
        const output = path.join(destDir, file);
        keep.add(file);
        if (!fs.existsSync(output)) {
          let p = sharp(input).rotate().resize({ width, withoutEnlargement: true });
          if (format === 'avif') p = p.avif(options);
          else if (format === 'webp') p = p.webp(options);
          else p = p.flatten({ background: '#fff' }).jpeg(options);
          await p.toFile(output);
          created++;
        }
        const meta = await sharp(output).metadata();
        if (!meta.width || meta.width > width) throw new Error('Bad output: ' + file);
        outputs.push({ src: 'images/hero-optimized/' + file, width: meta.width });
      }
      variants[slide.src][format] = outputs;
      desktopBytes[format] += fs.statSync(path.join(base, outputs.at(-1).src)).size;
    }
  }
  for (const name of fs.readdirSync(destDir)) {
    if (/^[a-f0-9]{24}-\d+\.(avif|webp|jpg)$/.test(name) && !keep.has(name)) {
      fs.unlinkSync(path.join(destDir, name));
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, generator: version, variants }, null, 2) + '\n');
  console.log(JSON.stringify({
    images: slides.length, generated: created,
    sourceMB: +(inputBytes / 1048576).toFixed(2),
    optimizedDesktopMB: Object.fromEntries(Object.entries(desktopBytes).map(([k,v]) => [k, +(v / 1048576).toFixed(2)]))
  }, null, 2));
  return { variants };
}
if (require.main === module) {
  generate().catch(e => { console.error(e); process.exitCode = 1; });
}
module.exports = { generate, inputName };
