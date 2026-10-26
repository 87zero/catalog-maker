# Requirements: catalog-maker

Generic, reusable engine for building a static "catalog gateway" page from a
company's own content repo. Ships as a tagged Node.js tool with no npm
dependencies; a customer's content repo checks it out at a pinned ref and
runs it in CI.

## Must

- Read catalog data from numbered section/catalog folders (`NN Name` two
  levels deep), each catalog folder holding exactly one cover image
  (PNG/JPG/JPEG/WebP/GIF/AVIF) and one `link.txt` with a single http(s) URL.
  Numeric prefixes control order and are stripped from displayed names;
  numbers must be unique within their parent folder, gaps allowed.
- Reject at build time: empty sections, duplicate numbers, missing or
  multiple covers, extra visible files, symbolic links, invalid URLs.
  Finder metadata and dotfiles are ignored.
- Render a static site by filling placeholders in a customer-supplied
  `template.html` (page chrome) and an optional `original-layout.json`
  (per-section/per-card HTML snippets, with a generic card/row/heading
  fallback for anything not explicitly aliased).
- Every filesystem input (template path, layout-data path, catalogs
  directory, output directory) is a CLI argument or environment variable —
  nothing is hardcoded to a path relative to the script's own directory,
  since the engine runs against a different repo's checkout than its own.
- Copy referenced assets (CSS/JS/fonts/images, cover images) into the
  output directory unchanged.
- Ship a `serve.sh` that builds and serves the output on an automatically
  allocated loopback port, for local preview.
- Ship generic regression tests (`node --test`), runnable without any
  customer content checked out.
- Ship install/usage instructions (`README.md`) sufficient for a new
  customer repo to adopt the tool via a pinned git ref, with no further
  code changes.

## Won't (for this version)

- No legacy Markdown-format catalog parsing — the folder convention is the
  only supported authoring format.
- No live-page scraping/cloning tool — bootstrapping a new customer's
  content from an existing live page is out of scope for this repo.
- No Nichiyoh-specific (or any other customer-specific) content, test
  fixtures, or hardcoded URLs.

## Verification

- `node --test` passes with zero customer content present.
- `folder-catalogs.mjs` validation rejects each documented bad input
  (duplicate prefix, missing cover, two covers, symlink, bad URL, empty
  section) with a clear error.
- A sample fixture tree (synthetic, not a real customer's data) builds to
  a working static page via `serve.sh`.
