# catalog-maker

Generic engine that builds a static "catalog gateway" page from a company's
own content: a page template, a layout file, and numbered catalog folders.
It has no dependencies and no company-specific content — a customer's
content repo checks it out at a pinned git ref and runs it in CI or locally.

## What a content repo must provide

```
<content repo>/
  template.html           page chrome with {{FIRST_HEADING}} and {{SECTIONS}} placeholders
  original-layout.json    card/row/heading templates (see "Layout file" below)
  assets/                 CSS, JS, fonts, logo, favicon — copied into the output as-is
  catalogs/
    01 Section Name/
      01 Catalog Name/
        cover.jpg          exactly one PNG/JPG/JPEG/WebP/GIF/AVIF cover image
        link.txt            exactly one http(s) URL, nothing else
      02 Another Catalog/
        ...
    02 Another Section/
      ...
```

- Section and catalog folder names must start with a positive whole number
  and a space, e.g. `01 Name`. Numbers are stripped from the displayed name
  and sorted numerically; gaps are fine, duplicates within the same parent
  folder are rejected.
- Each catalog folder needs exactly one cover image and one `link.txt`
  (the catalog's external destination) — nothing else visible.

### Layout file

`original-layout.json` holds the HTML snippets the builder fills in:

```json
{
  "defaultCard": "<a href=\"{{URL}}\"><img src=\"{{IMAGE}}\" alt=\"{{ALT}}\"></a>",
  "row": "<div class=\"row\">{{ENTRY_0}}{{ENTRY_1}}{{ENTRY_2}}{{ENTRY_3}}</div>",
  "heading": "<h2>{{TITLE}}</h2>",
  "sections": {},
  "cards": {},
  "imageAliases": {}
}
```

`defaultCard`/`row`/`heading` are required. `{{URL}}`, `{{IMAGE}}`,
`{{ALT}}`, `{{NAME}}` fill a card; `{{TITLE}}` fills a heading;
`{{ENTRY_0..3}}` fill a row with up to four cards. `sections`, `cards` and
`imageAliases` are optional: use them to preserve hand-tuned markup for
specific sections or specific cover filenames (keyed by filename) when
migrating an existing page, instead of falling back to the generic
`defaultCard`/`row` layout for every entry.

## Usage

From the content repo, with `catalog-maker` checked out alongside it:

```sh
node ../catalog-maker/build.mjs --source . --output ./public
```

`--source` defaults to the current directory; `--output` defaults to
`<source>/public`. The build refuses to run if any catalog folder is
invalid, and does not touch an existing output directory until every
input has validated.

For local preview:

```sh
../catalog-maker/serve.sh .
```

Builds, then serves `<source>/public` on an automatically allocated
loopback port. Rebuild and refresh the browser after editing catalog
folders.

## Running in CI

Pin a release tag when checking out this repo, e.g.:

```yaml
- uses: actions/checkout@v6
  with: { repository: 87zero/catalog-maker, ref: v1.0.0, path: catalog-maker }
- uses: actions/checkout@v6
  with: { path: content }
- run: node catalog-maker/build.mjs --source content --output content/public
```

## Tests

```sh
node --test tests/
```
