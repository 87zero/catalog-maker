/** Render a static deployment-report page (see docs/REQUIREMENTS.md). */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { escapeHTML } from './build.mjs';

const formatTimestamp = isoString => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tokyo',
  dateStyle: 'medium',
  timeStyle: 'medium',
}).format(new Date(isoString)) + ' JST';

/**
 * `data`: { status: 'success'|'failure', timestamp (ISO string), commit,
 * runUrl, sections?, catalogs?, error? }
 */
export function renderReportHTML(data) {
  const ok = data.status === 'success';
  const summary = ok
    ? `Built ${data.catalogs} catalogs in ${data.sections} sections.`
    : (data.error || 'Build failed.');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Deployment report</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: -apple-system, system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
.badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-weight: 600; color: #fff; }
.badge.success { background: #1a7f37; }
.badge.failure { background: #cf222e; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin-top: 1.5rem; }
dt { font-weight: 600; color: #57606a; }
dd { margin: 0; }
pre { white-space: pre-wrap; background: #f6f8fa; padding: 0.75rem; border-radius: 0.25rem; }
</style>
</head>
<body>
<h1>Deployment report</h1>
<p><span class="badge ${ok ? 'success' : 'failure'}">${ok ? 'SUCCESS' : 'FAILURE'}</span></p>
<dl>
<dt>Checked</dt><dd>${escapeHTML(formatTimestamp(data.timestamp))}</dd>
<dt>Commit</dt><dd>${escapeHTML(data.commit || 'unknown')}</dd>
<dt>Summary</dt><dd>${escapeHTML(summary)}</dd>
${data.runUrl ? `<dt>Full logs</dt><dd><a href="${escapeHTML(data.runUrl)}">${escapeHTML(data.runUrl)}</a></dd>` : ''}
</dl>
${!ok && data.error ? `<pre>${escapeHTML(data.error)}</pre>` : ''}
</body>
</html>
`;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--')) throw new Error(`Unknown argument: ${argv[i]}`);
    args[key] = argv[++i];
  }
  if (!args.status || !args.output) throw new Error('--status and --output are required');
  args.timestamp ||= new Date().toISOString();
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const html = renderReportHTML({
      status: args.status,
      timestamp: args.timestamp,
      commit: args.commit,
      runUrl: args['run-url'],
      sections: args.sections ? Number(args.sections) : undefined,
      catalogs: args.catalogs ? Number(args.catalogs) : undefined,
      error: args.error,
    });
    await mkdir(path.dirname(args.output), { recursive: true });
    await writeFile(args.output, html);
    console.log(`Wrote report: ${args.output}`);
  } catch (error) {
    console.error(`Report generation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
