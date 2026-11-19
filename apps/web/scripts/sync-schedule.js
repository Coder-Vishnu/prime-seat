// apps/web/scripts/sync-schedule.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '../../api/.venv/Scripts/python.exe'),
  path.resolve(__dirname, '../../api/.venv/bin/python'),
  'python3',
  'python',
];

let pythonBin = 'python';
for (const cand of candidates) {
  if (fs.existsSync(cand)) {
    pythonBin = cand;
    break;
  }
}

const scriptPath = path.resolve(__dirname, '../../api/src/scraper/multi_week_sync.py');
const args = [scriptPath, ...process.argv.slice(2)];

const child = spawn(pythonBin, args, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code || 0));
