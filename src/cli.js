'use strict';

const path = require('node:path');
const { readJson } = require('./utils');
const { analyzeJob, buildApprovalRequest, buildProposal, reviewProfile } = require('./workflow');

function printHelp() {
  console.log(`Uso:
  npm start -- review-profile [ruta-profile]
  npm start -- analyze-job <ruta-job> [ruta-profile]
  npm start -- draft-proposal <ruta-job> [ruta-profile]
  npm start -- prepare-approval <ruta-approval-json]

Archivos por defecto:
  Profile: /home/runner/work/claude/claude/data/profile.json`);
}

function getProfile(profilePath) {
  return readJson(profilePath || path.resolve(__dirname, '../data/profile.json'));
}

function main(argv) {
  const [command, ...args] = argv.slice(2);

  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }

  if (command === 'review-profile') {
    const profile = getProfile(args[0]);
    console.log(JSON.stringify(reviewProfile(profile), null, 2));
    return;
  }

  if (command === 'analyze-job') {
    const jobPath = args[0];
    if (!jobPath) throw new Error('Debes indicar la ruta del archivo JSON del proyecto.');
    const profile = getProfile(args[1]);
    const job = readJson(jobPath);
    console.log(JSON.stringify(analyzeJob(profile, job), null, 2));
    return;
  }

  if (command === 'draft-proposal') {
    const jobPath = args[0];
    if (!jobPath) throw new Error('Debes indicar la ruta del archivo JSON del proyecto.');
    const profile = getProfile(args[1]);
    const job = readJson(jobPath);
    console.log(JSON.stringify(buildProposal(profile, job), null, 2));
    return;
  }

  if (command === 'prepare-approval') {
    const approvalPath = args[0];
    if (!approvalPath) throw new Error('Debes indicar la ruta del archivo JSON de aprobación.');
    const approval = readJson(approvalPath);
    console.log(buildApprovalRequest(approval));
    return;
  }

  throw new Error(`Comando no soportado: ${command}`);
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
