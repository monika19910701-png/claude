'use strict';

const { validateExecutionResult, validateJob } = require('../validation');

class RemoteFreelancerIntegration {
  constructor(options = {}) {
    this.mode = 'real';
    this.baseUrl = options.baseUrl || process.env.FREELANCER_API_BASE_URL;
    this.token = options.token || process.env.FREELANCER_API_TOKEN;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
  }

  ensureConfigured() {
    if (!this.fetchImpl) {
      throw new Error('El entorno actual no soporta fetch para el modo real.');
    }
    if (!this.baseUrl || !this.token) {
      throw new Error('El modo real requiere FREELANCER_API_BASE_URL y FREELANCER_API_TOKEN.');
    }
  }

  async request(method, pathname, body) {
    this.ensureConfigured();
    const response = await this.fetchImpl(new URL(pathname, this.baseUrl), {
      method,
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error del servicio Freelancer (${response.status}): ${text || 'sin detalle'}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async listJobs() {
    const jobs = await this.request('GET', '/jobs');
    if (!Array.isArray(jobs)) {
      throw new Error('El servicio real devolvió una lista de proyectos inválida.');
    }
    return jobs.map((job) => validateJob(job));
  }

  async getJob(jobId) {
    return validateJob(await this.request('GET', `/jobs/${encodeURIComponent(jobId)}`));
  }

  async submitProposal(payload) {
    return validateExecutionResult(
      await this.request('POST', '/proposals', {
        approvalId: payload.approvalId,
        jobId: payload.jobId,
        content: payload.content,
        bid: payload.bid,
        timeline: payload.timeline
      })
    );
  }

  async getExecutionStatus(externalId) {
    return validateExecutionResult(await this.request('GET', `/executions/${encodeURIComponent(externalId)}`));
  }
}

module.exports = {
  RemoteFreelancerIntegration
};
