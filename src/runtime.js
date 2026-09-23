'use strict';

const path = require('node:path');
const { createFreelancerIntegration } = require('./integrations');
const { StateStore } = require('./state-store');
const { readJson, normalizeText } = require('./utils');
const { findApprovalPhrase, validateApprovalPayload, validateJob, validateProfile } = require('./validation');
const { analyzeJob, buildApprovalRequest, buildProposal } = require('./workflow');

const DEFAULT_PROFILE_PATH = path.resolve(__dirname, '../data/profile.json');
const DEFAULT_JOBS_PATH = path.resolve(__dirname, '../data/local-jobs.json');
const DEFAULT_STATE_PATH = path.resolve(__dirname, '../.claude/state.json');

function createContext(options = {}) {
  const mode = options.mode || process.env.CLAUDE_FREELANCER_MODE || 'local';
  const jobsPath = options.jobsPath || process.env.CLAUDE_LOCAL_JOBS_PATH || DEFAULT_JOBS_PATH;
  const statePath = options.statePath || process.env.CLAUDE_STATE_PATH || DEFAULT_STATE_PATH;

  return {
    mode,
    store: new StateStore(statePath),
    integration: createFreelancerIntegration({
      mode,
      jobsPath,
      baseUrl: options.baseUrl,
      token: options.token,
      fetchImpl: options.fetchImpl
    })
  };
}

function loadProfile(profilePath = DEFAULT_PROFILE_PATH) {
  return validateProfile(readJson(profilePath));
}

async function listOpportunities(options = {}) {
  const { integration, mode } = createContext(options);
  const jobs = await integration.listJobs();
  return {
    mode,
    count: jobs.length,
    jobs: jobs.map((job) => ({
      id: job.id || 'No especificado',
      title: job.title,
      budget:
        job.budget !== undefined
          ? `${job.currency || 'USD'} ${job.budget}`
          : job.minBudget !== undefined || job.maxBudget !== undefined
            ? `${job.currency || 'USD'} ${job.minBudget !== undefined ? job.minBudget : '?'} - ${job.maxBudget !== undefined ? job.maxBudget : '?'}`
            : 'No especificado',
      proposalCount: job.proposalCount || 0,
      clientCountry: job.client && job.client.country ? job.client.country : 'No especificado'
    }))
  };
}

async function getOpportunity(jobId, options = {}) {
  const { integration, mode } = createContext(options);
  const job = validateJob(await integration.getJob(jobId));
  return { mode, job };
}

async function saveDraft(jobId, options = {}) {
  const { integration, store, mode } = createContext(options);
  const profilePath = options.profilePath || DEFAULT_PROFILE_PATH;
  const profile = loadProfile(profilePath);
  const job = validateJob(await integration.getJob(jobId));
  const analysis = analyzeJob(profile, job);
  const proposal = buildProposal(profile, job);
  const timestamp = new Date().toISOString();

  store.saveAnalysis(job.id || jobId, {
    mode,
    profilePath: path.resolve(profilePath),
    createdAt: timestamp,
    updatedAt: timestamp,
    analysis
  });

  return store.createDraft({
    mode,
    jobId: job.id || jobId,
    jobTitle: job.title,
    profilePath: path.resolve(profilePath),
    analysis,
    proposal,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'draft'
  });
}

async function requestApprovalForDraft(draftId, options = {}) {
  const { store } = createContext(options);
  const draft = store.getDraft(draftId);
  if (!draft) {
    throw new Error(`No se encontró el borrador ${draftId}.`);
  }

  const profile = loadProfile(draft.profilePath || options.profilePath || DEFAULT_PROFILE_PATH);
  const approvalPayload = validateApprovalPayload({
    action: 'Enviar propuesta preparada',
    section: `Proyecto ${draft.jobId} - ${draft.jobTitle}`,
    content: draft.proposal.text,
    costOrCommitment: `Oferta: ${draft.proposal.bid} | Plazo: ${draft.proposal.timeline} | ${draft.proposal.milestones.length} hitos`,
    risks: draft.analysis.risks,
    recommendation: draft.analysis.recommendation,
    confirmationPhrase: findApprovalPhrase(profile, 'Enviar propuesta preparada')
  });

  const timestamp = new Date().toISOString();
  const approval = store.createApproval({
    ...approvalPayload,
    draftId,
    jobId: draft.jobId,
    mode: draft.mode,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'pending'
  });

  return {
    approval,
    text: buildApprovalRequest(approvalPayload)
  };
}

async function approveAction(approvalId, phrase, options = {}) {
  const { store } = createContext(options);
  const approval = store.getApproval(approvalId);
  if (!approval) {
    throw new Error(`No se encontró la aprobación ${approvalId}.`);
  }

  if (normalizeText(phrase) === 'cancelar') {
    return store.updateApproval(approvalId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      approvedPhrase: phrase
    });
  }

  if (phrase !== approval.confirmationPhrase) {
    throw new Error(`Frase de confirmación inválida. Debe ser exactamente: ${approval.confirmationPhrase}`);
  }

  return store.updateApproval(approvalId, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    approvedPhrase: phrase
  });
}

async function executeApprovedAction(approvalId, options = {}) {
  const { integration, store, mode } = createContext(options);
  const approval = store.getApproval(approvalId);
  if (!approval) {
    throw new Error(`No se encontró la aprobación ${approvalId}.`);
  }
  if (approval.status !== 'approved') {
    throw new Error('La acción sigue bloqueada: primero debes aprobarla con la frase exacta.');
  }
  if (store.findExecutionByApproval(approvalId)) {
    throw new Error('Esta aprobación ya fue ejecutada previamente.');
  }

  const draft = store.getDraft(approval.draftId);
  if (!draft) {
    throw new Error(`No se encontró el borrador asociado ${approval.draftId}.`);
  }

  const executionResult = await integration.submitProposal({
    approvalId,
    jobId: approval.jobId,
    content: approval.content,
    bid: draft.proposal.bid,
    timeline: draft.proposal.timeline
  });

  const timestamp = new Date().toISOString();
  return store.createExecution({
    approvalId,
    draftId: approval.draftId,
    jobId: approval.jobId,
    mode,
    externalId: executionResult.externalId,
    provider: executionResult.provider || mode,
    status: executionResult.status || 'submitted',
    contentSnapshot: approval.content,
    commitmentSnapshot: {
      bid: draft.proposal.bid,
      timeline: draft.proposal.timeline,
      milestones: draft.proposal.milestones
    },
    remoteSnapshot: executionResult,
    createdAt: timestamp,
    updatedAt: timestamp,
    verification: null
  });
}

function compareExecution(execution, remoteStatus) {
  const checks = {
    jobIdMatches: !remoteStatus.jobId || String(remoteStatus.jobId) === String(execution.jobId),
    contentMatches:
      !remoteStatus.proposalText || normalizeText(remoteStatus.proposalText) === normalizeText(execution.contentSnapshot),
    bidMatches: !remoteStatus.bid || String(remoteStatus.bid) === String(execution.commitmentSnapshot.bid),
    timelineMatches:
      !remoteStatus.timeline || String(remoteStatus.timeline) === String(execution.commitmentSnapshot.timeline)
  };

  return {
    verified: Object.values(checks).every(Boolean),
    checks
  };
}

async function verifyExecution(executionId, options = {}) {
  const { integration, store } = createContext(options);
  const execution = store.getExecution(executionId);
  if (!execution) {
    throw new Error(`No se encontró la ejecución ${executionId}.`);
  }

  const remoteStatus = await integration.getExecutionStatus(execution.externalId, execution);
  const comparison = compareExecution(execution, remoteStatus);
  return store.updateExecution(executionId, {
    status: comparison.verified ? 'verified' : 'mismatch',
    updatedAt: new Date().toISOString(),
    verification: {
      ...comparison,
      verifiedAt: new Date().toISOString(),
      remoteStatus
    }
  });
}

module.exports = {
  DEFAULT_JOBS_PATH,
  DEFAULT_PROFILE_PATH,
  DEFAULT_STATE_PATH,
  approveAction,
  createContext,
  executeApprovedAction,
  getOpportunity,
  listOpportunities,
  loadProfile,
  requestApprovalForDraft,
  saveDraft,
  verifyExecution
};
