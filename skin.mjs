#!/usr/bin/env node
// Normally run through start.bat / stop.bat, which resolve Trae CN.exe and set TRAE_CN_EXE.
import { promises as fs } from 'node:fs';
import { Controller } from './src/core/controller.js';
import { discover } from './src/core/discovery.js';
import { listThemes } from './src/core/theme.js';
import { stateDir, watcherFile, watcherLog } from './src/core/config.js';

const usage = `Usage: node skin.mjs <command>

  apply            Inject once for TRAE's current light/dark mode (start.bat runs this first to show the result)
  watch            Background watcher: follows TRAE's light/dark mode, re-injects after page reloads,
                   exits once TRAE closes (start.bat starts it hidden)
  restore          Remove the injection (used by stop.bat)
  check            Inspect the live page: skin, revision, light/dark mode, light blocks, low-contrast text
  list             Validate and list active JSON configs and their modes under themes/ (offline)

Copy one material's image and JSON configs from materials/ into themes/, replacing the old files.
Each config must declare mode: dark or light; keep at most one config per mode. Skins follow TRAE
CN's own light/dark setting; with no config for the current mode nothing is injected.`;

const [command, ...args] = process.argv.slice(2);
const stamp = () => new Date().toLocaleTimeString();
const print = status => console.log(`[${stamp()}] ${status.message}`);
// The watcher runs hidden (started by start.ps1), so it logs to a file instead of a console.
let lastLine = '';
const log = status => {
  const line = `${status.phase} ${status.message}`;
  if (line === lastLine) return; lastLine = line;
  fs.appendFile(watcherLog, `[${new Date().toISOString()}] ${line}\n`).catch(() => {});
};

async function main() {
  if (args.length) throw new Error('Commands do not accept skin IDs or extra arguments. Replace the active files in themes/');
  if (command === 'list') {
    for (const theme of await listThemes()) {
      console.log(`${theme.file.padEnd(20)} ${theme.mode.padEnd(5)} ${theme.name}  image=${theme.image}`);
    }
    return;
  }
  if (!['watch','apply','restore','check'].includes(command)) { console.log(usage); if (command && command !== 'help') process.exitCode = 1; return; }
  if (command === 'apply' || command === 'watch') await listThemes();
  const executable = await discover();
  if (command === 'apply') {
    const controller = new Controller();
    try { print(await controller.apply(executable)); }
    finally { controller.stop(); }
    return;
  }
  if (command === 'watch') {
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(watcherLog, '');
    await fs.writeFile(watcherFile, String(process.pid));
    const exit = () => fs.readFile(watcherFile, 'utf8').then(pid => pid === String(process.pid) && fs.rm(watcherFile)).catch(() => {}).finally(() => process.exit(0));
    // Exit on its own once TRAE has been gone for a while, or when a newer instance takes over the page.
    let waitingSince = null;
    const controller = new Controller(status => {
      log(status);
      if (status.phase === 'waiting') { waitingSince ??= Date.now(); if (Date.now() - waitingSince > 15000) { log({ phase: 'exit', message: 'TRAE CN closed; watcher exiting' }); exit(); } }
      else waitingSince = null;
      // idle with no skin for the current mode keeps watching (TRAE may switch back); only a takeover stops it.
      if (status.phase === 'idle' && !controller.active) exit();
    });
    process.on('SIGINT', exit);
    try { await controller.apply(executable); }
    catch (error) { log({ phase: 'error', message: error.message }); throw error; }
    return;
  }
  const controller = new Controller();
  if (command === 'restore') return print(await controller.restore(executable));
  for (const page of await controller.check(executable)) {
    console.log(`${page.url}  skin=${page.theme ?? 'none'}${page.theme && !page.enabled ? ' (disabled)' : ''}  mode=${page.mode}  match=${page.level ?? '-'}  revision=${page.revision ?? '-'}`);
    console.log(`  light blocks ${page.lightBlocks.length}: ${page.lightBlocks.join('; ') || 'none'}`);
    console.log(`  low contrast ${page.lowContrast.length}: ${page.lowContrast.join('; ') || 'none'}`);
  }
}

main().catch(error => { console.error('Error: ' + error.message); process.exitCode = 1; });
