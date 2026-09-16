/**
 * Mikasa — Ticket Handler
 * Extracted from index.js — handles all ticket-related interactions.
 */
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { isStaffMember, applyTicketPermissionOverwrites } = require('../utils');
const ticketConfig = require('../ticket-config.json');
const { loadProjects, saveProjects } = require('../db');
const { componentHasButton } = require('../utils');

const projectTicket = require('./projectTicket');
const applySystem = require('./applySystem');
const questionFlow = require('./questionFlow');

function countOpenTickets(guild) {
  const categoryId = ticketConfig.TICKET_CATEGORY_ID;
  if (!categoryId) return 0;
  const category = guild.channels.cache.get(categoryId);
  if (!category) return 0;
  return category.children.cache.filter(ch => ch.name?.startsWith('🎫・')).size;
}

module.exports = {
  handleInteraction(interaction, client) {
    // Ticket claim
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
      const channel = interaction.channel;
      if (!isStaffMember(interaction.member)) {
        return interaction.reply({ content: ticketConfig.MESSAGES.CLAIM_STAFF_ONLY, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
      }
      const claimDesc = (ticketConfig.MESSAGES.CLAIM_SUCCESS_DESCRIPTION || '').replace('{user}', interaction.user);
      channel.send({
        components: [new ContainerBuilder()
          .setAccentColor(0xFFDD00)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${ticketConfig.MESSAGES.CLAIM_SUCCESS_TITLE || ''}` + (claimDesc ? `\n\n${claimDesc}` : '')))
        ],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {});
      require('../ticketLogger').logTicketAction(client, 'CLAIMED', interaction.user, channel, `Ticket claimed by ${interaction.user.tag}`, '#FFDD00');
      try { interaction.deferUpdate(); } catch (e) {}
      return;
    }

    // Ticket unclaim
    if (interaction.isButton() && interaction.customId === 'unclaim_ticket') {
      const channel = interaction.channel;
      if (!isStaffMember(interaction.member)) {
        return interaction.reply({ content: ticketConfig.MESSAGES.CLAIM_STAFF_ONLY, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
      }
      const messages = channel.messages.cache.filter(m => m.components?.length > 0);
      for (const msg of messages) {
        if (componentHasButton(msg.components, 'unclaim_ticket')) {
          const row = msg.components[0].components.find(c => c.type === 1);
          if (row) {
            row.components[0].custom_id = 'claim_ticket';
            row.components[0].label = 'Claim';
            row.components[0].style = ButtonStyle.Secondary;
            row.components[0].emoji = { name: '🙋‍♂️' };
            row.components[0].disabled = false;
          }
          msg.edit({ components: [new ContainerBuilder(msg.components[0])], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
          break;
        }
      }
      return;
    }

    // Accept project (legacy)
    if (interaction.isButton() && interaction.customId.startsWith('accept_project_')) {
      const ticketNumber = interaction.customId.replace('accept_project_', '');
      const project = projectTicket.projectStore.get(ticketNumber);
      if (!project) return interaction.reply({ content: 'Project not found.', flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
      if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
      project.status = 'accepted';
      projectTicket.projectStore.set(ticketNumber, project);
      projectTicket.persistProjectStore();
      return projectTicket.handleProjectAccept(interaction, client);
    }

    // Decline project (legacy)
    if (interaction.isButton() && interaction.customId.startsWith('decline_project_')) {
      if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
      return projectTicket.handleProjectDecline(interaction, client);
    }

    // Decline reason submit
    if (interaction.isModalSubmit() && interaction.customId.startsWith('decline_reason_')) {
      if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
      return projectTicket.handleDeclineReasonSubmit(interaction, client);
    }

    // Project type select (legacy)
    if (interaction.isStringSelectMenu() && interaction.customId === 'project_type_select') {
      const ticketNumber = interaction.customId.replace('project_type_select_', '');
      const channel = interaction.channel;
      const guild = interaction.guild;
      const clientId = interaction.user.id;
      const session = {
        type: 'client_project',
        currentIndex: 0,
        answers: [],
        questions: [
          { id: 'game_type', text: 'What type of game/project is this?', type: 'modal' },
          { id: 'payment_method', text: 'What payment method do you prefer?', type: 'select', options: [
            { label: 'Per Task', value: 'per_task', emoji: '📋' },
            { label: '50% Upfront', value: '50_upfront', emoji: '💰' },
            { label: 'After Completion', value: 'after_completion', emoji: '✅' },
          ], placeholder: 'Select payment method...' },
          { id: 'project_time', text: 'What is your desired timeline?', type: 'modal' },
          { id: 'details', text: 'Describe your project details:', type: 'modal', meta: { maxLength: 2000 } },
          { id: 'dev_count', text: 'How many developers do you need?', type: 'modal' },
          { id: 'roles_needed', text: 'What roles are needed?', type: 'modal' },
          { id: 'media', text: 'Links to references/media (optional):', type: 'modal' },
          { id: 'terms', text: 'Do you agree to the project terms?', type: 'confirm', confirmLabel: '✅ I Agree', declineLabel: '❌ I Decline', termsFile: 'terms.md' },
        ],
        questionsMeta: null,
        userId: clientId,
        channelId: channel.id,
        ticketNumber,
        flowTitle: '📋 Project Request',
        guildId: guild.id,
        canEdit: false,
      };
      require('./questionFlow').setSession(clientId, session);
      const fakeInteraction = {
        user: { id: clientId },
        channel: { id: channel.id, send: channel.send.bind(channel), guild: { id: guild.id } },
        guild: { id: guild.id },
        replied: false, deferred: false,
        update: async (opts) => { await channel.send(opts); },
        reply: async (opts) => { await channel.send(opts); },
      };
      return questionFlow.showCurrentQuestion(fakeInteraction, session);
    }

    // Project accept/decline via admin review buttons
    if (interaction.isButton() && interaction.customId.startsWith('admin_accept_project_')) {
      return projectTicket.handleProjectAccept(interaction, client);
    }
    if (interaction.isButton() && interaction.customId.startsWith('admin_decline_project_')) {
      return projectTicket.handleProjectDecline(interaction, client);
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith('decline_reason_')) {
      return projectTicket.handleDeclineReasonSubmit(interaction, client);
    }
  },

  get openTicketsCount() { return countOpenTickets; },
};
