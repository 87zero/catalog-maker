/** Read numbered section/catalog folders. Hidden Finder files are ignored. */
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';

async function numberedFolders(directory) {
  const entries = await readdir(directory, {withFileTypes:true});
  const seen = new Set();
  const folders = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const match = /^(\d+) (\S.*)$/.exec(entry.name);
    const number = match && Number(match[1]);
    if (!entry.isDirectory() || !match || !Number.isSafeInteger(number) || number < 1) throw new Error(`${path.join(directory, entry.name)}: expected a folder named "01 Display name"`);
    if (seen.has(number)) throw new Error(`${directory}: duplicate order number ${number}`);
    seen.add(number);
    folders.push({number, title:match[2].trim(), directory:path.join(directory, entry.name)});
  }
  if (!folders.length) throw new Error(`${directory}: no numbered folders found`);
  return folders.sort((a,b)=>a.number-b.number);
}

export async function readFolderCatalogs(directory) {
  const sections = [];
  const imageNames = new Set();
  for (const section of await numberedFolders(directory)) {
    const entries = [];
    for (const catalog of await numberedFolders(section.directory)) {
      const files = (await readdir(catalog.directory, {withFileTypes:true})).filter(f=>!f.name.startsWith('.'));
      if (files.some(f=>!f.isFile())) throw new Error(`${catalog.directory}: only regular files are allowed`);
      const covers = files.filter(f=>/\.(png|jpe?g|webp|gif|avif)$/i.test(f.name));
      if (covers.length !== 1 || files.some(f=>f.name !== 'link.txt' && !covers.includes(f))) throw new Error(`${catalog.directory}: expected link.txt and exactly one cover image`);
      const linkPath = path.join(catalog.directory,'link.txt');
      const url = (await readFile(linkPath,'utf8')).trim();
      let parsed;
      try { parsed = new URL(url); } catch { throw new Error(`${linkPath}: expected one HTTP(S) URL`); }
      if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password || /\s/.test(url)) throw new Error(`${linkPath}: expected one HTTP(S) URL without credentials or spaces`);
      // Keep output paths unique even if staff use cover.jpg in every folder.
      const image = ['catalogs', path.basename(section.directory), path.basename(catalog.directory), covers[0].name].map(encodeURIComponent).join('/');
      if (imageNames.has(image)) throw new Error(`${catalog.directory}: duplicate output image path`);
      imageNames.add(image);
      entries.push({name:catalog.title, alt:catalog.title, url, image, layoutKey:covers[0].name, sourceImage:path.join(catalog.directory,covers[0].name)});
    }
    sections.push({title:section.title, entries});
  }
  return sections;
}
