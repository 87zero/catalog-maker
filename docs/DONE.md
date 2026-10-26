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
- Pushed to `87zero/catalog-maker` and tagged `v1.0.0`. Made the repo
  public (no customer content; lets any content repo's CI check it out
  without extra credentials) and confirmed it as the real engine behind
  `nichiyoh-catalog-contents`'s production deploy.
- v2.0.0: added `sharp` (first npm dependency) and a `coverSize` option
  in `original-layout.json` — cover images are center-cropped to a
  configured pixel size at build time, since most card templates have
  no `object-fit`/height CSS of their own and a mismatched cover breaks
  the grid. Deduced Nichiyoh's spec (800×533) from its real covers.
- v2.0.0: added `report.mjs` (`renderReportHTML` + CLI) producing a
  static deployment-report page, for content repos to publish on every
  deploy — including failed ones — per the house `/status` page
  convention.
