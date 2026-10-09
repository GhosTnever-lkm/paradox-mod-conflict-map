export const GAME_CONTENT_ROOTS = new Set([
  'common', 'events', 'history', 'interface', 'gfx', 'localisation', 'localization',
  'decisions', 'missions', 'music', 'sound', 'portraits', 'map', 'history', 'news',
  'scripted_effects', 'scripted_guis', 'scripted_localisation', 'scripted_triggers',
  'technology', 'technologies', 'units', 'ai', 'banners', 'achievements', 'advisor',
  'building_textures', 'countrystate', 'fonts', 'flags', 'logos', 'portraits', 'strategic_regions'
]);

export function isServicePath(path) {
  const parts = String(path).replace(/\\/g, '/').split('/').filter(Boolean).map((part) => part.toLowerCase());
  if (!parts.length) return true;
  const base = parts.at(-1);
  if (parts.some((part) => ['.git', '.github', '.svn', '.hg', '__macosx'].includes(part))) return true;
  if (base === '.ds_store' || base === 'thumbs.db' || base === 'desktop.ini' || base === '.gitignore' || base === '.gitattributes' || base === '.editorconfig') return true;
  if (/^(readme|license|licence|copying|changelog|contributing|code_of_conduct|security|funding)(\..*)?$/i.test(base)) return parts.length === 1;
  if (['thumbnail.png', 'preview.png', 'preview.jpg', 'preview.jpeg', 'workshop.jpg', 'workshop.png'].includes(base)) return true;
  if (base.endsWith('.mod') && parts.length === 1) return true;
  return false;
}

function normalizeEntrySlashes(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\/+/, '');
}

function entryBaseName(display) {
  const path = normalizeEntrySlashes(display);
  return path.slice(path.lastIndexOf('/') + 1).toLowerCase();
}

function descriptorRoot(entry) {
  const path = normalizeEntrySlashes(entry.display);
  const index = path.lastIndexOf('/');
  return { key: (index < 0 ? '' : path.slice(0, index)).toLowerCase(), display: index < 0 ? '' : path.slice(0, index) };
}

function entryIsInsideFolder(display, folderKey) {
  const pathKey = normalizeEntrySlashes(display).toLowerCase();
  return !folderKey || pathKey.startsWith(`${folderKey}/`);
}

function rewriteUnderWrapper(entry, wrapperKey) {
  if (entry.unsafe || !entryIsInsideFolder(entry.display, wrapperKey)) return entry;
  const parts = normalizeEntrySlashes(entry.display).split('/').filter(Boolean);
  const wrapperParts = wrapperKey.split('/').filter(Boolean);
  const relative = parts.slice(wrapperParts.length).join('/');
  return { ...entry, display: relative, key: relative.toLowerCase() };
}

function detectZipWrapper(entries) {
  const safeEntries = entries.filter((entry) => !entry.unsafe && entry.display);
  const descriptors = new Map();
  for (const entry of safeEntries) {
    if (entryBaseName(entry.display) !== 'descriptor.mod') continue;
    const root = descriptorRoot(entry);
    if (!descriptors.has(root.key)) descriptors.set(root.key, root.display);
  }

  const meaningful = safeEntries.filter((entry) =>
    entryBaseName(entry.display) !== 'descriptor.mod' && !isServicePath(entry.display)
  );

  if (descriptors.size > 1) {
    return {
      entries,
      wrapper: null,
      warnings: [{ code: 'multipleDescriptorRoots', params: { roots: [...descriptors.values()].map((root) => root || '(root)').join(', ') } }]
    };
  }

  if (descriptors.size === 1) {
    const [wrapperKey, wrapperDisplay] = [...descriptors.entries()][0];
    if (!wrapperKey) return { entries, wrapper: '', warnings: [] };

    const outside = meaningful.filter((entry) => !entryIsInsideFolder(entry.display, wrapperKey));
    if (outside.length) {
      return {
        entries,
        wrapper: null,
        warnings: [{ code: 'wrapperNotApplied', params: { wrapper: wrapperDisplay, count: outside.length } }]
      };
    }

    return { entries: entries.map((entry) => rewriteUnderWrapper(entry, wrapperKey)), wrapper: wrapperDisplay, warnings: [] };
  }

  // A candidate must look like a wrapper around a recognized game content root.
  const candidates = new Map();
  for (const entry of meaningful) {
    const path = normalizeEntrySlashes(entry.display);
    const firstSlash = path.indexOf('/');
    if (firstSlash < 1) continue;
    const top = path.slice(0, firstSlash);
    const key = top.toLowerCase();
    if (GAME_CONTENT_ROOTS.has(key)) continue;
    const next = path.slice(firstSlash + 1).split('/')[0].toLowerCase();
    if (GAME_CONTENT_ROOTS.has(next) && !candidates.has(key)) candidates.set(key, top);
  }

  if (candidates.size !== 1) return { entries, wrapper: null, warnings: [] };

  const [wrapperKey, wrapperDisplay] = [...candidates.entries()][0];
  const outside = meaningful.filter((entry) => !entryIsInsideFolder(entry.display, wrapperKey));
  if (outside.length) {
    return {
      entries,
      wrapper: null,
      warnings: [{ code: 'commonFolderNotApplied', params: { wrapper: wrapperDisplay, count: outside.length } }]
    };
  }

  return { entries: entries.map((entry) => rewriteUnderWrapper(entry, wrapperKey)), wrapper: wrapperDisplay, warnings: [] };
}

export function collectOverlaps(mods) {
  const byPath = new Map();
  mods.forEach((mod, modIndex) => {
    mod.paths.forEach((entry) => {
      const key = entry.key || String(entry.display || '').replace(/\\/g, '/').toLowerCase();
      if (!byPath.has(key)) byPath.set(key, []);
      byPath.get(key).push({ modIndex, mod, entry });
    });
  });
  return [...byPath.entries()].filter(([, hits]) => hits.length > 1).map(([key, hits]) => ({ key, hits }))
    .sort((a, b) => b.hits.length - a.hits.length || a.key.localeCompare(b.key));
}

export function filterOverlaps(overlaps, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return overlaps;
  return overlaps.filter(({ key, hits }) =>
    String(key || '').toLowerCase().includes(needle) ||
    hits.some(({ mod, entry }) =>
      String(mod.name || '').toLowerCase().includes(needle) ||
      String(mod.filename || '').toLowerCase().includes(needle) ||
      String(entry.display || '').toLowerCase().includes(needle)
    )
  );
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
    const modRoots = new Set(entries.filter(({ relative }) => relative.split('/').at(-1).toLowerCase() === 'descriptor.mod')
      .map(({ relative }) => relative.split('/').slice(0, -1).join('/')));
    if (modRoots.has('')) groups.push({ root, modRoot: '', entries, warning: '' });
    else if (modRoots.size === 1) {
      const modRoot = [...modRoots][0];
      // A single nested sample descriptor is not sufficient evidence that the
      // whole selected directory is a mod wrapper. Keep the whole selection and
      // ask for confirmation via a warning rather than silently dropping files.
      const outside = entries.some(({ relative }) => !relative.toLowerCase().startsWith(`${modRoot.toLowerCase()}/`));
      if (outside) groups.push({ root, modRoot: '', entries, warning: 'nestedDescriptor' });
      else groups.push({ root, modRoot, entries, warning: '' });
    } else if (modRoots.size > 1) {
      for (const modRoot of modRoots) {
        const prefix = `${modRoot}/`.toLowerCase();
        groups.push({ root, modRoot, entries: entries.filter(({ relative }) => relative.toLowerCase().startsWith(prefix)), warning: 'multipleMods' });
      }
    } else {
      const legacyRoots = new Set(entries
        .filter(({ relative }) => relative.split('/').length === 1 && relative.toLowerCase().endsWith('.mod'))
        .map(({ relative }) => relative.slice(0, -4))
        .filter((name) => entries.some(({ relative }) => relative.toLowerCase().startsWith(`${name.toLowerCase()}/`))));
      if (legacyRoots.size) {
        for (const modRoot of legacyRoots) {
          const prefix = `${modRoot}/`.toLowerCase();
          groups.push({ root, modRoot, entries: entries.filter(({ relative }) => relative.toLowerCase().startsWith(prefix)), warning: legacyRoots.size > 1 ? 'multipleMods' : '' });
        }
      } else groups.push({ root, modRoot: '', entries, warning: 'noDescriptor' });
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
  let skippedService = 0;
  for (const entry of entries) {
    const relative = String(entry.relative || '').replace(/\\/g, '/');
    if (modRoot && !relative.toLowerCase().startsWith(prefix)) continue;
    const display = modRoot ? relative.slice(modRoot.length + 1) : relative;
    if (!display || display.split('/').at(-1).toLowerCase() === 'descriptor.mod') continue;
    if (entry.unsafe) { skippedUnsafe++; continue; }
    if (display.startsWith('/') || /^[a-z]:\//i.test(display) || display.split('/').includes('..') || display.includes('\\0')) { skippedUnsafe++; continue; }
    if (isServicePath(display)) { skippedService++; continue; }
    const key = display.toLowerCase();
    if (seen.has(key)) { duplicateEntries++; continue; }
    seen.add(key);
    paths.push({ key, display, size: entry.file.size, compressed: entry.file.size, method: 0, encrypted: false });
  }
  return { paths, skippedUnsafe, duplicateEntries, skippedService };
}

export function normalizeZipEntries(entries) {
  const root = detectZipWrapper(entries);
  const paths = [];
  const seen = new Set();
  let duplicateEntries = 0;
  let skippedService = 0;
  let skippedUnsafe = 0;
  for (const entry of root.entries) {
    if (entry.unsafe) { skippedUnsafe++; continue; }
    if (!entry.display || entryBaseName(entry.display) === 'descriptor.mod') continue;
    if (isServicePath(entry.display)) { skippedService++; continue; }
    const key = normalizeEntrySlashes(entry.key || entry.display).toLowerCase();
    if (seen.has(key)) duplicateEntries++;
    else { seen.add(key); paths.push({ ...entry, key, display: normalizeEntrySlashes(entry.display) }); }
  }
  return { paths, duplicateEntries, skippedService, skippedUnsafe, warnings: root.warnings, wrapper: root.wrapper };
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
