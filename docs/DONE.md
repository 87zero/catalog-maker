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
  in `original-layout.json` — cover images are resized to a configured
  pixel size at build time, since most card templates have no
  `object-fit`/height CSS of their own and a mismatched cover breaks the
  grid. Deduced Nichiyoh's spec (800×533) from its real covers.
- v2.0.0: added `report.mjs` (`renderReportHTML` + CLI) producing a
  static deployment-report page, for content repos to publish on every
  deploy — including failed ones — per the house `/status` page
  convention.
- v2.0.1: the first `coverSize` implementation used `fit: 'cover'`
  (center-crop to fill), which destroyed non-conforming uploads — a
  400x400 square logo cropped to the 800x533 box lost its text and
  clipped its circle. Switched to `fit: 'contain'` (shrink to fit inside,
  pad with `background`, default white) so nothing is ever cropped away.
  Also added `.rotate()` (EXIF auto-orientation) before resizing, a
  defensive fix for future phone-camera uploads even though it wasn't
  the cause here (the test image had no EXIF orientation tag).
- v2.1.0: padding the logo to the full canvas still looked visually out
  of place next to full-bleed photo covers (big white/colour bars around
  a small icon) — reported from a live customer-demo screenshot.
  `coverSize` is now a maximum, not a forced canvas: a cover that already
  fits within it is copied through completely untouched (byte-identical,
  no re-encoding); only an oversized cover gets scaled down to fit
  inside, still never cropped or padded. Prioritizes "uploaded content is
  never destroyed" over uniform card footprints, per explicit direction —
  the test entry is meant to demonstrate exactly that to prospective
  customers.
