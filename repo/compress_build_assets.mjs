import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_ASSETS = path.resolve(__dirname, 'dist/assets');
const ROOT_ASSETS = path.resolve(__dirname, '../assets');
const DIST_INDEX = path.resolve(__dirname, 'dist/index.html');
const ROOT_GAME = path.resolve(__dirname, '../game.html');

// 1. Locate ffmpeg
function findFfmpeg() {
  const candidates = [
    'ffmpeg',
    'C:\\Program Files\\3DCoat-2024\\data\\ThirdParty\\ffmpeg.exe',
    'C:\\Program Files\\3DCoat-2022\\data\\ThirdParty\\ffmpeg.exe',
  ];
  for (const c of candidates) {
    try {
      const res = spawnSync(c, ['-version'], { stdio: 'ignore' });
      if (res.status === 0) return c;
    } catch (e) {}
  }
  return null;
}

const ffmpeg = findFfmpeg();
console.log(`[Asset Compressor] ffmpeg available: ${ffmpeg ? ffmpeg : 'NO (audio re-encode skipped)'}`);

if (!fs.existsSync(DIST_ASSETS)) {
  console.error(`[Asset Compressor] dist/assets not found at ${DIST_ASSETS}`);
  process.exit(1);
}

let totalOrigBytes = 0;
let totalNewBytes = 0;
let imageCount = 0;
let audioCount = 0;

const files = fs.readdirSync(DIST_ASSETS);

// Initial size
for (const file of files) {
  totalOrigBytes += fs.statSync(path.join(DIST_ASSETS, file)).size;
}

console.log(`[Asset Compressor] Found ${files.length} files in dist/assets (${(totalOrigBytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`[Asset Compressor] Processing assets losslessly / perceptually transparent...`);

// Process images with sharp
for (const file of files) {
  const fullPath = path.join(DIST_ASSETS, file);
  const ext = path.extname(file).toLowerCase();
  const origSize = fs.statSync(fullPath).size;

  if (ext === '.png') {
    try {
      const tmpPath = fullPath + '.tmp.png';
      // Compression level 9, effort 7 = maximal lossless deflate compression
      await sharp(fullPath).png({ compressionLevel: 9, effort: 7 }).toFile(tmpPath);
      const newSize = fs.statSync(tmpPath).size;
      if (newSize < origSize) {
        fs.renameSync(tmpPath, fullPath);
        imageCount++;
      } else {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
    } catch (err) {
      console.warn(`  [!] Warning on ${file}: ${err.message}`);
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    try {
      const tmpPath = fullPath + '.tmp.jpg';
      await sharp(fullPath).jpeg({ quality: 88, mozjpeg: true }).toFile(tmpPath);
      const newSize = fs.statSync(tmpPath).size;
      if (newSize < origSize) {
        fs.renameSync(tmpPath, fullPath);
        imageCount++;
      } else {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
    } catch (err) {
      console.warn(`  [!] Warning on ${file}: ${err.message}`);
    }
  }
}

// Process audio with ffmpeg if available
if (ffmpeg) {
  for (const file of files) {
    const fullPath = path.join(DIST_ASSETS, file);
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.mp3') continue;

    const origSize = fs.statSync(fullPath).size;
    const probe = spawnSync(ffmpeg, ['-i', fullPath], { encoding: 'utf-8' });
    const output = (probe.stderr || '') + (probe.stdout || '');

    let isMono = output.includes('mono,');
    let bitrateMatch = output.match(/bitrate:\s*(\d+)\s*kb\/s/);
    let bitrate = bitrateMatch ? parseInt(bitrateMatch[1], 10) : 320;

    // Target bitrates for perceptual transparency:
    // Mono speech: 128 kbps (exact same quality as prologue/act1/act6)
    // Stereo music/effects: 192 kbps
    const targetBitrate = isMono ? '128k' : '192k';
    const targetKbps = isMono ? 128 : 192;

    if (bitrate > targetKbps + 16) {
      const tmpPath = fullPath + '.tmp.mp3';
      const conv = spawnSync(ffmpeg, [
        '-y',
        '-i', fullPath,
        '-codec:a', 'libmp3lame',
        '-b:a', targetBitrate,
        tmpPath
      ], { stdio: 'ignore' });

      if (conv.status === 0 && fs.existsSync(tmpPath)) {
        const newSize = fs.statSync(tmpPath).size;
        if (newSize < origSize) {
          fs.renameSync(tmpPath, fullPath);
          audioCount++;
        } else {
          fs.unlinkSync(tmpPath);
        }
      }
    }
  }
}

// Recalculate new total size
const newFiles = fs.readdirSync(DIST_ASSETS);
for (const file of newFiles) {
  totalNewBytes += fs.statSync(path.join(DIST_ASSETS, file)).size;
}

const savedMB = ((totalOrigBytes - totalNewBytes) / 1024 / 1024).toFixed(2);
const percentSaved = (((totalOrigBytes - totalNewBytes) / totalOrigBytes) * 100).toFixed(1);

console.log(`\n======================================================`);
console.log(`[✓] COMPRESSION FINISHED`);
console.log(`  Images compressed: ${imageCount}`);
console.log(`  Audio re-encoded:  ${audioCount}`);
console.log(`  Original size:     ${(totalOrigBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Optimized size:    ${(totalNewBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Saved:             ${savedMB} MB (${percentSaved}%)`);
console.log(`======================================================\n`);

// Sync to root game.html and root assets/
console.log(`[Sync] Copying dist/index.html to game.html...`);
fs.copyFileSync(DIST_INDEX, ROOT_GAME);

console.log(`[Sync] Syncing dist/assets to root assets/...`);
if (!fs.existsSync(ROOT_ASSETS)) fs.mkdirSync(ROOT_ASSETS, { recursive: true });

// Copy or update files
for (const file of newFiles) {
  const src = path.join(DIST_ASSETS, file);
  const dst = path.join(ROOT_ASSETS, file);
  fs.copyFileSync(src, dst);
}

// Clean up stale files in root assets that are not in dist/assets
const rootFiles = fs.readdirSync(ROOT_ASSETS);
let removedCount = 0;
for (const file of rootFiles) {
  if (!fs.existsSync(path.join(DIST_ASSETS, file))) {
    fs.unlinkSync(path.join(ROOT_ASSETS, file));
    removedCount++;
  }
}
if (removedCount > 0) {
  console.log(`[Sync] Removed ${removedCount} stale files from root assets/`);
}

console.log(`[✓] Root index.html and assets/ updated successfully!`);
