import path from 'node:path';

// Local state shared by start / stop; not part of the repository.
export const stateDir = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'), 'trae-work-skin');
export const watcherFile = path.join(stateDir, 'watcher.pid');
export const watcherLog = path.join(stateDir, 'watcher.log');
