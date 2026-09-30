'use strict';

const path = require('node:path');
const { readJson } = require('./utils');
const {
  analyzeJob,
  buildApprovalRequest,
  buildProposal,
  executeApproval,
  reviewProfile,
  verifyExecution
} = require('./workflow');

function printHelp() {
  console.log(`Uso:
  npm start -- review-profile [ruta-profile]
  npm start -- analyze-job <ruta-job> [ruta-profile]
  npm start -- draft-proposal <ruta-job> [ruta-profile]
  npm start -- prepare-approval <ruta-approval-json>
  npm start -- execute-approval <ruta-approval-json> "<FRASE DE CONFIRMACIÓN>" [ruta-profile]

Archivos por defecto:
  Profile: ./data/profile.json (resuelto relativo al proyecto)`);
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

  if (command === 'execute-approval') {
    const [approvalPath, confirmation] = args;
    if (!approvalPath) throw new Error('Debes indicar la ruta del archivo JSON de aprobación.');
    if (!confirmation) throw new Error('Debes indicar la frase de confirmación exacta.');
    const approval = readJson(approvalPath);
    const profile = getProfile(args[2]);
    const record = executeApproval(approval, confirmation, { allowedPhrases: profile.approvalPhrases });
    const verification = verifyExecution(approval, record);
    console.log(JSON.stringify({ ...record, verification }, null, 2));
    if (record.status !== 'ejecutado') process.exitCode = 1;
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
