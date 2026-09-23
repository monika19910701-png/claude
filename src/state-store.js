'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createId, writeJson } = require('./utils');

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

  saveAnalysis(jobId, payload) {
    const state = this.load();
    state.analyses[jobId] = {
      analysisId: state.analyses[jobId] ? state.analyses[jobId].analysisId : createId('analysis'),
      ...payload,
      jobId
    };
    this.save(state);
    return state.analyses[jobId];
  }

  createDraft(payload) {
    const state = this.load();
    const draftId = createId('draft');
    state.drafts[draftId] = { draftId, ...payload };
    this.save(state);
    return state.drafts[draftId];
  }

  getDraft(draftId) {
    return this.load().drafts[draftId] || null;
  }

  listDrafts() {
    return Object.values(this.load().drafts);
  }

  createApproval(payload) {
    const state = this.load();
    const approvalId = createId('approval');
    state.approvals[approvalId] = { approvalId, ...payload };
    this.save(state);
    return state.approvals[approvalId];
  }

  getApproval(approvalId) {
    return this.load().approvals[approvalId] || null;
  }

  updateApproval(approvalId, patch) {
    const state = this.load();
    if (!state.approvals[approvalId]) return null;
    state.approvals[approvalId] = { ...state.approvals[approvalId], ...patch };
    this.save(state);
    return state.approvals[approvalId];
  }

  createExecution(payload) {
    const state = this.load();
    const executionId = createId('execution');
    state.executions[executionId] = { executionId, ...payload };
    this.save(state);
    return state.executions[executionId];
  }

  getExecution(executionId) {
    return this.load().executions[executionId] || null;
  }

  updateExecution(executionId, patch) {
    const state = this.load();
    if (!state.executions[executionId]) return null;
    state.executions[executionId] = { ...state.executions[executionId], ...patch };
    this.save(state);
    return state.executions[executionId];
  }

  findExecutionByApproval(approvalId) {
    return Object.values(this.load().executions).find((execution) => execution.approvalId === approvalId) || null;
  }
}

module.exports = {
  StateStore,
  createEmptyState
};
