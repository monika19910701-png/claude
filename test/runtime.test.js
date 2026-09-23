'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const {
  approveAction,
  executeApprovedAction,
  getOpportunity,
  listOpportunities,
  requestApprovalForDraft,
  saveDraft,
  verifyExecution
} = require('../src/runtime');
const { createFreelancerIntegration } = require('../src/integrations');
const { readJson, writeJson } = require('../src/utils');

function makeTempStatePath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-runtime-'));
  return path.join(dir, 'state.json');
}

test('local flow persists draft, approval, execution and verification', async () => {
  const statePath = makeTempStatePath();

  const listResult = await listOpportunities({ statePath });
  assert.equal(listResult.mode, 'local');
  assert.ok(listResult.count >= 2);

  const jobResult = await getOpportunity('FRE-1001', { statePath });
  assert.equal(jobResult.job.id, 'FRE-1001');

  const draft = await saveDraft('FRE-1001', { statePath });
  assert.equal(draft.jobId, 'FRE-1001');
  assert.equal(draft.status, 'draft');

  const approvalResult = await requestApprovalForDraft(draft.draftId, { statePath });
  assert.equal(approvalResult.approval.status, 'pending');
  assert.match(approvalResult.text, /CONFIRMACIÓN NECESARIA:/);

  await assert.rejects(
    () => executeApprovedAction(approvalResult.approval.approvalId, { statePath }),
    /primero debes aprobarla/
  );

  const approved = await approveAction(approvalResult.approval.approvalId, 'CONFIRMAR ENVÍO', { statePath });
  assert.equal(approved.status, 'approved');

  const execution = await executeApprovedAction(approvalResult.approval.approvalId, { statePath });
  assert.equal(execution.status, 'submitted');

  const verified = await verifyExecution(execution.executionId, { statePath });
  assert.equal(verified.status, 'verified');
  assert.equal(verified.verification.verified, true);

  const storedState = readJson(statePath);
  assert.equal(Object.keys(storedState.drafts).length, 1);
  assert.equal(Object.keys(storedState.approvals).length, 1);
  assert.equal(Object.keys(storedState.executions).length, 1);
});

test('approveAction rejects the wrong confirmation phrase', async () => {
  const statePath = makeTempStatePath();
  const draft = await saveDraft('FRE-1001', { statePath });
  const approvalResult = await requestApprovalForDraft(draft.draftId, { statePath });

  await assert.rejects(
    () => approveAction(approvalResult.approval.approvalId, 'CONFIRMAR CAMBIO', { statePath }),
    /Frase de confirmación inválida/
  );
});

test('invalid jobs are rejected before saving drafts', async () => {
  const statePath = makeTempStatePath();
  const jobsPath = path.join(path.dirname(statePath), 'bad-jobs.json');
  writeJson(jobsPath, [{ id: 'BAD-1', title: '', description: 'x', skills: [] }]);

  await assert.rejects(() => listOpportunities({ statePath, jobsPath }), /job.title/);
});

test('listOpportunities rejects invalid payloads from real mode too', async () => {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/jobs') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify([{ id: 'REMOTE-BAD', title: '', description: 'broken payload', skills: [] }]));
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await assert.rejects(
      () => listOpportunities({ mode: 'real', baseUrl, token: 'token', statePath: makeTempStatePath() }),
      /job.title/
    );
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('real integration factory returns remote adapter and enforces configuration', async () => {
  const integration = createFreelancerIntegration({ mode: 'real' });
  assert.equal(integration.mode, 'real');
  await assert.rejects(() => integration.listJobs(), /FREELANCER_API_BASE_URL/);
});

test('real mode works with a compatible HTTP service', async () => {
  const proposals = [];
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/jobs') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify([{ id: 'REMOTE-1', title: 'Remote Job', description: 'Need Excel support', skills: ['Excel'], client: { paymentVerified: true } }]));
      return;
    }

    if (req.method === 'GET' && req.url === '/jobs/REMOTE-1') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ id: 'REMOTE-1', title: 'Remote Job', description: 'Need Excel support', skills: ['Excel'], client: { paymentVerified: true } }));
      return;
    }

    if (req.method === 'POST' && req.url === '/proposals') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        const payload = JSON.parse(body || '{}');
        proposals.push(payload);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ externalId: 'remote-exec-1', status: 'submitted', jobId: payload.jobId }));
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/executions/remote-exec-1') {
      const payload = proposals[0];
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        externalId: 'remote-exec-1',
        status: 'submitted',
        jobId: payload.jobId,
        proposalText: payload.content,
        bid: payload.bid,
        timeline: payload.timeline
      }));
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const statePath = makeTempStatePath();

  try {
    const remoteList = await listOpportunities({ mode: 'real', statePath, baseUrl, token: 'token' });
    assert.equal(remoteList.count, 1);

    const draft = await saveDraft('REMOTE-1', { mode: 'real', statePath, baseUrl, token: 'token' });
    const approvalResult = await requestApprovalForDraft(draft.draftId, { statePath });
    await approveAction(approvalResult.approval.approvalId, 'CONFIRMAR ENVÍO', { statePath });
    const execution = await executeApprovedAction(approvalResult.approval.approvalId, { mode: 'real', statePath, baseUrl, token: 'token' });
    const verified = await verifyExecution(execution.executionId, { mode: 'real', statePath, baseUrl, token: 'token' });

    assert.equal(proposals.length, 1);
    assert.equal(verified.verification.verified, true);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
