export function collectOverlaps(mods) {
  const byPath = new Map();
  mods.forEach((mod, modIndex) => {
    mod.paths.forEach((entry) => {
      const key = entry.key || String(entry.display || '').replace(/\\/g, '/').toLowerCase();
      if (!byPath.has(key)) byPath.set(key, []);
      byPath.get(key).push({ modIndex, mod, entry });
    });
  });
  return [...byPath.entries()]
    .filter(([, hits]) => hits.length > 1)
    .map(([key, hits]) => ({ key, hits }))
    .sort((a, b) => b.hits.length - a.hits.length || a.key.localeCompare(b.key));
}

export function normalizeSelectedFolder(fileList) {
  const roots = new Map();
  for (const file of fileList) {
    const relative = String(file.webkitRelativePath || '').replace(/\\/g, '/');
    const parts = relative.split('/').filter(Boolean);
    if (parts.length < 2) continue;
    const root = parts.shift();
    if (!roots.has(root)) roots.set(root, []);
    roots.get(root).push({ file, relative: parts.join('/') });
  }

  const groups = [];
  for (const [root, entries] of roots) {
    const modRoots = new Set(entries
      .filter(({ relative }) => relative.split('/').at(-1).toLowerCase() === 'descriptor.mod')
      .map(({ relative }) => relative.split('/').slice(0, -1).join('/')));
    if (modRoots.has('')) {
      groups.push({ root, modRoot: '', entries });
    } else if (modRoots.size === 1) {
      const modRoot = [...modRoots][0];
      const prefix = `${modRoot}/`.toLowerCase();
      groups.push({ root, modRoot, entries: entries.filter(({ relative }) => relative.toLowerCase().startsWith(prefix)) });
    } else {
      // Multiple descriptor.mod files mean the selected directory contains
      // several mods. Keep them separate so wrapper prefixes cannot create
      // silent false negatives in the overlap map.
      for (const modRoot of modRoots) {
        const prefix = `${modRoot}/`.toLowerCase();
        groups.push({ root, modRoot, entries: entries.filter(({ relative }) => relative.toLowerCase().startsWith(prefix)) });
      }
    }
  }
  return groups;
}

export function normalizeFolderEntries(entries, modRoot = '') {
  const prefix = modRoot ? `${modRoot}/`.toLowerCase() : '';
  const paths = [];
  const seen = new Set();
  let skippedUnsafe = 0;
  let duplicateEntries = 0;
  for (const entry of entries) {
    const relative = String(entry.relative || '').replace(/\\/g, '/');
    if (modRoot && !relative.toLowerCase().startsWith(prefix)) continue;
    const display = modRoot ? relative.slice(modRoot.length + 1) : relative;
    if (!display || display.split('/').at(-1).toLowerCase() === 'descriptor.mod') continue;
    if (display.startsWith('/') || /^[a-z]:\//i.test(display) || display.split('/').includes('..') || display.includes('\0')) {
      skippedUnsafe++;
      continue;
    }
    const key = display.toLowerCase();
    if (seen.has(key)) { duplicateEntries++; continue; }
    seen.add(key);
    paths.push({ key, display, size: entry.file.size, compressed: entry.file.size, method: 0, encrypted: false });
  }
  return { paths, skippedUnsafe, duplicateEntries };
}

export function findEndRecord(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const min = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= min; offset--) {
    if (view.getUint32(offset, true) !== 0x06054b50) continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + 22 + commentLength <= bytes.length) return { view, offset };
  }
  throw new Error('invalid ZIP');
}
