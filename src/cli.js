'use strict';

const path = require('node:path');
const { DEFAULT_CONFIG_PATH, initConfigFile, loadCliConfig } = require('./config');
const { readJson } = require('./utils');
const { analyzeJob, buildApprovalRequest, buildProposal, reviewProfile } = require('./workflow');
const {
  approveAction,
  DEFAULT_JOBS_PATH,
  DEFAULT_PROFILE_PATH,
  DEFAULT_STATE_PATH,
  executeApprovedAction,
  getOpportunity,
  listOpportunities,
  requestApprovalForDraft,
  saveDraft,
  verifyExecution
} = require('./runtime');

function printHelp() {
  console.log(`Uso:
  npm start -- review-profile [ruta-profile]
  npm start -- analyze-job <ruta-job> [ruta-profile]
  npm start -- draft-proposal <ruta-job> [ruta-profile]
  npm start -- prepare-approval <ruta-approval-json>
  npm start -- init-config [--config=ruta-config-json]
  npm start -- list-jobs [--config=ruta-config-json] [--mode=local|real] [--jobs=ruta-json] [--state=ruta-state]
  npm start -- get-job <job-id> [--config=ruta-config-json] [--mode=local|real] [--jobs=ruta-json]
  npm start -- save-draft <job-id> [--config=ruta-config-json] [--profile=ruta-profile] [--mode=local|real] [--jobs=ruta-json] [--state=ruta-state]
  npm start -- request-approval <draft-id> [--config=ruta-config-json] [--state=ruta-state]
  npm start -- approve-action <approval-id> <frase-exacta> [--config=ruta-config-json] [--state=ruta-state]
  npm start -- execute-action <approval-id> [--config=ruta-config-json] [--mode=local|real] [--jobs=ruta-json] [--state=ruta-state]
  npm start -- verify-execution <execution-id> [--config=ruta-config-json] [--mode=local|real] [--jobs=ruta-json] [--state=ruta-state]

Archivos por defecto:
  Profile: ${DEFAULT_PROFILE_PATH}
  Jobs locales: ${DEFAULT_JOBS_PATH}
  Estado local: ${DEFAULT_STATE_PATH}
  Config local editable: ${DEFAULT_CONFIG_PATH}`);
}

function getProfile(profilePath) {
  return readJson(profilePath || path.resolve(__dirname, '../data/profile.json'));
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseCli(argv) {
  const positional = [];
  const options = {};

  for (const token of argv.slice(2)) {
    if (token.startsWith('--')) {
      const [key, ...rest] = token.slice(2).split('=');
      const value = rest.length ? rest.join('=') : true;
      options[key] = value;
    } else {
      positional.push(token);
    }
  }

  const [command, ...args] = positional;
  return { command, args, options };
}

function buildRuntimeOptions(options) {
  const config = loadCliConfig(options.config);

  return {
    mode: options.mode || config.mode,
    jobsPath: options.jobs || config.jobsPath,
    profilePath: options.profile || config.profilePath,
    statePath: options.state || config.statePath,
    baseUrl: options['base-url'] || config.baseUrl,
    token: options.token || config.token
  };
}

function main(argv) {
  const { command, args, options } = parseCli(argv);

  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }

  if (command === 'review-profile') {
    const profile = getProfile(args[0]);
    printJson(reviewProfile(profile));
    return;
  }

  if (command === 'analyze-job') {
    const jobPath = args[0];
    if (!jobPath) throw new Error('Debes indicar la ruta del archivo JSON del proyecto.');
    const profile = getProfile(args[1]);
    const job = readJson(jobPath);
    printJson(analyzeJob(profile, job));
    return;
  }

  if (command === 'draft-proposal') {
    const jobPath = args[0];
    if (!jobPath) throw new Error('Debes indicar la ruta del archivo JSON del proyecto.');
    const profile = getProfile(args[1]);
    const job = readJson(jobPath);
    printJson(buildProposal(profile, job));
    return;
  }

  if (command === 'init-config') {
    console.log(initConfigFile(options.config));
    return;
  }

  if (command === 'prepare-approval') {
    const approvalPath = args[0];
    if (!approvalPath) throw new Error('Debes indicar la ruta del archivo JSON de aprobación.');
    const approval = readJson(approvalPath);
    console.log(buildApprovalRequest(approval));
    return;
  }

  if (command === 'list-jobs') {
    return listOpportunities(buildRuntimeOptions(options)).then(printJson);
  }

  if (command === 'get-job') {
    const jobId = args[0];
    if (!jobId) throw new Error('Debes indicar el id del proyecto.');
    return getOpportunity(jobId, buildRuntimeOptions(options)).then(printJson);
  }

  if (command === 'save-draft') {
    const jobId = args[0];
    if (!jobId) throw new Error('Debes indicar el id del proyecto.');
    return saveDraft(jobId, buildRuntimeOptions(options)).then(printJson);
  }

  if (command === 'request-approval') {
    const draftId = args[0];
    if (!draftId) throw new Error('Debes indicar el id del borrador.');
    return requestApprovalForDraft(draftId, buildRuntimeOptions(options)).then(printJson);
  }

  if (command === 'approve-action') {
    const approvalId = args[0];
    const phrase = args[1];
    if (!approvalId || !phrase) throw new Error('Debes indicar el id de aprobación y la frase exacta.');
    return approveAction(approvalId, phrase, buildRuntimeOptions(options)).then(printJson);
  }

  if (command === 'execute-action') {
    const approvalId = args[0];
    if (!approvalId) throw new Error('Debes indicar el id de aprobación.');
    return executeApprovedAction(approvalId, buildRuntimeOptions(options)).then(printJson);
  }

  if (command === 'verify-execution') {
    const executionId = args[0];
    if (!executionId) throw new Error('Debes indicar el id de ejecución.');
    return verifyExecution(executionId, buildRuntimeOptions(options)).then(printJson);
  }

  throw new Error(`Comando no soportado: ${command}`);
}

if (require.main === module) {
  Promise.resolve()
    .then(() => main(process.argv))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { buildRuntimeOptions, main, parseCli, printHelp };
