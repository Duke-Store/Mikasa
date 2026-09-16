#!/usr/bin/env node
/**
 * Development Workflow Manager — orchestrates post-acceptance flows
 * 
 * Handles: project state transitions, milestone tracking, developer matching,
 * delivery confirmation, and post-delivery workflows.
 */

const { projectTicket } = require('./projectTicket');
const devMatch = require('./handlers/devMatch');

/**
 * Project States
 * SUBMITTED → AI_ANALYSIS → ADMIN_REVIEW → ACCEPTED | DECLINED
 * ACCEPTED → IN_PROGRESS → DELIVERED → PAYMENT_PENDING → COMPLETED
 *           → CLOSED (if cancelled)
 */
const PROJECT_STATES = {
  SUBMITTED: 'SUBMITTED',
  AI_ANALYSIS: 'AI_ANALYSIS',
  ADMIN_REVIEW: 'ADMIN_REVIEW',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  DECLINED: 'DECLINED',
};

/**
 * Transition a project to a new state with validation.
 */
function transitionProject(projectId, newState, metadata = {}) {
  const project = projectTicket.projectStore.get(projectId);
  if (!project) return { ok: false, error: 'Project not found' };

  const validTransitions = {
    [PROJECT_STATES.SUBMITTED]: [PROJECT_STATES.AI_ANALYSIS, PROJECT_STATES.ADMIN_REVIEW, PROJECT_STATES.DECLINED],
    [PROJECT_STATES.AI_ANALYSIS]: [PROJECT_STATES.ADMIN_REVIEW, PROJECT_STATES.DECLINED],
    [PROJECT_STATES.ADMIN_REVIEW]: [PROJECT_STATES.ACCEPTED, PROJECT_STATES.DECLINED],
    [PROJECT_STATES.ACCEPTED]: [PROJECT_STATES.IN_PROGRESS, PROJECT_STATES.CLOSED],
    [PROJECT_STATES.IN_PROGRESS]: [PROJECT_STATES.DELIVERED, PROJECT_STATES.CLOSED],
    [PROJECT_STATES.DELIVERED]: [PROJECT_STATES.PAYMENT_PENDING, PROJECT_STATES.CLOSED],
    [PROJECT_STATES.PAYMENT_PENDING]: [PROJECT_STATES.COMPLETED, PROJECT_STATES.DELIVERED],
    [PROJECT_STATES.COMPLETED]: [],
    [PROJECT_STATES.CLOSED]: [],
    [PROJECT_STATES.DECLINED]: [],
  };

  const current = project.state || PROJECT_STATES.SUBMITTED;
  const allowed = validTransitions[current] || [];
  if (!allowed.includes(newState)) {
    return { ok: false, error: `Invalid transition: ${current} → ${newState}` };
  }

  project.state = newState;
  project.stateChangedAt = Date.now();
  if (metadata) Object.assign(project, metadata);
  projectTicket.projectStore.set(projectId, project);
  projectTicket.persistProjectStore();

  console.log(`[Workflow] Project ${projectId} → ${newState}`);
  return { ok: true, project };
}

/**
 * Start a project's active phase (after acceptance).
 * Creates milestone tracking, notifies parties.
 */
async function startProjectActivePhase(projectId, client) {
  const result = transitionProject(projectId, PROJECT_STATES.IN_PROGRESS, {
    activeSince: Date.now(),
  });
  if (!result.ok) return result;

  const project = result.project;
  const user = await client.users.fetch(project.clientId).catch(() => null);
  if (user) {
    await user.send(`✅ **Project Started!**\n\nYour project **#${projectId}** is now in progress.\nDevelopers have been assigned and work has begun.`)
      .catch(() => {});
  }

  // Notify assigned developers
  for (const dev of project.assignedDevelopers || []) {
    try {
      const devUser = await client.users.fetch(dev.id);
      await devUser.send(`🚀 **New Project Assigned!**\n\nYou've been assigned to project **#${projectId}**.\nCheck the project channel for details.`)
        .catch(() => {});
    } catch (e) { /* skip */ }
  }

  return result;
}

/**
 * Mark a project as delivered by the developer(s).
 */
async function markProjectDelivered(projectId, client) {
  const result = transitionProject(projectId, PROJECT_STATES.DELIVERED, {
    deliveredAt: Date.now(),
  });
  if (!result.ok) return result;

  const project = result.project;
  const user = await client.users.fetch(project.clientId).catch(() => null);
  if (user) {
    await user.send(`📦 **Project Delivered!**\n\nThe developers have submitted their work for project **#${projectId}**.\nPlease review and confirm receipt to proceed with payment.`)
      .catch(() => {});
  }

  return result;
}

/**
 * Confirm receipt and trigger payment flow.
 */
async function confirmDeliveryReceived(projectId, client) {
  const result = transitionProject(projectId, PROJECT_STATES.PAYMENT_PENDING, {
    confirmedAt: Date.now(),
  });
  if (!result.ok) return result;

  const project = result.project;
  const user = await client.users.fetch(project.clientId).catch(() => null);
  if (user) {
    await user.send(`💳 **Delivery Confirmed!**\n\nPayment is now due for project **#${projectId}**.\nPlease complete payment to release funds to the developers.`)
      .catch(() => {});
  }

  return result;
}

/**
 * Complete a project — all parties satisfied, project closed.
 */
async function completeProject(projectId, client) {
  const result = transitionProject(projectId, PROJECT_STATES.COMPLETED, {
    completedAt: Date.now(),
  });
  if (!result.ok) return result;

  const project = result.project;
  const user = await client.users.fetch(project.clientId).catch(() => null);
  if (user) {
    await user.send(`🏆 **Project Completed!**\n\nProject **#${projectId}** has been marked as complete.\nThank you for using our services!`)
      .catch(() => {});
  }

  for (const dev of project.assignedDevelopers || []) {
    try {
      const devUser = await client.users.fetch(dev.id);
      await devUser.send(`🏆 **Project Completed!**\n\nYour work on project **#${projectId}** is complete.\nPayment has been processed.`)
        .catch(() => {});
    } catch (e) { /* skip */ }
  }

  return result;
}

/**
 * Close a project without completion (cancellation).
 */
async function closeProject(projectId, reason, client) {
  const result = transitionProject(projectId, PROJECT_STATES.CLOSED, {
    closedAt: Date.now(),
    closeReason: reason,
  });
  if (!result.ok) return result;

  const project = result.project;
  const user = await client.users.fetch(project.clientId).catch(() => null);
  if (user) {
    await user.send(`❌ **Project Closed**\n\nProject **#${projectId}** has been closed.\nReason: ${reason}`)
      .catch(() => {});
  }

  return result;
}

/**
 * Get workflow summary for a project.
 */
function getProjectWorkflowSummary(projectId) {
  const project = projectTicket.projectStore.get(projectId);
  if (!project) return null;

  return {
    id: projectId,
    state: project.state || PROJECT_STATES.SUBMITTED,
    client: project.clientId || project.userId,
    clientTag: project.clientTag || project.userTag,
    developers: project.assignedDevelopers || [],
    devApplications: project.devApplications || [],
    milestones: project.milestones || [],
    paymentMethod: project.paymentMethod || 'per_task',
    createdAt: project.createdAt || 0,
    stateChangedAt: project.stateChangedAt || 0,
    activeSince: project.activeSince || 0,
    deliveredAt: project.deliveredAt || 0,
    completedAt: project.completedAt || 0,
  };
}

/**
 * Get all projects in a given state.
 */
function getProjectsByState(state) {
  const results = [];
  for (const [id, project] of projectTicket.projectStore.entries()) {
    if (project.state === state) {
      results.push({ id, ...project });
    }
  }
  return results;
}

/**
 * State machine as a module export — useful for admin commands and webhook handlers.
 */
const stateMachine = {
  STATES: PROJECT_STATES,
  transition: transitionProject,
  startActivePhase: startProjectActivePhase,
  markDelivered: markProjectDelivered,
  confirmDelivery: confirmDeliveryReceived,
  complete: completeProject,
  close: closeProject,
  getSummary: getProjectWorkflowSummary,
  getByState: getProjectsByState,
};

module.exports = {
  ...stateMachine,
  PROJECT_STATES,
};
