import { makePlaceholder } from './placeholder.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed: ${src}`));
    img.src = src;
  });
}

export async function loadAssets(manifestUrl = 'assets/manifest.json', baseDir = 'assets/') {
  let manifest = {};
  try {
    const res = await fetch(manifestUrl);
    manifest = await res.json();
  } catch {
    manifest = {};
  }
  const images = {};
  await Promise.all(Object.entries(manifest).map(async ([key, meta]) => {
    try {
      const img = await loadImage(baseDir + meta.file);
      images[key] = { img, meta };
    } catch {
      images[key] = { img: makePlaceholder(key, meta), meta };
    }
  }));
  return {
    images,
    get(key) {
      const entry = images[key];
      if (entry) return entry;
      const meta = manifest[key] || { frames: 1, fw: 64, fh: 64 };
      const made = { img: makePlaceholder(key, meta), meta };
      images[key] = made;
      return made;
    },
  };
}
