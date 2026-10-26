import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReportHTML } from '../report.mjs';

test('success report shows the badge, counts and no error block', () => {
  const html = renderReportHTML({
    status: 'success',
    timestamp: '2026-01-15T03:04:05Z',
    commit: 'abc1234',
    runUrl: 'https://github.com/example/example/actions/runs/1',
    sections: 6,
    catalogs: 41,
  });
  assert.match(html, /badge success">SUCCESS/);
  assert.match(html, /Built 41 catalogs in 6 sections\./);
  assert.match(html, /abc1234/);
  assert.doesNotMatch(html, /<pre>/);
});

test('failure report shows the badge and the escaped error message', () => {
  const html = renderReportHTML({
    status: 'failure',
    timestamp: '2026-01-15T03:04:05Z',
    commit: 'def5678',
    error: 'catalogs/01 Section: duplicate order number 8',
  });
  assert.match(html, /badge failure">FAILURE/);
  assert.match(html, /<pre>catalogs\/01 Section: duplicate order number 8<\/pre>/);
});

test('rejects unsafe values via HTML escaping', () => {
  const html = renderReportHTML({
    status: 'failure',
    timestamp: '2026-01-15T03:04:05Z',
    commit: '<script>alert(1)</script>',
    error: '<img onerror=alert(1)>',
  });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img onerror'));
});
