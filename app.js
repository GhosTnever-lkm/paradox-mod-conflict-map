import { collectOverlaps as groupOverlaps, findEndRecord as locateEndRecord, normalizeFolderEntries, normalizeSelectedFolder, normalizeZipEntries } from './conflict-core.mjs';

(() => {
  'use strict';

  const MAX_FILE_BYTES = 500 * 1024 * 1024;
  const MAX_ENTRIES = 100_000;
  const MAX_TOTAL_EXPANDED = 4 * 1024 * 1024 * 1024;
  const state = { locale: 'ru', mods: [], dragging: null, demo: false };
  const $ = (id) => document.getElementById(id);
  const ui = {
    language: $('language'), input: $('zip-input'), folderInput: $('folder-input'), folderButton: $('folder-button'), dropzone: $('dropzone'), mods: $('mods'), empty: $('empty'),
    conflicts: $('conflicts'), summary: $('summary'), error: $('error'), export: $('export'), demo: $('demo'), clear: $('clear')
  };

  const copy = {
    ru: {
      eyebrow: 'БЕСПЛАТНО · ЛОКАЛЬНО · ДЛЯ МОДДЕРОВ', heroTitle: 'Найди одинаковые пути<br><em>в разных модах.</em>',
      heroText: 'Сравни ZIP-архивы или папки модов Paradox по внутренним путям. Переставляй порядок, чтобы увидеть потенциальные пересечения файлов.',
      step1: '01 / Добавь ZIP или папку', step2: '02 / Расставь порядок', step3: '03 / Изучи пересечения',
      toolLabel: 'КАРТА ПЕРЕСЕЧЕНИЙ', toolTitle: 'Добавь ZIP или папки модов', demo: 'Загрузить пример', addZips: 'Выбрать ZIP', addFolder: 'Выбрать папку',
      folderHint: 'Можно выбрать папку мода или несколько модов. Без descriptor.mod приложение использует выбранную папку целиком.',
      workspaceHint: 'Порядок сверху вниз: нижние моды условно перекрывают файлы верхних, если игра обрабатывает одинаковые пути по этому правилу.',
      orderLabel: 'ПОРЯДОК МОДОВ', orderTitle: 'Моды и порядок', clear: 'Очистить', dropTitle: 'Перетащи сюда ZIP-архивы', dropSub: 'ZIP или папку можно выбрать кнопками выше',
      empty: 'Добавь хотя бы два мода, чтобы увидеть общие пути.', first: 'выше в выбранном порядке', last: 'ниже в выбранном порядке', reportLabel: 'ОТЧЁТ', reportTitle: 'Пересечения файлов', export: 'Экспорт JSON',
      summaryEmpty: 'Результат появится после добавления двух или более модов.', summaryMods: 'мода', summaryPaths: 'общих путей', summaryFiles: 'файловых записей', noOverlap: 'Одинаковых игровых путей не найдено в выбранных модах.',
      pathHits: 'мода', earlier: 'выше в выбранном порядке', later: 'ниже в выбранном порядке', lastMod: 'ниже в списке · возможное перекрытие',
      cautious: 'Совпадение пути не доказывает несовместимость. Это только сигнал для ручной проверки.',
      howLabel: 'КАК ЧИТАТЬ РЕЗУЛЬТАТ', howTitle: 'Пересечение — повод<br><em>проверить, а не паниковать.</em>',
      howText: 'Одинаковый относительный путь означает, что несколько модов содержат файл по одному адресу. Это может быть намеренная замена, патч или простое совпадение; само по себе это не доказывает несовместимость.',
      card1Title: 'Путь совпадает', card1: 'В отчёт попадают одинаковые пути файлов после нормализации регистра и разделителей.',
      card2Title: 'Порядок важен', card2: 'Отчёт показывает выбранный порядок и последний архив в списке. Фактические правила игры могут отличаться.',
      card3Title: 'Содержимое не читается', card3: 'Приложение использует пути из ZIP или выбранной папки. Оно не проверяет код, семантику файлов, зависимости и ошибки игры.',
      privacyTitle: 'Файлы остаются на твоём устройстве', privacyText: 'Для папок приложение читает только относительные пути и размеры выбранных файлов; из ZIP — центральный каталог. Содержимое файлов не отправляется на сервер, сами архивы не распаковываются.',
      footer: 'Открытый код · MIT · локальная обработка', invalidZip: 'Похоже, это не ZIP-архив или в нём повреждён центральный каталог.', invalidFolder: 'В выбранной папке не найдено файлов. Выбери папку мода с содержимым.', multipleMods: 'Добавлено несколько модов из выбранной папки.', noDescriptor: 'descriptor.mod не найден: папка добавлена целиком. Старый формат .mod рядом с папкой тоже поддерживается.', nestedDescriptor: 'Внутри выбранной папки найден descriptor.mod, но есть и файлы снаружи. Добавлена вся папка, чтобы не потерять содержимое.', emptyZip: 'Архив прочитан, но игровые файлы не найдены. descriptor.mod и служебные файлы исключены.', unsafeOnly: 'В архиве найдены только небезопасные пути; они исключены и не сравниваются.', skippedServices: 'служебных файлов исключено', tooLarge: 'ZIP-архив превышает лимит 500 МБ.', expandedFileTooLarge: 'Файл внутри источника превышает лимит 1 ГБ.', expandedTotalTooLarge: 'Распакованный объём превышает лимит 4 ГБ.', tooMany: 'В ZIP или папке слишком много файлов для безопасного просмотра.', duplicateCount: 'дубликатов',
      badDirectory: 'Некорректный каталог ZIP.', zip64Overflow: 'ZIP64 содержит размер, который браузер не может безопасно обработать.', invalidPath: 'В архиве есть путь за пределами корня или абсолютный путь. Он исключён из карты.',
      duplicateInternal: 'В одном моде повторяется путь файла; отображается один путь, но число повторов показано отдельно.', unsupported: 'Метод сжатия в этой проверке не влияет на чтение путей.',
      countNote: 'учитываются только игровые файлы; descriptor.mod исключён.', demoModA: 'Northern Lights Overhaul', demoModB: 'UI Rebalance Patch', demoModC: 'Community Fix Pack',
      demoName: 'пример · файлы не загружены', folderSource: 'папка', zipSource: 'ZIP', downloadName: 'mod-conflict-map-report.json', dropped: 'Сюда можно перетащить несколько ZIP-файлов.',
      readFailed: 'Не удалось прочитать ZIP. Попробуй другой архив или проверь его в архиваторе.',
      sourceOne: 'Совпадающий файл', reportName: 'Mod Conflict Map', reportWarning: 'Это карта совпадающих путей, а не тест совместимости или безопасности.',
      sourceWarning: 'предупреждение о структуре', wrapperNotApplied: 'В ZIP найден descriptor.mod внутри «{wrapper}», но снаружи обнаружено игровых файлов: {count}. Сохранены исходные пути, корень не выделен.',
      multipleDescriptorRoots: 'В ZIP несколько descriptor.mod в разных папках: {roots}. Сохранены все пути, один корень не выбран.',
      commonFolderNotApplied: 'В ZIP найдена общая папка «{wrapper}», но вне неё обнаружено игровых файлов: {count}. Папка не удалена.'
    },
    en: {
      eyebrow: 'FREE · LOCAL · FOR MODDERS', heroTitle: 'Find matching paths<br><em>across your mods.</em>',
      heroText: 'Compare Paradox mod ZIP archives or folders by internal file paths. Reorder them to inspect potential overlaps.',
      step1: '01 / Add ZIP or folder', step2: '02 / Set your order', step3: '03 / Review overlaps',
      toolLabel: 'OVERLAP MAP', toolTitle: 'Add ZIPs or mod folders', demo: 'Load example', addZips: 'Choose ZIPs', addFolder: 'Choose folder',
      folderHint: 'Choose one mod folder or a collection. Without descriptor.mod, the selected folder is used as-is.',
      workspaceHint: 'Order runs top to bottom. Lower items may override matching paths above them if the game applies that rule.',
      orderLabel: 'MOD ORDER', orderTitle: 'Mods and order', clear: 'Clear', dropTitle: 'Drop ZIP archives here', dropSub: 'Use the buttons above to choose ZIPs or a folder',
      empty: 'Add at least two mods to find shared paths.', first: 'higher in selected order', last: 'lower in selected order', reportLabel: 'REPORT', reportTitle: 'File overlaps', export: 'Export JSON',
      summaryEmpty: 'Results appear after you add two or more mods.', summaryMods: 'mods', summaryPaths: 'shared paths', summaryFiles: 'file entries', noOverlap: 'No identical game paths were found in the selected mods.',
      pathHits: 'mods', earlier: 'higher in selected order', later: 'lower in selected order', lastMod: 'lower in the list · possible overlap',
      cautious: 'A matching path does not prove incompatibility. It is only a signal for manual review.',
      howLabel: 'READING THE RESULT', howTitle: 'An overlap means<br><em>review it, not panic.</em>',
      howText: 'The same relative path means multiple mods contain a file at the same address. That may be an intentional override, a patch, or a coincidence; by itself, it does not prove incompatibility.',
      card1Title: 'Matching paths', card1: 'The report groups identical file paths after normalizing case and separators.',
      card2Title: 'Order matters', card2: 'The report shows your selected order and the last archive in the list. Actual game rules may differ.',
      card3Title: 'No contents are parsed', card3: 'The app uses paths from ZIPs or the selected folder. It does not inspect code, file semantics, dependencies, or in-game errors.',
      privacyTitle: 'Your files stay on your device', privacyText: 'For folders, the app reads only selected file paths and sizes; for ZIPs, only the central directory. It never uploads file contents or extracts archives.',
      footer: 'Open source · MIT · processed locally', invalidZip: 'This does not look like a ZIP archive or its central directory is damaged.', invalidFolder: 'No files were found in the selected folder. Choose a mod folder with content.', multipleMods: 'Multiple mods were added from the selected folder.', noDescriptor: 'descriptor.mod was not found: the selected folder was added as-is. Legacy .mod files beside the folder are supported too.', nestedDescriptor: 'A nested descriptor.mod was found alongside files outside it. The whole selected folder was added to avoid dropping content.', emptyZip: 'The archive was read, but no game files were found. descriptor.mod and service files are excluded.', unsafeOnly: 'Only unsafe paths were found in this archive; they were excluded from comparison.', skippedServices: 'service files excluded', tooLarge: 'ZIP archive exceeds the 500 MB limit.', expandedFileTooLarge: 'A file inside the source exceeds the 1 GB limit.', expandedTotalTooLarge: 'Expanded content exceeds the 4 GB limit.', tooMany: 'ZIP or folder has too many files to inspect safely.', duplicateCount: 'duplicates',
      badDirectory: 'Invalid ZIP central directory.', zip64Overflow: 'ZIP64 contains a size the browser cannot process safely.', invalidPath: 'Archive contains an absolute or out-of-root path. It was excluded from the map.',
      duplicateInternal: 'A file path repeats within one archive; one path is shown, while entry counts remain separate.', unsupported: 'Compression method does not affect path reading in this inspection.',
      countNote: 'only game files are counted; descriptor.mod is excluded.', demoModA: 'Northern Lights Overhaul', demoModB: 'UI Rebalance Patch', demoModC: 'Community Fix Pack',
      demoName: 'example · no files loaded', folderSource: 'folder', zipSource: 'ZIP', downloadName: 'mod-conflict-map-report.json', dropped: 'You can drop multiple ZIP files here.',
      readFailed: 'Could not read this ZIP. Try another archive or inspect it with an archive tool.',
      sourceOne: 'Matching file', reportName: 'Mod Conflict Map', reportWarning: 'This is a path overlap map, not a compatibility or security test.',
      sourceWarning: 'ambiguous archive layout', wrapperNotApplied: 'The ZIP has descriptor.mod inside “{wrapper}”, but {count} game file(s) are outside it. All archive-relative paths were kept; no root was selected.',
      multipleDescriptorRoots: 'The ZIP has multiple descriptor.mod files in different folders: {roots}. All paths were kept; no single root was selected.',
      commonFolderNotApplied: 'The ZIP has a common folder “{wrapper}”, but {count} game file(s) are outside it. The common folder was not removed.'
    }
  };

  const t = (key) => copy[state.locale][key] || key;
  const formatMessage = (key, params = {}) => t(key).replace(/\{([\w]+)\}/g, (match, name) => params[name] == null ? match : String(params[name]));
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
    try { return locateEndRecord(bytes); }
    catch { throw new Error(t('invalidZip')); }
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
    let duplicateEntries = 0;
    let skippedService = 0;
    const rawPaths = [];
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
      if (unsafe) { rawPaths.push({ key: lower, display: name, unsafe: true }); continue; }
      if (expanded > 1024 * 1024 * 1024) throw new Error(t('expandedFileTooLarge'));
      if (expandedTotal + expanded > MAX_TOTAL_EXPANDED) throw new Error(t('expandedTotalTooLarge'));
      expandedTotal += expanded;
      if (seenInArchive.has(lower)) duplicateEntries++;
      else { seenInArchive.add(lower); rawPaths.push({ key: lower, display: name, unsafe: false, size: expanded, compressed, method: view.getUint16(offset - (46 + nameLength + extraLength + commentLength) + 10, true), encrypted: Boolean(flags & 1) }); }
    }
    if (offset !== directory.length) throw new Error(t('badDirectory'));
    // A structurally valid archive may contain only descriptor metadata or unsafe entries.
    const normalized = normalizeZipEntries(rawPaths);
    return { paths: normalized.paths, skippedUnsafe: normalized.skippedUnsafe, duplicateEntries: duplicateEntries + normalized.duplicateEntries, skippedService: normalized.skippedService, warnings: normalized.warnings, wrapper: normalized.wrapper, expandedTotal, fileSize: file.size };
  }

  function safeModName(name) { return String(name).replace(/\.zip$/i, '').replace(/[<>"'&]/g, '').slice(0, 90) || 'Mod'; }

  function safeRelativePath(path) {
    const normalized = String(path).replace(/\\/g, '/');
    if (!normalized || normalized.startsWith('/') || /^[a-z]:\//i.test(normalized) || normalized.split('/').includes('..') || normalized.includes('\u0000')) return null;
    return normalized;
  }

  function parseFolderGroup(group) {
    if (group.entries.length > MAX_ENTRIES) throw new Error(t('tooMany'));
    let expandedTotal = 0;
    for (const { file, relative } of group.entries) {
      if (file.size > 1024 * 1024 * 1024) throw new Error(t('expandedFileTooLarge'));
      if (expandedTotal + file.size > MAX_TOTAL_EXPANDED) throw new Error(t('expandedTotalTooLarge'));
      expandedTotal += file.size;
    }
    const { paths, skippedUnsafe, duplicateEntries, skippedService } = normalizeFolderEntries(group.entries, group.modRoot);
    if (!paths.length) throw new Error(t('invalidFolder'));
    const modLabel = group.modRoot ? `${group.root}/${group.modRoot}` : group.root;
    return {
      id: makeId(), name: safeModName(group.modRoot ? group.modRoot.split('/').at(-1) : group.root),
      filename: modLabel, sourceType: 'folder', sourceKey: `folder:${modLabel.toLowerCase()}:${group.entries.length}:${expandedTotal}`,
      paths, skippedUnsafe, duplicateEntries, skippedService, warning: group.warning, expandedTotal, fileSize: expandedTotal
    };
  }

  async function addFiles(fileList) {
    ui.error.hidden = true;
    ui.error.classList.remove('notice');
    ui.error.setAttribute('role', 'alert');
    const files = [...fileList].filter((file) => file.name.toLowerCase().endsWith('.zip'));
    if (!files.length) { ui.error.textContent = t('invalidZip'); ui.error.hidden = false; return; }
    const warnings = [];
    const errors = [];
    for (const file of files) {
      const sourceKey = `zip:${file.name.toLowerCase()}:${file.size}:${file.lastModified}`;
      if (state.mods.some((mod) => mod.sourceKey === sourceKey)) continue;
      try {
        const parsed = await readDirectory(file);
        if (!parsed.paths.length) {
          const reason = parsed.skippedUnsafe ? t('unsafeOnly') : t('emptyZip');
          warnings.push(`${file.name}: ${reason}`);
          warnings.push(...(parsed.warnings || []).map((warning) => `${file.name}: ${formatMessage(warning.code, warning.params)}`));
          continue;
        }
        state.mods.push({ id: makeId(), name: safeModName(file.name), filename: file.name, sourceType: 'zip', sourceKey, file, ...parsed });
        warnings.push(...(parsed.warnings || []).map((warning) => `${file.name}: ${formatMessage(warning.code, warning.params)}`));
      } catch (error) {
        errors.push(`${file.name}: ${error.message || t('readFailed')}`);
      }
    }
    if (errors.length || warnings.length) {
      ui.error.textContent = [...errors, ...warnings].join(' ');
      ui.error.hidden = false;
      ui.error.classList.toggle('notice', errors.length === 0 && warnings.length > 0);
      ui.error.setAttribute('role', errors.length ? 'alert' : 'status');
    }
    state.demo = false;
    render();
  }

  function addFolders(fileList) {
    ui.error.hidden = true;
    ui.error.classList.remove('notice');
    ui.error.setAttribute('role', 'alert');
    const files = [...fileList];
    if (!files.length) { ui.error.textContent = t('invalidFolder'); ui.error.hidden = false; ui.error.classList.remove('notice'); ui.error.setAttribute('role', 'alert'); return; }
    if (files.length > MAX_ENTRIES) { ui.error.textContent = t('tooMany'); ui.error.hidden = false; ui.error.classList.remove('notice'); ui.error.setAttribute('role', 'alert'); return; }
    const groups = normalizeSelectedFolder(files);
    if (!groups.length) { ui.error.textContent = t('invalidFolder'); ui.error.hidden = false; ui.error.classList.remove('notice'); ui.error.setAttribute('role', 'alert'); return; }
    const warnings = [];
    const errors = [];
    if (groups.length > 1) warnings.push(t('multipleMods'));
    for (const group of groups) {
      try {
        const parsed = parseFolderGroup(group);
        if (!state.mods.some((mod) => mod.sourceKey === parsed.sourceKey)) state.mods.push(parsed);
        if (parsed.warning && !warnings.includes(t(parsed.warning))) warnings.push(t(parsed.warning));
      } catch (error) {
        errors.push(`${group.root}${group.modRoot ? `/${group.modRoot}` : ''}: ${error.message || t('invalidFolder')}`);
      }
    }
    if (errors.length || warnings.length) { ui.error.textContent = [...errors, ...warnings].join(' '); ui.error.hidden = false; }
    ui.error.classList.toggle('notice', !errors.length && warnings.length > 0);
    ui.error.setAttribute('role', errors.length ? 'alert' : 'status');
    state.demo = false;
    render();
  }

  function collectOverlaps() {
    return groupOverlaps(state.mods);
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
    ui.mods.innerHTML = state.mods.map((mod, index) => {
      const sourceWarnings = mod.warnings || (mod.warning ? [{ code: mod.warning, params: {} }] : []);
      const warningText = sourceWarnings.map((warning) => formatMessage(warning.code, warning.params)).join(' ');
      const warningBadge = warningText
        ? ` · <span class="mod-warning" title="${esc(warningText)}">⚠ ${esc(t('sourceWarning'))}</span>`
        : '';
      return `<li class="mod" draggable="${!state.demo}" data-id="${esc(mod.id)}"><span class="mod-index">${String(index + 1).padStart(2, '0')}</span><div class="mod-info"><input aria-label="Mod name" maxlength="90" value="${esc(mod.name)}" ${state.demo ? 'readonly' : ''}><small>${esc(t(mod.sourceType === 'folder' ? 'folderSource' : 'zipSource'))}: ${esc(mod.filename)} · ${mod.paths.length} ${esc(t('summaryFiles'))}${mod.duplicateEntries ? ` · ${mod.duplicateEntries} ${esc(t('duplicateCount'))}` : ''}${mod.skippedUnsafe ? ` · ⚠ ${mod.skippedUnsafe}` : ''}${mod.skippedService ? ` · ${mod.skippedService} ${esc(t('skippedServices'))}` : ''}${warningBadge}</small></div><div class="mod-actions"><button class="icon-button" data-action="up" aria-label="Move up" ${index === 0 || state.demo ? 'disabled' : ''}>↑</button><button class="icon-button" data-action="down" aria-label="Move down" ${index === state.mods.length - 1 || state.demo ? 'disabled' : ''}>↓</button><button class="icon-button remove" data-action="remove" aria-label="Remove mod" ${state.demo ? 'disabled' : ''}>×</button></div></li>`;
    }).join('');
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
      loadOrderTopToBottom: state.mods.map((mod, index) => ({ position: index + 1, name: mod.name, sourceType: mod.sourceType || 'example', source: mod.filename, archive: mod.filename, fileEntries: mod.paths.length, skippedUnsafePaths: mod.skippedUnsafe, duplicateEntriesWithinArchive: mod.duplicateEntries, duplicateEntriesWithinSource: mod.duplicateEntries, wrapper: mod.wrapper ?? null, warnings: mod.warnings || (mod.warning ? [{ code: mod.warning, params: {} }] : []) })),
      matchingPaths: overlaps.map(({ key, hits }) => ({ path: hits[0].entry.display, normalizedPath: key, archives: hits.map(({ mod, modIndex, entry }) => ({ name: mod.name, sourceType: mod.sourceType || 'example', source: mod.filename, archive: mod.filename, position: modIndex + 1, sizeBytes: entry.size, wrapper: mod.wrapper ?? null, warnings: mod.warnings || (mod.warning ? [{ code: mod.warning, params: {} }] : []) })) })),
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
  ui.folderInput.addEventListener('change', (event) => { addFolders(event.target.files); event.target.value = ''; });
  document.querySelectorAll('.file-picker-label').forEach((label) => {
    label.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      $(label.htmlFor).click();
    });
  });
  ui.demo.addEventListener('click', loadDemo);
  ui.clear.addEventListener('click', () => { state.mods = []; state.demo = false; ui.error.hidden = true; render(); });
  ui.export.addEventListener('click', downloadReport);
  ui.language.addEventListener('click', () => setLanguage(state.locale === 'ru' ? 'en' : 'ru'));
  if (!('webkitdirectory' in ui.folderInput)) ui.folderButton.hidden = true;
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
    if (mod) {
      mod.name = event.target.value.slice(0, 90);
      const overlaps = collectOverlaps();
      renderSummary(overlaps);
      renderConflicts(overlaps);
    }
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
