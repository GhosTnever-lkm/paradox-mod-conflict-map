# Mod Conflict Map

**A free, local-first path overlap map for Paradox mod ZIP archives.** Compare multiple mod archives, set the order you want to review, and find files that appear under the same relative path.

[Open the live app](https://ghostnever-lkm.github.io/paradox-mod-conflict-map/) · [Download the latest ZIP](https://github.com/GhosTnever-lkm/paradox-mod-conflict-map/releases/latest/download/Mod-Conflict-Map.zip) · [Report an issue](https://github.com/GhosTnever-lkm/paradox-mod-conflict-map/issues)

## Quick start

1. Open the [live app](https://ghostnever-lkm.github.io/paradox-mod-conflict-map/) or download `index.html`, `styles.css`, and `app.js` from this repository.
2. Add the ZIP archives you want to compare. You can also load the built-in example without selecting files.
3. Rename entries if needed and arrange them from higher to lower priority with the arrows or by dragging.
4. Expand matching paths to see which archives contain them. Export a JSON report for later review.

The app does not change your launcher, mod files, or load order. It does not install, extract, or modify archives.

## What it checks

- Lists file paths from each ZIP central directory, including ZIP64 archives when their metadata can be represented safely by the browser.
- Normalizes path separators and letter case to find common paths across archives.
- Shows the chosen review order and the last archive in that list for each shared path.
- Skips `descriptor.mod` metadata files and flags absolute or out-of-root paths instead of including them in the overlap map.
- Reports duplicate paths within an archive and lets you export the result as JSON.

## Read the result carefully

A shared path is a **potential file overlap**, not proof that two mods conflict. The application does not inspect file contents, understand Clausewitz data, resolve `replace_path`, evaluate dependencies, determine the active launcher playset, or reproduce a game's merge and override rules. The order is the order you provide for review; verify actual priority behavior for your game and launcher.

It is not antivirus software, a malware scanner, a full mod validator, or a guarantee that an archive is safe. It does not decompress files or verify CRC values. Do not use its report as proof that an archive is trustworthy.

## Limits and privacy

- Maximum compressed archive size: 500 MB each.
- Maximum directory entries: 100,000 per archive.
- Maximum expanded-size metadata counted across one archive: 4 GB; one file entry may not exceed 1 GB.
- The app reads only the ZIP central directory in your browser. It does not upload archives, make network requests, load external scripts, or extract file contents.

These limits keep metadata scans bounded. Very large or malformed archives may be rejected. The browser must have enough memory to read the selected ZIP's central directory.

## Development

No dependencies or build step are required. Open `index.html` or serve the repository as static files. The app uses plain HTML, CSS, and JavaScript.

## License

MIT. See [LICENSE](LICENSE).

## Support

This project is free and open source. Optional support: [Buy Me a Coffee](https://buymeacoffee.com/azizazimov8) · [Boosty](https://boosty.to/azizazimov) · [Gumroad](https://azimovian22.gumroad.com/).
