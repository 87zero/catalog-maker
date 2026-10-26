import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readFolderCatalogs} from '../folder-catalogs.mjs';
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(),'catalog-folders-'));
  const add = async (name,url='https://example.com/book?year=2026#page=1') => {
    const dir=path.join(root,name); await mkdir(dir,{recursive:true});
    await writeFile(path.join(dir,'link.txt'),url+'\n');
    await writeFile(path.join(dir,'cover.jpg'),'test'); return dir;
  };
  try { await run(root,add); } finally { await rm(root,{recursive:true,force:true}); }
}
test('numeric ordering, Japanese labels and repeated cover filenames',()=>fixture(async(root,add)=>{
  await add('10 Last/01 Cover'); await add('02 食器/10 Third'); await add('02 食器/02 First');
  await writeFile(path.join(root,'.DS_Store'),'ignored');
  const result=await readFolderCatalogs(root);
  assert.deepEqual(result.map(s=>s.title),['食器','Last']);
  assert.deepEqual(result[0].entries.map(e=>e.name),['First','Third']);
  assert.equal(new Set(result.flatMap(s=>s.entries.map(e=>e.image))).size,3);
  assert.ok(result[0].entries[0].image.includes('%E9%A3%9F%E5%99%A8'));
}));
test('reject duplicate numeric prefixes',()=>fixture(async(root,add)=>{
  await add('01 Section/01 A'); await add('01 Section/1 B');
  await assert.rejects(readFolderCatalogs(root),/duplicate order number/);
}));
test('reject ambiguous covers and unsafe or multiline links',()=>fixture(async(root,add)=>{
  const dir=await add('01 Section/01 Catalog');
  await writeFile(path.join(dir,'other.png'),'test');
  await assert.rejects(readFolderCatalogs(root),/exactly one cover/);
  await rm(path.join(dir,'other.png'));
  for(const url of ['javascript:alert(1)','https://example.com/\nhttps://example.org/','https://user:password@example.com/']) {
    await writeFile(path.join(dir,'link.txt'),url);
    await assert.rejects(readFolderCatalogs(root),/HTTP\(S\) URL/);
  }
}));
