import test from 'node:test';
import assert from 'node:assert/strict';
import { collectOverlaps, findEndRecord, normalizeFolderEntries, normalizeSelectedFolder } from '../conflict-core.mjs';

const file = (relative, size = 1) => ({ name: relative.split('/').at(-1), size, webkitRelativePath: relative });

test('single nested descriptor.mod strips the wrapper and finds common paths', () => {
  const files = [file('ModA/ModA/descriptor.mod'), file('ModA/ModA/common/ideas/x.txt'), file('ModB/ModB/descriptor.mod'), file('ModB/ModB/common/ideas/x.txt')];
  const groups = normalizeSelectedFolder(files);
  const mods = groups.map((group) => ({ name: group.root, paths: normalizeFolderEntries(group.entries, group.modRoot).paths }));
  assert.deepEqual(mods.map((mod) => mod.paths[0].display), ['common/ideas/x.txt', 'common/ideas/x.txt']);
  assert.equal(collectOverlaps(mods).length, 1);
});

test('selected folder with descriptor at its root stays rooted there', () => {
  const [group] = normalizeSelectedFolder([file('Mod/descriptor.mod'), file('Mod/common/ideas/x.txt')]);
  assert.equal(group.modRoot, '');
  assert.equal(normalizeFolderEntries(group.entries, group.modRoot).paths[0].display, 'common/ideas/x.txt');
});

test('several nested descriptors become separate mod sources', () => {
  const groups = normalizeSelectedFolder([file('Collection/A/descriptor.mod'), file('Collection/A/common/x.txt'), file('Collection/B/descriptor.mod'), file('Collection/B/common/x.txt')]);
  assert.deepEqual(groups.map((group) => group.modRoot).sort(), ['A', 'B']);
});

test('unsafe paths are counted and excluded; duplicate paths are counted', () => {
  const result = normalizeFolderEntries([
    { relative: 'common/x.txt', file: { size: 1 } },
    { relative: 'common/X.txt', file: { size: 1 } },
    { relative: '../escape.txt', file: { size: 1 } }
  ]);
  assert.equal(result.paths.length, 1);
  assert.equal(result.duplicateEntries, 1);
  assert.equal(result.skippedUnsafe, 1);
});

test('EOCD accepts trailing bytes after its declared comment', () => {
  const bytes = new Uint8Array(27);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(20, 0, true);
  assert.equal(findEndRecord(bytes).offset, 0);
});

test('EOCD rejects an invalid signature', () => {
  assert.throws(() => findEndRecord(new Uint8Array(22)), /invalid ZIP/);
});
