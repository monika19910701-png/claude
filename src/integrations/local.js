'use strict';

const path = require('node:path');
const { readJson } = require('../utils');
const { validateExecutionResult, validateJob } = require('../validation');

class LocalFreelancerIntegration {
  constructor(options = {}) {
    this.mode = 'local';
    this.jobsPath = path.resolve(options.jobsPath || path.resolve(__dirname, '../../data/local-jobs.json'));
  }

  loadJobs() {
    const loaded = readJson(this.jobsPath);
    const jobs = Array.isArray(loaded) ? loaded : [loaded];
    return jobs.map((job) => validateJob(job));
  }

  async listJobs() {
    return this.loadJobs();
  }

  async getJob(jobId) {
    const job = this.loadJobs().find((entry) => String(entry.id) === String(jobId));
    if (!job) {
      throw new Error(`No se encontró el proyecto local con id ${jobId}.`);
    }
    return job;
  }

  async submitProposal(payload) {
    const response = {
      externalId: `local-${payload.approvalId}`,
      status: 'submitted',
      provider: 'local-simulation',
      jobId: payload.jobId,
      proposalText: payload.content,
      bid: payload.bid,
      timeline: payload.timeline
    };
    return validateExecutionResult(response);
  }

  async getExecutionStatus(externalId, execution) {
    const response = {
      externalId,
      status: execution.status || 'submitted',
      provider: 'local-simulation',
      jobId: execution.jobId,
      proposalText: execution.contentSnapshot,
      bid: execution.commitmentSnapshot.bid,
      timeline: execution.commitmentSnapshot.timeline
    };
    return validateExecutionResult(response);
  }
}

module.exports = {
  LocalFreelancerIntegration
};
