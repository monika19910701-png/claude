'use strict';

const {
  analyzeJob,
  buildApprovalRequest,
  buildProposal,
  reviewProfile
} = require('./workflow');
const {
  approveAction,
  executeApprovedAction,
  getOpportunity,
  listOpportunities,
  requestApprovalForDraft,
  saveDraft,
  verifyExecution
} = require('./runtime');
const { createFreelancerIntegration } = require('./integrations');

module.exports = {
  analyzeJob,
  approveAction,
  buildApprovalRequest,
  buildProposal,
  createFreelancerIntegration,
  executeApprovedAction,
  getOpportunity,
  listOpportunities,
  requestApprovalForDraft,
  reviewProfile,
  saveDraft,
  verifyExecution
};
