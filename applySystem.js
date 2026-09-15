const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { saveAndSend } = require('./savingSystem');
const { setSession, showCurrentQuestion } = require('./questionFlow');
const { CHANNELS, ROLES } = require('./config');
const { isStaffMember } = require('./utils');
const ticketConfig = require('./ticket-config.json');

const DEVELOPER_APPLICATIONS_CHANNEL_ID = CHANNELS.DEVELOPER_APPLICATIONS;
const AI_AGENT_RESULTS_CHANNEL_ID = CHANNELS.AI_AGENT_RESULTS;
const ADMIN_ROLE_ID = ROLES.ADMIN;
const DEVELOPER_ROLE_ID = ROLES.DEVELOPER;

const APPLY_ROLE_OPTIONS = [
  { label: 'Scripter', value: 'role_scripter', emoji: '💻' },
  { label: 'Builder', value: 'role_builder', emoji: '🏗️' },
  { label: 'Modeler', value: 'role_modeler', emoji: '🎨' },
  { label: 'FVX', value: 'role_fvx', emoji: '✨' },
  { label: 'SFX', value: 'role_sfx', emoji: '🔊' },
  { label: 'Animator', value: 'role_animator', emoji: '🎬' },
  { label: 'Graphique Designer', value: 'role_graphique', emoji: '🖌️' },
  { label: 'UI Designer', value: 'role_ui', emoji: '🖥️' },
  { label: 'Manager', value: 'role_manager', emoji: '📋' },
  { label: 'Marketing Team', value: 'role_marketing', emoji: '📢' },
];

const RULES_TEXT =
  '**Payment Split**\n' +
  '• **Client from the Server** → Developer: **60%** / Server: **40%**\n' +
  '• **Client from the Developer** → Developer: **90%** / Server: **10%**\n\n' +
  '**Multiple Developers**\n' +
  '• If more than one developer works on a project, the developer\'s share is divided equally unless an admin decides otherwise. The server\'s percentage does not change.\n\n' +
  '**Minimum Part for a Single Developer**\n' +
  '• Large projects must have a minimum part of **$100 USD** for a single developer.\n\n' +
  '**General Rules**\n' +
  '• Complete the project professionally and on time.\n' +
  '• Keep the client updated on progress.\n' +
  '• Do not bypass the server\'s commission for server-provided clients.\n' +
  '• Contact an admin if there is any dispute or issue.\n' +
  '• Administration has the final decision in any conflict.\n' +
  '• You will not get paid if you did not finish the project.\n' +
  '• Talking with the client outside the server is not allowed.\n' +
  '• The developers will get paid after the client receives the project, for protection.';

const APPLY_QUESTIONS = [
  { id: 'name', text: 'What is your Name?', type: 'modal' },
  { id: 'age', text: 'What is your Age?', type: 'modal', meta: { type: 'age' } },
  { id: 'timezone', text: 'What is your Timezone?', type: 'modal', meta: { type: 'timezone' } },
  { id: 'role', text: 'Select your Role:', type: 'select', placeholder: 'Choose your role...', options: APPLY_ROLE_OPTIONS },
  { id: 'projects', text: 'What is the best project you did? — List Your Projects:', type: 'modal' },
  { id: 'availability', text: 'How long are you available?', type: 'modal' },
  { id: 'specialty', text: 'What is your specialty? (What are you specialized in)', type: 'modal' },
  { id: 'payment_methods', text: 'What payment methods do you accept?', type: 'modal' },
];

const STAFF_QUESTIONS = [
  { id: 'name', text: 'What is your Name?', type: 'modal' },
  { id: 'age', text: 'What is your Age?', type: 'modal', meta: { type: 'age' } },
  { id: 'timezone', text: 'What is your Timezone?', type: 'modal', meta: { type: 'timezone' } },
  { id: 'experience', text: 'Do you have any moderation/staff experience?', type: 'modal' },
  { id: 'reason', text: 'Why do you want to be a Staff member?', type: 'modal' },
  { id: 'availability', text: 'How many hours per day can you be active?', type: 'modal' },
  { id: 'terms', text: 'Do you agree to our staff terms?', type: 'confirm', confirmLabel: '✅ I Agree', declineLabel: '❌ I Decline' },
];

async function startApplyFlow(interaction) {
  const channel = interaction.channel;

  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📝 Developer / Staff Application\n\nClick the button below to start your application.\n\nWe will ask you a few questions to review your application.`),
      new TextDisplayBuilder().setContent(`*Lunexis Team*`)
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_developer_apply')
      .setLabel('Apply as Developer')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝'),
    new ButtonBuilder()
      .setCustomId('start_staff_apply')
      .setLabel('Apply as Staff')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🛡️')
  );

  await channel.send({ components: [container, row], flags: MessageFlags.IsComponentsV2 });
}

async function handleApplyButton(interaction) {
  const ticketNumber = interaction.channel.name.replace('🎫・', '');
  const session = {
    type: 'developer',
    currentIndex: 0,
    answers: [],
    questions: APPLY_QUESTIONS,
    questionsMeta: APPLY_QUESTIONS.map(q => q.meta || null),
    userId: interaction.user.id,
    channelId: interaction.channel.id,
    ticketNumber,
    flowTitle: '📝 Developer Application',
    onComplete: async (interaction, session, filePath) => {
      await finalizeApplication(interaction, session, filePath);
    }
  };
  setSession(interaction.user.id, session);
  await showCurrentQuestion(interaction, session);
}

async function handleStaffApplyButton(interaction) {
  const ticketNumber = interaction.channel.name.replace('🎫・', '');
  const session = {
    type: 'staff',
    currentIndex: 0,
    answers: [],
    questions: STAFF_QUESTIONS,
    questionsMeta: STAFF_QUESTIONS.map(q => q.meta || null),
    userId: interaction.user.id,
    channelId: interaction.channel.id,
    ticketNumber,
    flowTitle: '📝 Staff Application',
    onComplete: async (interaction, session, filePath) => {
      await finalizeApplication(interaction, session, filePath);
    }
  };
  setSession(interaction.user.id, session);
  await showCurrentQuestion(interaction, session);
}

function buildApplySummaryEmbed(session, userTag) {
  const answers = {};
  session.answers.forEach(a => { answers[a.question] = a.answer; });

  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📝 Developer Application\n\nNew developer application from **${userTag}**`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Name:** ${answers[APPLY_QUESTIONS[0].text] || 'N/A'}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Age:** ${answers[APPLY_QUESTIONS[1].text] || 'N/A'}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Timezone:** ${answers[APPLY_QUESTIONS[2].text] || 'N/A'}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Role:** ${answers[APPLY_QUESTIONS[3].text] || 'N/A'}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Projects:** ${(answers[APPLY_QUESTIONS[4].text] || 'N/A').slice(0, 1024)}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Availability:** ${answers[APPLY_QUESTIONS[5].text] || 'N/A'}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Specialty:** ${answers[APPLY_QUESTIONS[6].text] || 'N/A'}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Payment Methods:** ${answers[APPLY_QUESTIONS[7].text] || 'N/A'}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Ticket #${session.ticketNumber} | <t:${Math.floor(Date.now() / 1000)}:F>*`));

  return container;
}

async function finalizeApplication(interaction, session, filePath) {
  const guild = interaction.guild;
  const channel = guild.channels.cache.get(DEVELOPER_APPLICATIONS_CHANNEL_ID);

  const confirmationContainer = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ✅ Application Submitted\n\nThank you **${interaction.user.tag}**! Your application has been submitted successfully.\n\nThe team will review it shortly.`),
      new TextDisplayBuilder().setContent(`*Lunexis Team*`)
    );

  await interaction.channel.send({ components: [confirmationContainer], flags: MessageFlags.IsComponentsV2 });

  if (!channel) {
    console.error(`Admin channel ${DEVELOPER_APPLICATIONS_CHANNEL_ID} not found`);
    return;
  }

  const summaryContainer = buildApplySummaryEmbed(session, interaction.user.tag);
  await channel.send({ components: [summaryContainer], flags: MessageFlags.IsComponentsV2 });

  try {
    const { scanPortfolio } = require('./portfolioScanner');
    const scanReport = scanPortfolio(session.answers, {
      userTag: interaction.user.tag,
      userId: interaction.user.id,
      ticketNumber: session.ticketNumber,
      selectedRole: session.answers.find(a => /role/i.test(a.question))?.answer || ''
    });

    if (scanReport.classification === 'FAKE' || scanReport.classification === 'STOLEN') {
      const { buildReportEmbed } = require('./portfolioScanner/templates/reportEmbed');
      const reportContainer = buildReportEmbed(scanReport);

      const warningContainer = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ⚠️ Fake Portfolio Detected\n\nThe portfolio submitted by **${interaction.user.tag}** has been flagged as **${scanReport.classification}**.\n\nPlease review manually.`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Rating:** ${scanReport.rawScores.legit}/100\n**Confidence:** ${scanReport.confidence}`),
          new TextDisplayBuilder().setContent(`*Ticket #${session.ticketNumber} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
        );

      await channel.send({ components: [warningContainer, reportContainer], flags: MessageFlags.IsComponentsV2 });

      await interaction.user.send(
        '⚠️ **Your application has been flagged.**\n\n' +
        'Your portfolio appears to contain content that isn\'t your original work or was generated by AI. Please ensure your application reflects your genuine work and reapply. If you believe this is a mistake, please contact an admin.\n\n' +
        '*— Lunexis Team*'
      ).catch(err => console.error('Failed to DM flagged application notice:', err));
    } else {
      const rating = scanReport.rawScores.legit;
      const { buildReportEmbed } = require('./portfolioScanner/templates/reportEmbed');
      const reportContainer = buildReportEmbed(scanReport);

      const ratingContainer = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ✅ Portfolio Scan Complete\n\nThe portfolio submitted by **${interaction.user.tag}** has been scanned.`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Rating:** ${rating}/100\n**Classification:** ${scanReport.classification}\n**Confidence:** ${scanReport.confidence}`),
          new TextDisplayBuilder().setContent(`*Ticket #${session.ticketNumber} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
        );

      const approveRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dev_app_approve_${session.ticketNumber}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`dev_app_decline_${session.ticketNumber}`)
          .setLabel('Refuse')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌')
      );

      ratingContainer.addActionRowComponents(approveRow);

      await channel.send({ components: [ratingContainer, reportContainer], flags: MessageFlags.IsComponentsV2 });
    }
  } catch (scanErr) {
    console.error('Portfolio scanner error:', scanErr);
  }
}

async function handleDevAppApprove(interaction) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const ticketNumber = interaction.customId.replace('dev_app_approve_', '');
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ✅ Application Approved\n\nThis developer application has been approved.`)
    );

  try { await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }); } catch (e) {}

  const msgContainer = interaction.message.components[0];
  const textContent = msgContainer?.components?.find(c => c.type === 10)?.content || '';
  const userTag = textContent.match(/\*\*(.+?)\*\*/);
  if (!userTag) return;

  try {
    const member = await interaction.guild.members.fetch({ query: userTag[1], limit: 1 });
    const target = member.first();
    if (target) {
      await target.roles.add(DEVELOPER_ROLE_ID);
    }

    const adminChannel = interaction.guild.channels.cache.get(DEVELOPER_APPLICATIONS_CHANNEL_ID);
    if (adminChannel) {
      const approvalContainer = new ContainerBuilder()
        .setAccentColor(0x00FF00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ✅ Developer Approved\n\n**${userTag[1]}** has been approved as a developer.\n\nRole <@&${DEVELOPER_ROLE_ID}> has been assigned.`),
          new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
        );
      await adminChannel.send({ components: [approvalContainer], flags: MessageFlags.IsComponentsV2 });
    }
  } catch (err) {
    console.error('Failed to assign role / send notification:', err.message);
  }
}

async function handleDevAppDecline(interaction) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const ticketNumber = interaction.customId.replace('dev_app_decline_', '');
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ❌ Application Refused\n\nThis developer application has been refused.`)
    );

  try { await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }); } catch (e) {}

  const msgContainer = interaction.message.components[0];
  const textContent = msgContainer?.components?.find(c => c.type === 10)?.content || '';
  const userTag = textContent.match(/\*\*(.+?)\*\*/);
  if (!userTag) return;

  const adminChannel = interaction.guild.channels.cache.get(DEVELOPER_APPLICATIONS_CHANNEL_ID);
  if (adminChannel) {
    const declineContainer = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ❌ Developer Declined\n\n**${userTag[1]}** has been declined as a developer.`),
        new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
      );
    await adminChannel.send({ components: [declineContainer], flags: MessageFlags.IsComponentsV2 });
  }
}

module.exports = {
  startApplyFlow,
  handleApplyButton,
  handleStaffApplyButton,
  finalizeApplication,
  handleDevAppApprove,
  handleDevAppDecline,
  APPLY_QUESTIONS,
  STAFF_QUESTIONS,
  APPLY_ROLE_OPTIONS,
  DEVELOPER_APPLICATIONS_CHANNEL_ID,
  ADMIN_ROLE_ID,
  DEVELOPER_ROLE_ID,
  RULES_TEXT,
};
