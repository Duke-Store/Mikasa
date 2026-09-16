/**
 * Mikasa — Developer Application Handler
 * Handles developer applications for accepted projects:
 * - Apply to a project (portfolio submission)
 * - Client accepts/declines developer
 * - Post-acceptance: assign developer to project, set up workspace
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { isStaffMember } = require('../utils');
const projectTicket = require('../projectTicket');
const ticketConfig = require('../ticket-config.json');

/**
 * Show portfolio submission modal for a developer applying to a project.
 */
async function showPortfolioModal(interaction, ticketNumber) {
  const project = projectTicket.projectStore.get(ticketNumber);
  if (!project) {
    return interaction.reply({ content: '❌ Project not found.', flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  }
  if (project.state === 'CLOSED' || project.state === 'DECLINED') {
    return interaction.reply({ content: '❌ This project is no longer accepting applications.', flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  }

  const modal = new ModalBuilder()
    .setCustomId(`dev_portfolio_${ticketNumber}`)
    .setTitle('Submit Your Portfolio');
  const input = new TextInputBuilder()
    .setCustomId('portfolio_input')
    .setLabel('Paste a link or describe your portfolio (GitHub, DevForum, previous work)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1024);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

/**
 * Handle developer portfolio modal submission.
 * Sends portfolio to client for review with accept/decline buttons.
 */
async function handlePortfolioSubmit(interaction, ticketNumber, client) {
  const project = projectTicket.projectStore.get(ticketNumber);
  if (!project) {
    return interaction.reply({ content: '❌ Project not found.', flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  }

  const portfolio = interaction.fields.getTextInputValue('portfolio_input');
  const devId = interaction.user.id;

  // Store the application in the project
  if (!project.devApplications) project.devApplications = [];
  project.devApplications.push({
    developerId: devId,
    developerTag: interaction.user.tag,
    portfolio: portfolio,
    appliedAt: Date.now(),
    status: 'pending', // pending | accepted | declined
  });
  projectTicket.projectStore.set(ticketNumber, project);
  projectTicket.persistProjectStore();

  // Send portfolio to client for review
  const clientId = project.clientId || project.userId;
  let clientUser;
  try {
    clientUser = await client.users.fetch(clientId);
  } catch (e) {
    return interaction.reply({ content: '❌ Could not find project client.', flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  }

  const acceptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`dev_accept_${devId}_${ticketNumber}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`dev_decline_${devId}_${ticketNumber}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  const portfolioContainer = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📝 Developer Application\n\n**Developer:** <@${devId}>\n**Portfolio:**\n${portfolio}`),
      new TextDisplayBuilder().setContent(`*Project #${ticketNumber}*`)
    );
  portfolioContainer.addActionRowComponents(acceptRow);

  await clientUser.send({ components: [portfolioContainer], flags: MessageFlags.IsComponentsV2 })
    .catch(err => console.error('Failed to DM portfolio to client:', err));

  await interaction.reply({ content: '✅ Your portfolio has been sent to the client for review.', flags: MessageFlags.HTTP_NO_CONTENT });
}

/**
 * Client accepts a developer for their project.
 * Assigns developer, sets up collaboration.
 */
async function handleClientAcceptDev(interaction, devId, ticketNumber, client) {
  const project = projectTicket.projectStore.get(ticketNumber);
  if (!project) {
    return interaction.reply({ content: '❌ Project not found.', flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  }

  // Update application status
  if (project.devApplications) {
    const app = project.devApplications.find(a => a.developerId === devId);
    if (app) app.status = 'accepted';
  }

  // Add to assigned developers
  if (!project.assignedDevelopers) project.assignedDevelopers = [];
  if (!project.assignedDevelopers.find(d => d.id === devId)) {
    project.assignedDevelopers.push({ id: devId, tag: interaction.user.tag, assignedAt: Date.now() });
  }

  project.state = 'IN_PROGRESS';
  project.ticketState = 'in_progress';
  projectTicket.projectStore.set(ticketNumber, project);
  projectTicket.persistProjectStore();

  // Grant developer access to ticket channel
  try {
    const guild = client.guilds.cache.get(interaction.guildId);
    if (guild) {
      const ticketChannel = guild.channels.cache.get(project.channelId);
      if (ticketChannel) {
        await ticketChannel.permissionOverwrites.edit(devId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(err => console.error('Failed to add developer to ticket channel:', err));
      }
    }
  } catch (e) { console.error('Permission grant error:', e.message); }

  // Notify developer
  const devUser = await client.users.fetch(devId).catch(() => null);
  if (devUser) {
    await devUser.send('✅ **You have been accepted to work on the project!**\n\nA staff member will add you to the project channel. Welcome to the team!')
      .catch(err => console.error('Failed to DM developer acceptance:', err));
  }

  await interaction.update({ content: '✅ **Developer has been added to your project.**', components: [] })
    .catch(() => {});
}

/**
 * Client declines a developer application.
 */
async function handleClientDeclineDev(interaction, devId, ticketNumber, client) {
  const project = projectTicket.projectStore.get(ticketNumber);
  if (!project) {
    return interaction.reply({ content: '❌ Project not found.', flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  }

  // Update application status
  if (project.devApplications) {
    const app = project.devApplications.find(a => a.developerId === devId);
    if (app) app.status = 'declined';
  }

  projectTicket.projectStore.set(ticketNumber, project);
  projectTicket.persistProjectStore();

  const devUser = await client.users.fetch(devId).catch(() => null);
  if (devUser) {
    await devUser.send('❌ **Unfortunately, the client has declined your application for this project.**')
      .catch(err => console.error('Failed to DM developer decline:', err));
  }

  await interaction.update({ content: '❌ **You have declined the developer.**', components: [] })
    .catch(() => {});
}

/**
 * Get available projects for developer matching.
 * Returns projects in ACCEPTED state that don't have enough developers.
 */
function getOpenProjectsForMatching() {
  const openProjects = [];
  for (const [id, project] of projectTicket.projectStore.entries()) {
    if (project.state === 'ACCEPTED' || project.ticketState === 'accepted') {
      const devCount = project.assignedDevelopers?.length || 0;
      const needed = project.devCount || 1;
      if (devCount < needed) {
        openProjects.push({ id, ...project });
      }
    }
  }
  return openProjects;
}

/**
 * Match a developer to open projects based on role/specialty.
 * Returns matching project IDs.
 */
function matchDeveloperToProjects(devRole, devSpecialty) {
  const openProjects = getOpenProjectsForMatching();
  const matches = [];

  for (const project of openProjects) {
    let score = 0;

    // Match by role
    const projectRoles = project.rolesNeeded || '';
    if (projectRoles.toLowerCase().includes(devRole?.toLowerCase() || '')) {
      score += 3;
    }

    // Match by specialty
    if (devSpecialty && project.description) {
      const desc = project.description.toLowerCase();
      const spec = devSpecialty.toLowerCase();
      if (desc.includes(spec)) score += 2;
    }

    if (score > 0) {
      matches.push({ project, score });
    }
  }

  // Sort by match score descending
  matches.sort((a, b) => b.score - a.score);
  return matches.map(m => m.project);
}

module.exports = {
  showPortfolioModal,
  handlePortfolioSubmit,
  handleClientAcceptDev,
  handleClientDeclineDev,
  getOpenProjectsForMatching,
  matchDeveloperToProjects,
};
