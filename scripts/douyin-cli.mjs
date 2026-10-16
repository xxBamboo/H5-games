import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const project = resolve(root, 'douyin');
const action = process.argv[2];
if (!['open', 'preview', 'upload'].includes(action)) {
  console.error('Usage: node scripts/douyin-cli.mjs <open|preview|upload> [tmg options]');
  process.exit(2);
}

const build = spawnSync(process.execPath, [resolve(root, 'scripts/build-douyin.mjs')], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);

const config = JSON.parse(readFileSync(resolve(project, 'project.config.json'), 'utf8'));
if (action !== 'open' && (typeof config.appid !== 'string' || !config.appid.trim())) {
  console.error('Set your Douyin mini-game AppID or test ID in douyin/project.config.json before running tmg.');
  process.exit(2);
}
if (action === 'upload' && config.appid.toLowerCase() === 'testappid') {
  console.error('The test ID supports preview and debugging only. Set a real mini-game AppID before uploading.');
  process.exit(2);
}
if (action === 'upload' && !process.argv.slice(3).includes('--app-changelog') && !process.argv.slice(3).includes('-c')) {
  console.error('Upload needs a changelog: npm run douyin:upload -- --app-changelog "What changed"');
  process.exit(2);
}

const bin = resolve(root, 'node_modules/tt-minigame-ide-cli/bin/tmg.js');
if (!existsSync(bin)) {
  console.error('tmg is not installed. Run npm install in the project root first.');
  process.exit(2);
}
const args = [bin, action, project, ...process.argv.slice(3)];
const result = spawnSync(process.execPath, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  encoding: 'utf8',
});
if (result.error) throw result.error;
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
const cliReportedError = /(?:^|\n)(?:Error|TypeError|ReferenceError|SyntaxError):/m.test(result.stderr ?? '');
process.exit(cliReportedError ? 1 : result.status ?? 1);
