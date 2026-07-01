'use strict';

require('dotenv').config();
const config = require('./config/default');

// node run-once.js        → тільки обробка вже pending воркспейсів (без polling)
// node run-once.js --full → повний цикл: polling Siebel + обробка
const fullCycle = process.argv.includes('--full');

if (fullCycle) {
  const { runCycle } = require('./src/scheduler');
  console.log('=== Full cycle: polling + processing ===');
  runCycle(config).then(() => process.exit(0)).catch(err => {
    console.error('=== Error ===', err.message);
    process.exit(1);
  });
} else {
  const { processPendingWorkspaces } = require('./src/processor');
  console.log('=== Processing pending workspaces (skip polling) ===');
  processPendingWorkspaces(config).then(() => {
    console.log('=== Done ===');
    process.exit(0);
  }).catch(err => {
    console.error('=== Error ===', err.message);
    process.exit(1);
  });
}
