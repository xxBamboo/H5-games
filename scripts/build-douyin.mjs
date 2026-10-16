import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const template = readFileSync(resolve(root, 'scripts/douyin-runtime.js'), 'utf8');
const scene = readFileSync(resolve(root, 'src/scene.js'), 'utf8');
const marker = '/* __ROOM_SCENE__ */';
if (template.split(marker).length !== 2) throw new Error('Douyin runtime scene marker missing or duplicated');
const output = template.replace(marker, scene);
new Function(output); // Check the generated script before writing it.

const target = resolve(root, 'douyin/game.js');
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8');
  if (current !== output) throw new Error('douyin/game.js is outdated; run douyin:build');
  console.log('Douyin game build is current.');
} else {
  writeFileSync(target, output);
  console.log('Built douyin/game.js');
}
