# Completed

- Extracted the generic build engine (`build.mjs`, `folder-catalogs.mjs`,
  `serve.sh`) from the Nichiyoh catalog prototype, with all filesystem
  inputs parameterized instead of assumed relative to the script's own
  directory.
- Dropped legacy Markdown-catalog parsing; the numbered-folder convention
  is the only supported authoring format.
- Ported the generic regression tests (folder validation, style-diff
  mechanism, template rendering/build) to synthetic fixtures with no
  customer content; all pass via `node --test tests/`.
- Verified the CLI end-to-end against a throwaway synthetic catalog tree.
