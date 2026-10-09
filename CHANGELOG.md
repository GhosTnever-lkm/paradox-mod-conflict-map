# Changelog

## 0.4.0 - 2026-10-10

- Add an instant search for matching paths, mod names, and source archive names, with a visible match count.
- Keep JSON export complete and independent of the current search filter.
- Add regression coverage for case-insensitive search and source-list preservation.

## 0.3.3 - 2026-10-10

- Fix the README download links to use the exact versioned release asset name.
- Add an automated tagged release workflow that runs regression tests and publishes the complete app ZIP with a SHA-256 sidecar.
- Add a `VERSION` file aligned with the latest release.

## 0.3.2 - 2026-10-08

- Preserve game paths when a ZIP wrapper is ambiguous instead of silently dropping entries.
- Show localized ZIP layout warnings in the app and include wrapper metadata in JSON reports.
- Count unsafe ZIP paths once across directory parsing and normalization.

## 0.3.1 - 2026-10-08

- Exclude Workshop thumbnail and preview files at any folder depth in both ZIP and folder scans.
- Present empty or unsafe-only archives as informational notices instead of error alerts.
- Reset notice styling and accessibility roles when a new scan starts or a genuine error occurs.

## 0.3.0 - 2026-10-08

- Normalize shared wrapper folders in ZIP archives so `ModA/common/x.txt` and `ModB/common/x.txt` compare as `common/x.txt`.
- Exclude VCS internals, Workshop thumbnails, documentation, and other known non-game metadata from both ZIP and folder path maps; show the count excluded.
- Keep descriptor-free folders intact, warn when nested descriptors are ambiguous, and add old `.mod` metadata support without silently dropping files.
- Treat multiple discovered mods as an informational notice and explain descriptor-only or unsafe-only archives instead of accepting empty sources.
- Fix the CSP `form-action` directive and update installation guidance to include the ES module and serve the complete app over localhost or GitHub Pages.
- Include CHANGELOG, tests, and all runtime files in the release archive.
- Add regression coverage for ZIP wrappers, service-file filtering, folder edge cases, and empty archives.

## 0.2.0 - 2026-10-08

- Normalize paths from nested Paradox mod roots marked by `descriptor.mod`, including several mods selected through a shared wrapper folder.
- Preserve valid ZIP archives that contain only metadata or paths excluded for safety, and allow trailing bytes after the ZIP end record.
- Report compressed archive size, per-file expanded size, and total expanded size limits separately from one another.
- Refresh overlap results immediately when a mod is renamed, make file pickers keyboard accessible, and display duplicate entry counts.
- Add automated regression tests for folder normalization, duplicate and unsafe paths, overlap grouping, and ZIP end record handling.

## 0.1.0

- Initial local-first path overlap map for Paradox mod ZIP archives and folders.
