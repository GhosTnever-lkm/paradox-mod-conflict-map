import test from 'node:test';
import assert from 'node:assert/strict';
import { collectOverlaps, filterOverlaps, findEndRecord, normalizeFolderEntries, normalizeSelectedFolder, normalizeZipEntries } from '../conflict-core.mjs';

const file = (relative, size = 1) => ({ name: relative.split('/').at(-1), size, webkitRelativePath: relative });
const entry = (display, size = 1) => ({ key: display.toLowerCase(), display, size, compressed: size, method: 0, encrypted: false });

test('folder wrappers and nested descriptor roots normalize to relative game paths', () => {
  const files = [file('ModA/ModA/descriptor.mod'), file('ModA/ModA/common/ideas/x.txt'), file('ModB/ModB/descriptor.mod'), file('ModB/ModB/common/ideas/x.txt')];
  const mods = normalizeSelectedFolder(files).map((group) => ({ name: group.root, paths: normalizeFolderEntries(group.entries, group.modRoot).paths }));
  assert.deepEqual(mods.map((mod) => mod.paths[0].display), ['common/ideas/x.txt', 'common/ideas/x.txt']);
  assert.equal(collectOverlaps(mods).length, 1);
});

test('ZIPs with different wrapper folder names find the same game path', () => {
  const a = normalizeZipEntries([entry('ModA/common/x.txt')]).paths;
  const b = normalizeZipEntries([entry('ModB/common/x.txt')]).paths;
  assert.equal(a[0].display, 'common/x.txt');
  assert.equal(collectOverlaps([{ paths: a }, { paths: b }]).length, 1);
});

test('ZIP wrapper is detected from descriptor.mod when metadata and unrelated root files exist', () => {
  const result = normalizeZipEntries([entry('Mod/descriptor.mod'), entry('Mod/common/x.txt'), entry('README.md')]);
  assert.deepEqual(result.paths.map((item) => item.display), ['common/x.txt']);
});

test('ambiguous descriptor wrapper preserves outside game paths and reports a warning', () => {
  const result = normalizeZipEntries([
    entry('Mod/descriptor.mod'),
    entry('Mod/common/ideas/x.txt', 17),
    entry('common/events/other.txt', 23),
    entry('README.md')
  ]);
  assert.deepEqual(result.paths.map((item) => item.display), ['Mod/common/ideas/x.txt', 'common/events/other.txt']);
  assert.deepEqual(result.warnings, [{ code: 'wrapperNotApplied', params: { wrapper: 'Mod', count: 1 } }]);
  assert.equal(result.paths[0].size, 17);
  assert.equal(result.paths[0].compressed, 17);
});

test('multiple ZIP descriptor roots are preserved and reported without choosing one', () => {
  const result = normalizeZipEntries([
    entry('ModA/descriptor.mod'), entry('ModA/common/a.txt'),
    entry('ModB/descriptor.mod'), entry('ModB/events/b.txt')
  ]);
  assert.deepEqual(result.paths.map((item) => item.display), ['ModA/common/a.txt', 'ModB/events/b.txt']);
  assert.deepEqual(result.warnings, [{ code: 'multipleDescriptorRoots', params: { roots: 'ModA, ModB' } }]);
});

test('ambiguous common ZIP folder preserves outside game paths and reports a warning', () => {
  const result = normalizeZipEntries([entry('MyMod/common/a.txt'), entry('common/events/b.txt'), entry('README.md')]);
  assert.deepEqual(result.paths.map((item) => item.display), ['MyMod/common/a.txt', 'common/events/b.txt']);
  assert.deepEqual(result.warnings, [{ code: 'commonFolderNotApplied', params: { wrapper: 'MyMod', count: 1 } }]);
});

test('service entries outside a valid ZIP wrapper do not block stripping and remain counted', () => {
  const result = normalizeZipEntries([
    entry('Mod/descriptor.mod'), entry('Mod/common/a.txt'), entry('README.md'), entry('.git/config')
  ]);
  assert.deepEqual(result.paths.map((item) => item.display), ['common/a.txt']);
  assert.equal(result.skippedService, 2);
  assert.equal(result.wrapper, 'Mod');
  assert.deepEqual(result.warnings, []);
});

test('ZIP wrapper matching is case-insensitive and unsafe paths do not affect detection', () => {
  const result = normalizeZipEntries([
    entry('Mod/descriptor.mod'), entry('MOD/common/a.txt'),
    { ...entry('../escape.txt'), unsafe: true }
  ]);
  assert.deepEqual(result.paths.map((item) => item.display), ['common/a.txt']);
  assert.equal(result.skippedUnsafe, 1);
  assert.equal(result.wrapper, 'Mod');
});

test('service files and VCS internals do not become overlaps', () => {
  const paths = ['thumbnail.png', 'README.md', '.git/config', '.gitignore', 'common/game.txt'];
  const result = normalizeZipEntries(paths.map((path) => entry(path)));
  assert.deepEqual(result.paths.map((item) => item.display), ['common/game.txt']);
  assert.equal(result.skippedService, 4);
  const folder = normalizeFolderEntries(paths.map((relative) => ({ relative, file: { size: 1 } })));
  assert.deepEqual(folder.paths.map((item) => item.display), ['common/game.txt']);
});

test('no descriptor keeps the complete selected folder; a nested sample never silently drops other files', () => {
  const noDescriptor = normalizeSelectedFolder([file('Mod/common/x.txt'), file('Mod/notes.txt')])[0];
  assert.equal(noDescriptor.warning, 'noDescriptor');
  assert.deepEqual(normalizeFolderEntries(noDescriptor.entries).paths.map((item) => item.display), ['common/x.txt', 'notes.txt']);
  const nested = normalizeSelectedFolder([file('Collection/docs/example/descriptor.mod'), file('Collection/docs/example/common/x.txt'), file('Collection/common/actual.txt')])[0];
  assert.equal(nested.warning, 'nestedDescriptor');
  assert.equal(nested.modRoot, '');
  assert.equal(normalizeFolderEntries(nested.entries).paths.length, 2);
});

test('multiple nested descriptors are distinct groups and marked informationally', () => {
  const groups = normalizeSelectedFolder([file('Collection/A/descriptor.mod'), file('Collection/A/common/x.txt'), file('Collection/B/descriptor.mod'), file('Collection/B/common/x.txt')]);
  assert.equal(groups.length, 2);
  assert.ok(groups.every((group) => group.warning === 'multipleMods'));
});

test('folder descriptor at root and legacy descriptor metadata are excluded from game paths', () => {
  const group = normalizeSelectedFolder([file('Mod/descriptor.mod'), file('Mod/common/ideas/x.txt')])[0];
  assert.equal(normalizeFolderEntries(group.entries).paths[0].display, 'common/ideas/x.txt');
  const legacy = normalizeSelectedFolder([file('mods/foo.mod'), file('mods/foo/common/x.txt')])[0];
  assert.equal(legacy.modRoot, 'foo');
  assert.equal(normalizeFolderEntries(legacy.entries, legacy.modRoot).paths[0].display, 'common/x.txt');
});

test('unsafe paths are counted, excluded, and cannot create a valid empty folder source', () => {
  const result = normalizeFolderEntries([{ relative: 'common/x.txt', file: { size: 1 } }, { relative: 'common/X.txt', file: { size: 1 } }, { relative: '../escape.txt', file: { size: 1 } }]);
  assert.equal(result.paths.length, 1);
  assert.equal(result.duplicateEntries, 1);
  assert.equal(result.skippedUnsafe, 1);
  const onlyUnsafe = normalizeZipEntries([{ ...entry('../escape'), unsafe: true }]);
  assert.equal(onlyUnsafe.paths.length, 0);
  assert.equal(onlyUnsafe.skippedUnsafe, 1);
});

test('descriptor-only archive has no game paths', () => {
  assert.equal(normalizeZipEntries([entry('Mod/descriptor.mod')]).paths.length, 0);
});

test('overlap search matches paths and source names without changing the source list', () => {
  const mods = [
    { name: 'Northern Lights', filename: 'winter.zip', paths: normalizeZipEntries([entry('Mod/common/ideas/weather.txt'), entry('Mod/common/ideas/color.txt')]).paths },
    { name: 'Balance Patch', filename: 'balance.zip', paths: normalizeZipEntries([entry('Other/common/ideas/weather.txt')]).paths }
  ];
  const overlaps = collectOverlaps(mods);
  assert.equal(filterOverlaps(overlaps, 'WEATHER').length, 1);
  assert.equal(filterOverlaps(overlaps, 'balance').length, 1);
  assert.equal(filterOverlaps(overlaps, 'winter.zip').length, 1);
  assert.equal(filterOverlaps(overlaps, 'missing').length, 0);
  assert.equal(filterOverlaps(overlaps, '  ').length, overlaps.length);
  assert.equal(overlaps.length, 1);
});

test('EOCD accepts trailing bytes after its declared comment', () => {
  const bytes = new Uint8Array(27); const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true); view.setUint16(20, 0, true);
  assert.equal(findEndRecord(bytes).offset, 0);
});

test('EOCD rejects an invalid signature', () => assert.throws(() => findEndRecord(new Uint8Array(22)), /invalid ZIP/));
