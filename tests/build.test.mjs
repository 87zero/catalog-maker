import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { renderSections, build } from '../build.mjs';

const layout = {
  defaultCard: '<a href="{{URL}}" title="{{NAME}}"><img src="{{IMAGE}}" alt="{{ALT}}"></a>',
  row: '<div class="row">{{ENTRY_0}}{{ENTRY_1}}{{ENTRY_2}}{{ENTRY_3}}</div>',
  heading: '<h2>{{TITLE}}</h2>',
  sections: {},
  cards: {},
};

async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'catalog-maker-build-'));
  try {
    await writeFile(path.join(root, 'template.html'), '<html><body><h1>{{FIRST_HEADING}}</h1>{{SECTIONS}}</body></html>');
    await writeFile(path.join(root, 'original-layout.json'), JSON.stringify(layout));
    await mkdir(path.join(root, 'assets'), { recursive: true });
    await writeFile(path.join(root, 'assets', 'site.css'), 'body { margin: 0; }');
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function addCatalog(root, folder, { url = 'https://example.com/catalog' } = {}) {
  const dir = path.join(root, 'catalogs', folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'link.txt'), url);
  await writeFile(path.join(dir, 'cover.jpg'), 'cover-bytes');
}

test('renderSections requires a layout', () => {
  assert.throws(() => renderSections([{ title: 'A', entries: [] }]), /requires a layout/);
});

test('renderSections falls back to the default card and four-up rows', () => {
  const sections = [{
    title: 'Section',
    entries: Array.from({ length: 5 }, (_, i) => ({ name: `Item ${i}`, alt: `Item ${i}`, url: 'https://example.com', image: `catalogs/img${i}.jpg`, layoutKey: `img${i}.jpg` })),
  }];
  const html = renderSections(sections, layout);
  assert.equal((html.match(/class="row"/g) || []).length, 2);
  assert.equal((html.match(/<img /g) || []).length, 5);
});

test('build renders the template, copies assets and copies catalog covers', () => fixture(async root => {
  await addCatalog(root, '01 Section/01 Catalog', { url: 'https://example.com/a' });
  await addCatalog(root, '01 Section/02 Catalog');
  const result = await build(root);
  assert.equal(result.sections, 1);
  assert.equal(result.catalogs, 2);
  const html = await readFile(path.join(result.output, 'index.html'), 'utf8');
  assert.ok(!html.includes('{{'));
  assert.ok(html.includes('https://example.com/a'));
  assert.ok(await readFile(path.join(result.output, 'assets', 'site.css'), 'utf8'));
  for (const match of html.matchAll(/src="(catalogs\/[^"]+)"/g)) {
    assert.ok((await readFile(path.join(result.output, decodeURIComponent(match[1])))).length > 0);
  }
}));

test('a cover already within coverSize is left byte-identical', () => fixture(async root => {
  const coverSize = { width: 800, height: 533 };
  await writeFile(path.join(root, 'original-layout.json'), JSON.stringify({ ...layout, coverSize }));
  const dir = path.join(root, 'catalogs', '01 Section', '01 Small');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'link.txt'), 'https://example.com/small');
  const sourcePath = path.join(dir, 'cover.png');
  await sharp({ create: { width: 400, height: 400, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .png()
    .toFile(sourcePath);
  const result = await build(root);
  const image = (await readFile(path.join(result.output, 'index.html'), 'utf8')).match(/src="(catalogs\/[^"]+)"/)[1];
  const outputPath = path.join(result.output, decodeURIComponent(image));
  assert.deepEqual(await readFile(outputPath), await readFile(sourcePath));
}));

test('a cover larger than coverSize is scaled to fit inside it, never cropped or padded', () => fixture(async root => {
  const coverSize = { width: 800, height: 533 };
  await writeFile(path.join(root, 'original-layout.json'), JSON.stringify({ ...layout, coverSize }));
  const dir = path.join(root, 'catalogs', '01 Section', '01 Oversized');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'link.txt'), 'https://example.com/oversized');
  // A 2000x2000 square source exceeds both target dimensions.
  await sharp({ create: { width: 2000, height: 2000, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .png()
    .toFile(path.join(dir, 'cover.png'));
  const result = await build(root);
  const image = (await readFile(path.join(result.output, 'index.html'), 'utf8')).match(/src="(catalogs\/[^"]+)"/)[1];
  const metadata = await sharp(path.join(result.output, decodeURIComponent(image))).metadata();
  assert.ok(metadata.width <= coverSize.width);
  assert.ok(metadata.height <= coverSize.height);
  assert.equal(metadata.width, metadata.height, 'the square source should stay square (no crop, no distortion)');
}));

test('a missing cover fails before replacing existing output', () => fixture(async root => {
  const badCatalog = path.join(root, 'catalogs', '01 Section', '01 Catalog');
  await mkdir(badCatalog, { recursive: true });
  await writeFile(path.join(badCatalog, 'link.txt'), 'https://example.com/');
  const output = path.join(root, 'public');
  await mkdir(output);
  await writeFile(path.join(output, 'index.html'), 'previous build');
  await assert.rejects(build(root, output), /exactly one cover image/);
  assert.equal(await readFile(path.join(output, 'index.html'), 'utf8'), 'previous build');
}));
