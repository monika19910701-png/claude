'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createId, writeJson } = require('./utils');

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function createEmptyState() {
  return {
    version: 1,
    analyses: {},
    drafts: {},
    approvals: {},
    executions: {}
  };
}

class StateStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.lockPath = `${this.filePath}.lock`;
  }

  load() {
    if (!fs.existsSync(this.filePath)) {
      return createEmptyState();
    }

    const loaded = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    return {
      version: 1,
      analyses: loaded.analyses || {},
      drafts: loaded.drafts || {},
      approvals: loaded.approvals || {},
      executions: loaded.executions || {}
    };
  }

  save(state) {
    writeJson(this.filePath, state);
  }

  withLock(action) {
    const maxAttempts = 200;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        fs.mkdirSync(this.lockPath);
        try {
          return action();
        } finally {
          fs.rmdirSync(this.lockPath);
        }
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        sleep(10);
      }
    }

    throw new Error(`No se pudo adquirir el bloqueo del estado en ${this.filePath}.`);
  }

  mutate(mutator) {
    return this.withLock(() => {
      const state = this.load();
      const result = mutator(state);
      this.save(state);
      return result;
    });
  }

  saveAnalysis(jobId, payload) {
    return this.mutate((state) => {
      state.analyses[jobId] = {
        analysisId: state.analyses[jobId] ? state.analyses[jobId].analysisId : createId('analysis'),
        ...payload,
        jobId
      };
      return state.analyses[jobId];
    });
  }

  createDraft(payload) {
    return this.mutate((state) => {
      const draftId = createId('draft');
      state.drafts[draftId] = { draftId, ...payload };
      return state.drafts[draftId];
    });
  }

  getDraft(draftId) {
    return this.load().drafts[draftId] || null;
  }

  listDrafts() {
    return Object.values(this.load().drafts);
  }

  createApproval(payload) {
    return this.mutate((state) => {
      const approvalId = createId('approval');
      state.approvals[approvalId] = { approvalId, ...payload };
      return state.approvals[approvalId];
    });
  }

  getApproval(approvalId) {
    return this.load().approvals[approvalId] || null;
  }

  findApprovalByDraft(draftId) {
    return (
      Object.values(this.load().approvals).find(
        (approval) => approval.draftId === draftId && (approval.status === 'pending' || approval.status === 'approved')
      ) || null
    );
  }

  updateApproval(approvalId, patch) {
    return this.mutate((state) => {
      if (!state.approvals[approvalId]) return null;
      state.approvals[approvalId] = { ...state.approvals[approvalId], ...patch };
      return state.approvals[approvalId];
    });
  }

  createExecutionIfAbsent(approvalId, payload) {
    return this.mutate((state) => {
      const existing = Object.values(state.executions).find((execution) => execution.approvalId === approvalId);
      if (existing) {
        return existing;
      }

      const executionId = createId('execution');
      state.executions[executionId] = { executionId, ...payload };
      return state.executions[executionId];
    });
  }

  getExecution(executionId) {
    return this.load().executions[executionId] || null;
  }

  updateExecution(executionId, patch) {
    return this.mutate((state) => {
      if (!state.executions[executionId]) return null;
      state.executions[executionId] = { ...state.executions[executionId], ...patch };
      return state.executions[executionId];
    });
  }

  findExecutionByApproval(approvalId) {
    return Object.values(this.load().executions).find((execution) => execution.approvalId === approvalId) || null;
  }
}

module.exports = {
  StateStore,
  createEmptyState
};
