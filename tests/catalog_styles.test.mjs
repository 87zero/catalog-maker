import test from 'node:test';
import assert from 'node:assert/strict';
import {compareStyles} from './catalog-style-snapshot.mjs';
const snapshot = () => ({viewport:{width:1440,height:1000,dpr:1},elements:[{path:'body > h2',text:'Title',styles:{'font-size':'26px','font-family':'Test',color:'rgb(0, 0, 0)'},rect:{x:0,y:0,width:100,height:32},pseudo:{}}]});
test('matching styles pass', () => assert.deepEqual(compareStyles(snapshot(), snapshot()), []));
test('font size, font family, colour and geometry changes fail with details', () => {
  const local = snapshot();
  local.elements[0].styles = {'font-size':'24px','font-family':'Other',color:'rgb(1, 1, 1)'};
  local.elements[0].rect.width = 102;
  assert.deepEqual(compareStyles(snapshot(), local).map(d=>d.property), ['font-size','font-family','color','rect.width']);
});
test('missing elements, pseudo styles and mismatched viewports fail', () => {
  const local = snapshot(); local.viewport.width = 390; local.elements[0].pseudo = {'::before':{content:'"x"'}};
  assert.equal(compareStyles(snapshot(), local).length, 2);
  local.elements = [];
  assert.equal(compareStyles(snapshot(), local)[1].actual, 'missing');
});
