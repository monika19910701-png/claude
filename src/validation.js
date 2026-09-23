'use strict';

const { normalizeText } = require('./utils');

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} debe ser un objeto JSON válido.`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} debe ser un texto no vacío.`);
  }
}

function assertOptionalNumber(value, label) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new Error(`${label} debe ser un número mayor o igual a 0.`);
  }
}

function validateProfile(profile) {
  assertObject(profile, 'El perfil');
  assertNonEmptyString(profile.name, 'profile.name');
  assertNonEmptyString(profile.title, 'profile.title');

  if (profile.specialties !== undefined) {
    if (!Array.isArray(profile.specialties) || !profile.specialties.every((entry) => typeof entry === 'string' && entry.trim())) {
      throw new Error('profile.specialties debe ser una lista de textos no vacíos.');
    }
  }

  if (profile.approvalPhrases !== undefined) {
    if (!Array.isArray(profile.approvalPhrases) || !profile.approvalPhrases.length) {
      throw new Error('profile.approvalPhrases debe incluir al menos una frase de confirmación.');
    }
    if (!profile.approvalPhrases.every((entry) => typeof entry === 'string' && entry.trim())) {
      throw new Error('profile.approvalPhrases solo puede contener textos no vacíos.');
    }
  }

  return profile;
}

function validateJob(job) {
  assertObject(job, 'El proyecto');
  assertNonEmptyString(job.title, 'job.title');
  assertNonEmptyString(job.description, 'job.description');

  if (job.skills !== undefined) {
    if (!Array.isArray(job.skills) || !job.skills.every((entry) => typeof entry === 'string' && entry.trim())) {
      throw new Error('job.skills debe ser una lista de textos no vacíos.');
    }
  }

  assertOptionalNumber(job.budget, 'job.budget');
  assertOptionalNumber(job.minBudget, 'job.minBudget');
  assertOptionalNumber(job.maxBudget, 'job.maxBudget');
  assertOptionalNumber(job.proposalCount, 'job.proposalCount');
  assertOptionalNumber(job.timelineDays, 'job.timelineDays');

  if (job.minBudget !== undefined && job.maxBudget !== undefined && job.minBudget > job.maxBudget) {
    throw new Error('job.minBudget no puede ser mayor que job.maxBudget.');
  }

  if (job.client !== undefined) {
    assertObject(job.client, 'job.client');
    if (job.client.rating !== undefined) assertOptionalNumber(job.client.rating, 'job.client.rating');
    if (job.client.reviews !== undefined) assertOptionalNumber(job.client.reviews, 'job.client.reviews');
    if (job.client.country !== undefined && typeof job.client.country !== 'string') {
      throw new Error('job.client.country debe ser texto.');
    }
  }

  return job;
}

function validateApprovalPayload(input) {
  assertObject(input, 'La aprobación');
  ['action', 'section', 'content', 'costOrCommitment', 'recommendation', 'confirmationPhrase'].forEach((field) => {
    assertNonEmptyString(input[field], `approval.${field}`);
  });

  if (input.risks !== undefined) {
    if (!Array.isArray(input.risks) || !input.risks.every((entry) => typeof entry === 'string' && entry.trim())) {
      throw new Error('approval.risks debe ser una lista de textos no vacíos.');
    }
  }

  return input;
}

function validateExecutionResult(result) {
  assertObject(result, 'La respuesta de ejecución');
  assertNonEmptyString(result.externalId, 'execution.externalId');
  if (result.status !== undefined) {
    assertNonEmptyString(result.status, 'execution.status');
  }
  return result;
}

function findApprovalPhrase(profile, preferredAction) {
  const phrases = Array.isArray(profile.approvalPhrases) ? profile.approvalPhrases : [];
  const normalizedAction = normalizeText(preferredAction);

  if (normalizedAction.includes('envi')) {
    const submitPhrase = phrases.find((phrase) => /envio/.test(normalizeText(phrase)));
    if (submitPhrase) return submitPhrase;
  }

  return phrases[0] || 'CONFIRMAR ENVÍO';
}

module.exports = {
  findApprovalPhrase,
  validateApprovalPayload,
  validateExecutionResult,
  validateJob,
  validateProfile
};
