# Changelog

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
