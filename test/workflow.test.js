'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readJson } = require('../src/utils');
const { analyzeJob, buildApprovalRequest, buildProposal, reviewProfile } = require('../src/workflow');

const profile = readJson('/home/runner/work/claude/claude/data/profile.json');
const sampleJob = readJson('/home/runner/work/claude/claude/data/sample-job.json');

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
