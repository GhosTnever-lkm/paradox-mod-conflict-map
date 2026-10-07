(() => {
  'use strict';

  const MAX_FILE_BYTES = 500 * 1024 * 1024;
  const MAX_ENTRIES = 100_000;
  const MAX_TOTAL_EXPANDED = 4 * 1024 * 1024 * 1024;
  const state = { locale: 'ru', mods: [], dragging: null, demo: false };
  const $ = (id) => document.getElementById(id);
  const ui = {
    language: $('language'), input: $('zip-input'), dropzone: $('dropzone'), mods: $('mods'), empty: $('empty'),
    conflicts: $('conflicts'), summary: $('summary'), error: $('error'), export: $('export'), demo: $('demo'), clear: $('clear')
  };

  const copy = {
    ru: {
      eyebrow: 'БЕСПЛАТНО · ЛОКАЛЬНО · ДЛЯ МОДДЕРОВ', heroTitle: 'Узнай, где моды<br><em>перезаписывают файлы.</em>',
      heroText: 'Сравни ZIP-архивы модов Paradox по внутренним путям. Переставляй порядок, чтобы увидеть потенциально перекрываемые файлы.',
      toolLabel: 'КАРТА ПЕРЕСЕЧЕНИЙ', toolTitle: 'Добавь ZIP-архивы', demo: 'Загрузить пример', addZips: 'Выбрать ZIP',
      workspaceHint: 'Порядок сверху вниз: нижние моды условно перекрывают файлы верхних, если игра обрабатывает одинаковые пути по этому правилу.',
      orderLabel: 'ПРИОРИТЕТ ЗАГРУЗКИ', orderTitle: 'Моды и порядок', clear: 'Очистить', dropTitle: 'Перетащи сюда ZIP-архивы', dropSub: 'или нажми «Выбрать ZIP»',
      empty: 'Добавь хотя бы два ZIP-мода, чтобы увидеть общие пути.', first: 'загружается раньше', last: 'загружается позже', reportLabel: 'ОТЧЁТ', reportTitle: 'Пересечения файлов', export: 'Экспорт JSON',
      summaryEmpty: 'Результат появится после добавления двух или более архивов.', summaryMods: 'архива', summaryPaths: 'общих путей', summaryFiles: 'файловых записей', noOverlap: 'Одинаковых игровых путей не найдено в выбранных ZIP.',
      pathHits: 'архива', earlier: 'выше в выбранном порядке', later: 'ниже в выбранном порядке', lastMod: 'последний в списке · возможное перекрытие',
      cautious: 'Совпадение пути не доказывает несовместимость. Это только сигнал для ручной проверки.',
      howLabel: 'КАК ЧИТАТЬ РЕЗУЛЬТАТ', howTitle: 'Пересечение — повод<br><em>проверить, а не паниковать.</em>',
      howText: 'Одинаковый относительный путь в нескольких ZIP может означать, что один мод заменяет файл другого. Это не доказывает несовместимость: игра, формат данных и намеренные патчи влияют на результат.',
      card1Title: 'Путь совпадает', card1: 'В отчёт попадают одинаковые пути файлов после нормализации регистра и разделителей.',
      card2Title: 'Порядок важен', card2: 'Отчёт показывает выбранный порядок и последний архив в списке. Фактические правила игры могут отличаться.',
      card3Title: 'Содержимое не читается', card3: 'Приложение сравнивает метаданные ZIP. Оно не проверяет код, семантику файлов, зависимости и ошибки игры.',
      privacyTitle: 'Архивы остаются на твоём устройстве', privacyText: 'Приложение читает только центральный каталог ZIP. Оно не распаковывает файлы, не отправляет их на сервер и не подключает внешние скрипты.',
      footer: 'Открытый код · MIT · локальная обработка', invalidZip: 'Похоже, это не ZIP-архив или в нём повреждён центральный каталог.', tooLarge: 'Архив больше лимита 500 МБ.', tooMany: 'В архиве слишком много записей для безопасного просмотра.',
      badDirectory: 'Некорректный каталог ZIP.', zip64Overflow: 'ZIP64 содержит размер, который браузер не может безопасно обработать.', invalidPath: 'В архиве есть путь за пределами корня или абсолютный путь. Он исключён из карты.',
      duplicateInternal: 'В одном архиве повторяется путь файла; отображается один путь, но число записей показано отдельно.', unsupported: 'Метод сжатия в этой проверке не влияет на чтение путей.',
      countNote: 'учитываются только файлы внутри архива; descriptor.mod исключён.', demoModA: 'Northern Lights Overhaul', demoModB: 'UI Rebalance Patch', demoModC: 'Community Fix Pack',
      demoName: 'пример · ZIP не загружен', downloadName: 'mod-conflict-map-report.json', dropped: 'Сюда можно перетащить несколько ZIP-файлов.',
      readFailed: 'Не удалось прочитать ZIP. Попробуй другой архив или проверь его в архиваторе.',
      sourceOne: 'Совпадающий файл', reportName: 'Mod Conflict Map', reportWarning: 'Это карта совпадающих путей, а не тест совместимости или безопасности.'
    },
    en: {
      eyebrow: 'FREE · LOCAL · FOR MODDERS', heroTitle: 'See where mods<br><em>replace the same files.</em>',
      heroText: 'Compare Paradox mod ZIP archives by internal file paths. Reorder them to inspect potential overrides.',
      toolLabel: 'OVERLAP MAP', toolTitle: 'Add ZIP archives', demo: 'Load example', addZips: 'Choose ZIPs',
      workspaceHint: 'Order runs top to bottom. Lower items may override matching paths above them if the game applies that rule.',
      orderLabel: 'LOAD PRIORITY', orderTitle: 'Mods and order', clear: 'Clear', dropTitle: 'Drop ZIP archives here', dropSub: 'or click “Choose ZIPs”',
      empty: 'Add at least two mod ZIPs to find shared paths.', first: 'loaded earlier', last: 'loaded later', reportLabel: 'REPORT', reportTitle: 'File overlaps', export: 'Export JSON',
      summaryEmpty: 'Results appear after you add two or more archives.', summaryMods: 'archives', summaryPaths: 'shared paths', summaryFiles: 'file entries', noOverlap: 'No identical game paths were found in the selected ZIPs.',
      pathHits: 'archives', earlier: 'higher in selected order', later: 'lower in selected order', lastMod: 'last in list · possible override',
      cautious: 'A matching path does not prove incompatibility. It is only a signal for manual review.',
      howLabel: 'READING THE RESULT', howTitle: 'An overlap means<br><em>review it, not panic.</em>',
      howText: 'The same relative path in multiple ZIPs may mean that one mod replaces another mod’s file. It does not prove incompatibility: game behavior, file formats, and intentional patches affect the outcome.',
      card1Title: 'Matching paths', card1: 'The report groups identical file paths after normalizing case and separators.',
      card2Title: 'Order matters', card2: 'The report shows your selected order and the last archive in the list. Actual game rules may differ.',
      card3Title: 'No contents are parsed', card3: 'The app compares ZIP metadata. It does not inspect code, file semantics, dependencies, or in-game errors.',
      privacyTitle: 'Your archives stay on your device', privacyText: 'The app reads only the ZIP central directory. It does not extract files, upload them, or load external scripts.',
      footer: 'Open source · MIT · processed locally', invalidZip: 'This does not look like a ZIP archive or its central directory is damaged.', tooLarge: 'Archive exceeds the 500 MB limit.', tooMany: 'Archive has too many entries to inspect safely.',
      badDirectory: 'Invalid ZIP central directory.', zip64Overflow: 'ZIP64 contains a size the browser cannot process safely.', invalidPath: 'Archive contains an absolute or out-of-root path. It was excluded from the map.',
      duplicateInternal: 'A file path repeats within one archive; one path is shown, while entry counts remain separate.', unsupported: 'Compression method does not affect path reading in this inspection.',
      countNote: 'only files inside the archive are counted; descriptor.mod is excluded.', demoModA: 'Northern Lights Overhaul', demoModB: 'UI Rebalance Patch', demoModC: 'Community Fix Pack',
      demoName: 'example · no ZIP uploaded', downloadName: 'mod-conflict-map-report.json', dropped: 'You can drop multiple ZIP files here.',
      readFailed: 'Could not read this ZIP. Try another archive or inspect it with an archive tool.',
      sourceOne: 'Matching file', reportName: 'Mod Conflict Map', reportWarning: 'This is a path overlap map, not a compatibility or security test.'
    }
  };

  const t = (key) => copy[state.locale][key] || key;
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function setLanguage(locale) {
    state.locale = locale;
    document.documentElement.lang = locale;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const value = t(element.dataset.i18n);
      if (element.tagName === 'H1' || ['heroTitle', 'howTitle'].includes(element.dataset.i18n)) element.innerHTML = value;
      else element.textContent = value;
    });
    ui.language.textContent = locale === 'ru' ? 'EN' : 'RU';
    ui.dropzone.querySelector('strong').textContent = t('dropTitle');
    ui.dropzone.querySelector('span:not(.upload)').textContent = t('dropSub');
    render();
  }

  function safeInteger64(view, offset) {
    const value = view.getBigUint64(offset, true);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(t('zip64Overflow'));
    return Number(value);
  }

  const cp437High = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
  function decodeZipName(bytes, utf8) {
    if (utf8) return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    let result = '';
    for (const byte of bytes) result += byte < 128 ? String.fromCharCode(byte) : cp437High[byte - 128];
    return result;
  }

  function makeId() {
    return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `mod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function findEndRecord(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const min = Math.max(0, bytes.length - 65_557);
    for (let offset = bytes.length - 22; offset >= min; offset--) {
      if (view.getUint32(offset, true) === 0x06054b50) {
        const commentLength = view.getUint16(offset + 20, true);
        if (offset + 22 + commentLength === bytes.length) return { view, offset };
      }
    }
    throw new Error(t('invalidZip'));
  }

  async function readDirectory(file) {
    if (file.size > MAX_FILE_BYTES) throw new Error(t('tooLarge'));
    if (file.size < 22) throw new Error(t('invalidZip'));
    const tailStart = Math.max(0, file.size - 65_557);
    const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
    const end = findEndRecord(tail);
    const diskNumber = end.view.getUint16(end.offset + 4, true);
    const directoryDisk = end.view.getUint16(end.offset + 6, true);
    if (diskNumber !== 0 || directoryDisk !== 0) throw new Error(t('invalidZip'));
    let entries = end.view.getUint16(end.offset + 10, true);
    let directorySize = end.view.getUint32(end.offset + 12, true);
    let directoryOffset = end.view.getUint32(end.offset + 16, true);

    if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
      const absoluteEndOffset = tailStart + end.offset;
      const locatorStart = absoluteEndOffset - 20;
      if (locatorStart < 0) throw new Error(t('invalidZip'));
      const locator = new DataView(await file.slice(locatorStart, absoluteEndOffset).arrayBuffer());
      if (locator.getUint32(0, true) !== 0x07064b50 || locator.getUint32(4, true) !== 0 || locator.getUint32(16, true) !== 1) throw new Error(t('invalidZip'));
      const zip64Offset = safeInteger64(locator, 8);
      const record = new DataView(await file.slice(zip64Offset, zip64Offset + 56).arrayBuffer());
      if (record.byteLength < 56 || record.getUint32(0, true) !== 0x06064b50 || record.getUint32(16, true) !== 0 || record.getUint32(20, true) !== 0) throw new Error(t('invalidZip'));
      const entriesOnDisk = safeInteger64(record, 24);
      entries = safeInteger64(record, 32);
      directorySize = safeInteger64(record, 40);
      directoryOffset = safeInteger64(record, 48);
      if (entriesOnDisk !== entries) throw new Error(t('invalidZip'));
    }
    if (entries > MAX_ENTRIES) throw new Error(t('tooMany'));
    if (directoryOffset + directorySize > file.size || directoryOffset + directorySize < directoryOffset) throw new Error(t('badDirectory'));
    const directory = new Uint8Array(await file.slice(directoryOffset, directoryOffset + directorySize).arrayBuffer());
    const view = new DataView(directory.buffer, directory.byteOffset, directory.byteLength);
    const paths = [];
    let offset = 0;
    let expandedTotal = 0;
    let skippedUnsafe = 0;
    let duplicateEntries = 0;
    const seenInArchive = new Set();
    for (let index = 0; index < entries; index++) {
      if (offset + 46 > directory.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error(t('badDirectory'));
      const flags = view.getUint16(offset + 8, true);
      let expanded = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const diskStart = view.getUint16(offset + 34, true);
      let compressed = view.getUint32(offset + 20, true);
      let localOffset = view.getUint32(offset + 42, true);
      const recordEnd = offset + 46 + nameLength + extraLength + commentLength;
      if (recordEnd > directory.length || (diskStart !== 0 && diskStart !== 0xffff)) throw new Error(t('badDirectory'));
      const rawName = directory.subarray(offset + 46, offset + 46 + nameLength);
      const name = decodeZipName(rawName, Boolean(flags & 0x0800)).replace(/\\/g, '/');
      const extraStart = offset + 46 + nameLength;
      let cursor = extraStart;
      const extraEnd = extraStart + extraLength;
      let zip64ExtraFound = false;
      while (cursor + 4 <= extraEnd) {
        const id = view.getUint16(cursor, true);
        const length = view.getUint16(cursor + 2, true);
        const value = cursor + 4;
        if (value + length > extraEnd) throw new Error(t('badDirectory'));
        if (id === 0x0001) {
          zip64ExtraFound = true;
          let zip64Cursor = value;
          const zip64End = value + length;
          if (expanded === 0xffffffff) { if (zip64Cursor + 8 > zip64End) throw new Error(t('badDirectory')); expanded = safeInteger64(view, zip64Cursor); zip64Cursor += 8; }
          if (compressed === 0xffffffff) { if (zip64Cursor + 8 > zip64End) throw new Error(t('badDirectory')); compressed = safeInteger64(view, zip64Cursor); zip64Cursor += 8; }
          if (localOffset === 0xffffffff) { if (zip64Cursor + 8 > zip64End) throw new Error(t('badDirectory')); localOffset = safeInteger64(view, zip64Cursor); zip64Cursor += 8; }
          if (diskStart === 0xffff) {
            if (zip64Cursor + 4 > zip64End || view.getUint32(zip64Cursor, true) !== 0) throw new Error(t('badDirectory'));
          }
          break;
        }
        cursor = value + length;
      }
      if (diskStart === 0xffff && !zip64ExtraFound) throw new Error(t('badDirectory'));
      if (localOffset >= directoryOffset) throw new Error(t('badDirectory'));
      offset = recordEnd;
      if (name.endsWith('/') || name.endsWith('\u0000')) continue;
      const lower = name.toLowerCase();
      const unsafe = name.startsWith('/') || /^[a-z]:\//i.test(name) || name.split('/').includes('..') || name.includes('\u0000');
      if (unsafe) { skippedUnsafe++; continue; }
      if (lower.split('/').pop() === 'descriptor.mod') continue;
      if (expanded > 1024 * 1024 * 1024 || expandedTotal + expanded > MAX_TOTAL_EXPANDED) throw new Error(t('tooLarge'));
      expandedTotal += expanded;
      if (seenInArchive.has(lower)) duplicateEntries++;
      else { seenInArchive.add(lower); paths.push({ key: lower, display: name, size: expanded, compressed, method: view.getUint16(offset - (46 + nameLength + extraLength + commentLength) + 10, true), encrypted: Boolean(flags & 1) }); }
    }
    if (offset !== directory.length) throw new Error(t('badDirectory'));
    if (!paths.length) throw new Error(t('invalidZip'));
    return { paths, skippedUnsafe, duplicateEntries, expandedTotal, fileSize: file.size };
  }

  function safeModName(name) { return String(name).replace(/\.zip$/i, '').replace(/[<>"'&]/g, '').slice(0, 90) || 'Mod'; }

  async function addFiles(fileList) {
    ui.error.hidden = true;
    const files = [...fileList].filter((file) => file.name.toLowerCase().endsWith('.zip'));
    if (!files.length) { ui.error.textContent = t('invalidZip'); ui.error.hidden = false; return; }
    for (const file of files) {
      if (state.mods.some((mod) => mod.file && mod.file.name === file.name && mod.file.size === file.size && mod.file.lastModified === file.lastModified)) continue;
      try {
        const parsed = await readDirectory(file);
        state.mods.push({ id: makeId(), name: safeModName(file.name), filename: file.name, file, ...parsed });
      } catch (error) {
        ui.error.textContent = `${file.name}: ${error.message || t('readFailed')}`;
        ui.error.hidden = false;
      }
    }
    state.demo = false;
    render();
  }

  function collectOverlaps() {
    const byPath = new Map();
    state.mods.forEach((mod, modIndex) => {
      mod.paths.forEach((entry) => {
        if (!byPath.has(entry.key)) byPath.set(entry.key, []);
        byPath.get(entry.key).push({ modIndex, mod, entry });
      });
    });
    return [...byPath.entries()].filter(([, hits]) => hits.length > 1).map(([key, hits]) => ({ key, hits })).sort((a, b) => b.hits.length - a.hits.length || a.key.localeCompare(b.key));
  }

  function renderSummary(overlaps) {
    if (state.mods.length < 2) {
      ui.summary.innerHTML = `<div class="summary-icon">⌕</div><p>${esc(t('summaryEmpty'))}</p>`;
      ui.export.disabled = true;
      return;
    }
    const totalEntries = state.mods.reduce((sum, mod) => sum + mod.paths.length, 0);
    ui.summary.innerHTML = `<div class="summary-stats"><div class="stat"><span>${esc(t('summaryMods'))}</span><strong>${state.mods.length}</strong></div><div class="stat"><span>${esc(t('summaryPaths'))}</span><strong>${overlaps.length}</strong></div><div class="stat"><span>${esc(t('summaryFiles'))}</span><strong>${totalEntries}</strong></div></div>`;
    ui.export.disabled = false;
  }

  function renderConflicts(overlaps) {
    if (state.mods.length < 2) { ui.conflicts.innerHTML = ''; return; }
    if (!overlaps.length) { ui.conflicts.innerHTML = `<div class="empty-state">${esc(t('noOverlap'))}</div>`; return; }
    ui.conflicts.innerHTML = overlaps.map((overlap) => {
      const lastIndex = overlap.hits.at(-1).modIndex;
      const items = overlap.hits.map(({ modIndex, mod, entry }) => `<div class="source-row ${modIndex === lastIndex ? 'winner' : ''}"><span>${esc(mod.name)}${modIndex === lastIndex ? ` · ${esc(t('lastMod'))}` : ''}</span><small>${fmtBytes(entry.size)}</small></div>`).join('');
      return `<details class="conflict"><summary><span class="path-icon">⌁</span><span class="path-name">${esc(overlap.hits[0].entry.display)}</span><span class="hit-count">${overlap.hits.length} ${esc(t('pathHits'))}</span></summary><div class="conflict-body">${items}<p class="note">${esc(t('cautious'))}</p></div></details>`;
    }).join('');
  }

  function fmtBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024; let unit = units[0];
    for (let i = 1; i < units.length && value >= 1024; i++) { value /= 1024; unit = units[i]; }
    return `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
  }

  function renderMods() {
    ui.mods.innerHTML = state.mods.map((mod, index) => `<li class="mod" draggable="${!state.demo}" data-id="${esc(mod.id)}"><span class="mod-index">${String(index + 1).padStart(2, '0')}</span><div class="mod-info"><input aria-label="Mod name" maxlength="90" value="${esc(mod.name)}" ${state.demo ? 'readonly' : ''}><small>${esc(mod.filename)} · ${mod.paths.length} ${esc(t('summaryFiles'))}${mod.skippedUnsafe ? ` · ⚠ ${mod.skippedUnsafe}` : ''}</small></div><div class="mod-actions"><button class="icon-button" data-action="up" aria-label="Move up" ${index === 0 || state.demo ? 'disabled' : ''}>↑</button><button class="icon-button" data-action="down" aria-label="Move down" ${index === state.mods.length - 1 || state.demo ? 'disabled' : ''}>↓</button><button class="icon-button remove" data-action="remove" aria-label="Remove mod" ${state.demo ? 'disabled' : ''}>×</button></div></li>`).join('');
    ui.empty.hidden = state.mods.length > 0;
  }

  function render() {
    renderMods();
    const overlaps = collectOverlaps();
    renderSummary(overlaps);
    renderConflicts(overlaps);
  }

  function downloadReport() {
    const overlaps = collectOverlaps();
    const report = {
      tool: t('reportName'),
      generatedAt: new Date().toISOString(),
      notice: t('reportWarning'),
      loadOrderTopToBottom: state.mods.map((mod, index) => ({ position: index + 1, name: mod.name, archive: mod.filename, fileEntries: mod.paths.length, skippedUnsafePaths: mod.skippedUnsafe, duplicateEntriesWithinArchive: mod.duplicateEntries })),
      matchingPaths: overlaps.map(({ key, hits }) => ({ path: hits[0].entry.display, normalizedPath: key, archives: hits.map(({ mod, modIndex, entry }) => ({ name: mod.name, archive: mod.filename, position: modIndex + 1, sizeBytes: entry.size })) })),
      limitations: t('reportWarning')
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = t('downloadName'); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadDemo() {
    const examples = [
      { name: t('demoModA'), filename: 'northern-lights-overhaul.zip', paths: ['common/ideas/northern_ideas.txt', 'common/countries/ABC.txt', 'events/northern_events.txt', 'interface/northern.gfx', 'gfx/interface/northern.dds'] },
      { name: t('demoModB'), filename: 'ui-rebalance-patch.zip', paths: ['interface/northern.gfx', 'common/ideas/northern_ideas.txt', 'interface/rebalance.gui', 'localisation/english/rebalance_l_english.yml'] },
      { name: t('demoModC'), filename: 'community-fix-pack.zip', paths: ['common/countries/ABC.txt', 'common/decisions/community.txt', 'events/northern_events.txt'] }
    ];
    state.demo = true;
    state.mods = examples.map((item, index) => ({ id: `demo-${index}`, name: item.name, filename: `${item.filename} (${t('demoName')})`, paths: item.paths.map((path) => ({ key: path.toLowerCase(), display: path, size: 0, compressed: 0, method: 0, encrypted: false })), skippedUnsafe: 0, duplicateEntries: 0 }));
    render();
  }

  function reorder(from, to) {
    if (from < 0 || to < 0 || from === to || from >= state.mods.length || to >= state.mods.length) return;
    const [item] = state.mods.splice(from, 1);
    state.mods.splice(to, 0, item);
    render();
  }

  ui.input.addEventListener('change', (event) => { addFiles(event.target.files); event.target.value = ''; });
  ui.demo.addEventListener('click', loadDemo);
  ui.clear.addEventListener('click', () => { state.mods = []; state.demo = false; ui.error.hidden = true; render(); });
  ui.export.addEventListener('click', downloadReport);
  ui.language.addEventListener('click', () => setLanguage(state.locale === 'ru' ? 'en' : 'ru'));
  ui.dropzone.addEventListener('dragover', (event) => { event.preventDefault(); ui.dropzone.classList.add('drag'); });
  ui.dropzone.addEventListener('dragleave', () => ui.dropzone.classList.remove('drag'));
  ui.dropzone.addEventListener('drop', (event) => { event.preventDefault(); ui.dropzone.classList.remove('drag'); addFiles(event.dataTransfer.files); });
  $('mods').addEventListener('dragstart', (event) => {
    const item = event.target.closest('.mod'); if (!item || state.demo) return;
    state.dragging = state.mods.findIndex((mod) => mod.id === item.dataset.id);
    item.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.dataset.id);
  });
  $('mods').addEventListener('dragend', () => { document.querySelectorAll('.mod').forEach((item) => item.classList.remove('dragging')); state.dragging = null; });
  $('mods').addEventListener('dragover', (event) => { const target = event.target.closest('.mod'); if (!target || state.dragging === null) return; event.preventDefault(); });
  $('mods').addEventListener('drop', (event) => { const target = event.target.closest('.mod'); if (!target || state.dragging === null) return; event.preventDefault(); const to = state.mods.findIndex((mod) => mod.id === target.dataset.id); reorder(state.dragging, to); state.dragging = null; });
  $('mods').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const item = button.closest('.mod'); const index = state.mods.findIndex((mod) => mod.id === item.dataset.id);
    if (button.dataset.action === 'up') reorder(index, index - 1);
    if (button.dataset.action === 'down') reorder(index, index + 1);
    if (button.dataset.action === 'remove') { state.mods.splice(index, 1); render(); }
  });
  $('mods').addEventListener('input', (event) => {
    if (!event.target.matches('.mod-info input')) return;
    const item = event.target.closest('.mod'); const mod = state.mods.find((entry) => entry.id === item.dataset.id);
    if (mod) mod.name = event.target.value.slice(0, 90);
  });

  function initStaticLocalization() {
    document.documentElement.lang = state.locale;
    ui.language.textContent = 'EN';
    ui.dropzone.querySelector('strong').textContent = t('dropTitle');
    ui.dropzone.querySelector('span:not(.upload)').textContent = t('dropSub');
  }
  initStaticLocalization();
  render();
})();
