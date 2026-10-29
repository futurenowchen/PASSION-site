'use strict';

// PASSION's archival originals are backed up outside the site repository.
// The production Hero pool keeps only standard, web-sized JPEG files so a
// manually deployed ZIP works on ordinary static servers without AVIF MIME setup.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = 'data/hero-source-state.json';
const SOURCE_PREFIX = '/PASSION-site/images/hero/';
const MAX_WIDTH = 1600;
const MAX_BYTES_WITHOUT_REENCODE = 400000;

function sourceName(src) {
  if (typeof src !== 'string' || !src.startsWith(SOURCE_PREFIX)) {
    throw new Error('Unexpected Hero source path: ' + src);
  }
  const encoded = src.slice(SOURCE_PREFIX.length);
  let name;
  try { name = decodeURIComponent(encoded); }
  catch { throw new Error('Invalid URL encoding: ' + src); }
  if (!name || encodeURIComponent(name) !== encoded ||
      name.includes('/') || name.includes('\\') || !/\.jpe?g$/i.test(name)) {
    throw new Error('Only safely named JPEG uploads are supported: ' + src);
  }
  return name;
}

function gitBlobSha(buffer) {
  return crypto.createHash('sha1')
    .update('blob ' + buffer.length + '\0')
    .update(buffer)
    .digest('hex');
}

async function optimize(base = ROOT) {
  const config = JSON.parse(fs.readFileSync(path.join(base, 'data/hero.json'), 'utf8'));
  if (!Array.isArray(config.slides) || config.slides.length === 0) {
    throw new Error('Hero manifest has no slides');
  }
  const statePath = path.join(base, MANIFEST);
  let previous = { version: 1, images: {} };
  if (fs.existsSync(statePath)) previous = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (previous.version !== 1) throw new Error('Unsupported photo optimization state version');

  const next = { version: 1, images: {} };
  let changed = 0, before = 0, after = 0;
  for (const slide of config.slides) {
    const name = sourceName(slide.src);
    if (Object.hasOwn(next.images, slide.src)) throw new Error('Duplicate Hero source: ' + slide.src);
    const filename = path.join(base, 'images/hero', name);
    const data = fs.readFileSync(filename);
    before += data.length;
    const currentSha = gitBlobSha(data);
    if (previous.images[slide.src] === currentSha) {
      next.images[slide.src] = currentSha;
      after += data.length;
      continue;
    }

    const meta = await sharp(data).metadata();
    const orientedWidth = [5, 6, 7, 8].includes(meta.orientation) ? meta.height : meta.width;
    let output = data;
    if (orientedWidth > MAX_WIDTH || data.length > MAX_BYTES_WITHOUT_REENCODE) {
      const resized = await sharp(data).rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 76, progressive: true, mozjpeg: true }).toBuffer();
      if (orientedWidth > MAX_WIDTH || resized.length < data.length) {
        output = resized;
      }
    }
    if (output !== data) {
      const tmp = filename + '.optimized.tmp';
      fs.writeFileSync(tmp, output);
      fs.renameSync(tmp, filename);
      changed++;
    }
    next.images[slide.src] = gitBlobSha(output);
    after += output.length;
  }
  const value = JSON.stringify(next, null, 2) + '\n';
  if (!fs.existsSync(statePath) || fs.readFileSync(statePath, 'utf8') !== value) {
    fs.writeFileSync(statePath, value);
  }
  console.log(JSON.stringify({
    photos: config.slides.length, files_replaced: changed,
    input_MiB: +(before / 1048576).toFixed(2),
    output_MiB: +(after / 1048576).toFixed(2)
  }, null, 2));
  return next;
}
if (require.main === module) {
  optimize().catch(e => { console.error(e); process.exitCode = 1; });
}
module.exports = { optimize, sourceName, gitBlobSha };
