# Changelog

## 0.2.0 - 2026-10-08

- Normalize paths from nested Paradox mod roots marked by `descriptor.mod`, including several mods selected through a shared wrapper folder.
- Preserve valid ZIP archives that contain only metadata or paths excluded for safety, and allow trailing bytes after the ZIP end record.
- Report compressed archive size, per-file expanded size, and total expanded size limits separately.
- Refresh overlap results immediately when a mod is renamed, make file pickers keyboard accessible, and display duplicate entry counts.
- Add automated regression tests for folder normalization, duplicate and unsafe paths, overlap grouping, and ZIP end record handling.

## 0.1.0

- Initial local-first path overlap map for Paradox mod ZIP archives and folders.
