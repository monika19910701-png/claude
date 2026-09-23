'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readJson } = require('../src/utils');
const { analyzeJob, buildApprovalRequest, buildProposal, reviewProfile } = require('../src/workflow');

const profile = readJson(path.join(__dirname, '..', 'data', 'profile.json'));
const sampleJob = readJson(path.join(__dirname, '..', 'data', 'sample-job.json'));

test('analyzeJob returns a strong compatibility score for the sample job', () => {
  const result = analyzeJob(profile, sampleJob);

  assert.equal(result.title, sampleJob.title);
  assert.ok(result.compatibility >= 70);
  assert.equal(result.recommendation, 'Aprobar');
  assert.ok(result.advantages.some((entry) => entry.includes('Cliente con método de pago verificado')));
});

test('buildProposal generates an English proposal with bid and question', () => {
  const proposal = buildProposal(profile, sampleJob);

  assert.equal(proposal.language, 'en');
  assert.match(proposal.text, /I reviewed your project/i);
  assert.match(proposal.text, /\?/);
  assert.ok(proposal.bid.includes('USD'));
});

test('buildProposal falls back to Spanish heuristics when language is missing', () => {
  const proposal = buildProposal(profile, {
    title: 'Necesito apoyo con investigación web',
    description: 'Busco ayuda con datos en Excel y limpieza de información.',
    skills: ['Web Research', 'Excel']
  });

  assert.equal(proposal.language, 'es');
  assert.match(proposal.text, /Hola, revisé tu proyecto/i);
});

test('analyzeJob timeline fallback works without explicit timeline', () => {
  const result = analyzeJob(profile, {
    title: 'Simple data entry support',
    description: 'Need data entry into spreadsheets.',
    skills: ['Data Entry'],
    client: { paymentVerified: true }
  });

  assert.equal(result.recommendedTimeline, '2-3 días');
});

test('analyzeJob uses general timeline fallback when no explicit timeline or data-entry skill exists', () => {
  const result = analyzeJob(profile, {
    title: 'Python cleanup script',
    description: 'Need help with a small Python automation task.',
    skills: ['Python'],
    client: { paymentVerified: true }
  });

  assert.equal(result.recommendedTimeline, '3-5 días');
});

test('analyzeJob rejects jobs asking for sensitive information', () => {
  const result = analyzeJob(profile, {
    title: 'Verification project',
    description: 'Please send your passport and bank details before we start.',
    skills: ['Data Entry'],
    client: { paymentVerified: true }
  });

  assert.equal(result.recommendation, 'Rechazar');
  assert.ok(result.risks.some((risk) => /información sensible/i.test(risk)));
});

test('reviewProfile highlights strengths and improvements', () => {
  const review = reviewProfile(profile);

  assert.equal(review.suggestedTitle, profile.title);
  assert.ok(review.strengths.length >= 2);
  assert.ok(review.improvements.length >= 2);
});

test('buildApprovalRequest preserves the approval template format', () => {
  const text = buildApprovalRequest({
    action: 'Enviar propuesta preparada',
    section: 'Proyecto FRE-1001',
    content: 'Proposal body',
    costOrCommitment: 'USD 55 | 3 días',
    risks: ['Ninguno identificado'],
    recommendation: 'Aprobar',
    confirmationPhrase: 'CONFIRMAR ENVÍO'
  });

  assert.match(text, /ACCIÓN PROPUESTA:/);
  assert.match(text, /CONFIRMACIÓN NECESARIA:\nCONFIRMAR ENVÍO/);
});
