#!/usr/bin/env node
/** Build a static catalog page from a customer's numbered section/catalog folders. */
import { readFile, writeFile, mkdir, copyFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

import { readFolderCatalogs } from './folder-catalogs.mjs';

export const escapeHTML = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** Fill a customer's layout templates without introducing new visual components. */
export function renderSections(sections, layout) {
  if (!layout) throw new Error('renderSections requires a layout (read the customer\'s original-layout.json).');
  const fill = (template, values) => template.replace(/\{\{(URL|IMAGE|ALT|NAME|TITLE)\}\}/g, (_, key) => escapeHTML(values[key]));
  const card = entry => fill(layout.cards?.[layout.imageAliases?.[entry.layoutKey] || entry.layoutKey || path.basename(entry.image)] || layout.defaultCard,
    { URL: entry.url, IMAGE: entry.image, ALT: entry.alt, NAME: entry.name });
  const slots = (template, entries) => template.replace(/\{\{ENTRY_(\d+)\}\}/g,
    (_, index) => entries[Number(index)] ? card(entries[Number(index)]) : '<div></div>');
  return sections.map((section, index) => {
    const existing = layout.sections?.[section.title];
    let html = index === 0 ? '' : fill(layout.heading, { TITLE: section.title });
    let offset = 0;
    if (existing) {
      html += slots(existing.body, section.entries);
      offset = existing.slots;
    }
    for (; offset < section.entries.length; offset += 4) {
      html += slots(layout.row, section.entries.slice(offset, offset + 4));
    }
    return html;
  }).join('');
}

/**
 * Validate image existence and generate publishable files using relative URLs.
 * `source` must contain template.html, original-layout.json and a catalogs/ folder.
 */
export async function build(source, output = path.join(source, 'public')) {
  const sections = await readFolderCatalogs(path.join(source, 'catalogs'));
  const entries = sections.flatMap(section => section.entries);
  const template = await readFile(path.join(source, 'template.html'), 'utf8');
  const layout = JSON.parse(await readFile(path.join(source, 'original-layout.json'), 'utf8'));
  const count = sections.reduce((total, section) => total + section.entries.length, 0);
  const html = template.replace('{{FIRST_HEADING}}', () => escapeHTML(sections[0].title))
    .replace('{{SECTIONS}}', () => renderSections(sections, layout));
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'index.html'), html);
  await cp(path.join(source, 'assets'), path.join(output, 'assets'), { recursive: true });
  await writeFile(path.join(output, '.nojekyll'), '');
  for (const entry of entries) {
    const destination = path.join(output, ...entry.image.split('/').map(decodeURIComponent));
    await mkdir(path.dirname(destination), { recursive: true });
    const fitsAlready = !layout.coverSize || await (async () => {
      const metadata = await sharp(entry.sourceImage).metadata();
      return metadata.width <= layout.coverSize.width && metadata.height <= layout.coverSize.height;
    })();
    if (fitsAlready) {
      await copyFile(entry.sourceImage, destination);
    } else {
      await sharp(entry.sourceImage)
        .rotate()
        .resize(layout.coverSize.width, layout.coverSize.height, { fit: 'inside', withoutEnlargement: true })
        .toFile(destination);
    }
  }
  return { sections: sections.length, catalogs: count, output };
}

function parseArgs(argv) {
  const args = { source: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--output') args.output = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  args.source = path.resolve(args.source);
  args.output = path.resolve(args.output || path.join(args.source, 'public'));
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { source, output } = parseArgs(process.argv.slice(2));
    const result = await build(source, output);
    console.log(`Built ${result.catalogs} catalogs in ${result.sections} sections: ${result.output}`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
