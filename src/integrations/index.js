'use strict';

const { LocalFreelancerIntegration } = require('./local');
const { RemoteFreelancerIntegration } = require('./freelancer');

function createFreelancerIntegration(options = {}) {
  const mode = options.mode || 'local';

  if (mode === 'local') {
    return new LocalFreelancerIntegration(options);
  }

  if (mode === 'real') {
    return new RemoteFreelancerIntegration(options);
  }

  throw new Error(`Modo no soportado: ${mode}`);
}

module.exports = {
  createFreelancerIntegration,
  LocalFreelancerIntegration,
  RemoteFreelancerIntegration
};
