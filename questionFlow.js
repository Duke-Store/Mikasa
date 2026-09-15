const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { saveAndSend } = require('./savingSystem');
const fs = require('fs');
const path = require('path');
const { writeFileAsync } = require('./utils');

const activeSessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;
const SESSIONS_FILE = path.join(__dirname, 'saved-sessions.json');

function loadSavedSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return {};
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8').trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load saved sessions:', err);
    return {};
  }
}

function saveSessionsToDisk() {
  try {
    const obj = {};
    for (const [userId, session] of activeSessions) {
      if (Date.now() - session.lastActivity > SESSION_TTL) continue;
      obj[userId] = {
        questions: session.questions,
        answers: session.answers,
        currentIndex: session.currentIndex,
        type: session.type,
        ticketNumber: session.ticketNumber,
        flowTitle: session.flowTitle,
        questionsMeta: session.questionsMeta,
        userId: session.userId,
        channelId: session.channelId,
        lastActivity: session.lastActivity,
        canEdit: session.canEdit || false,
      };
    }
    return writeFileAsync(SESSIONS_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Failed to save sessions:', err);
    return Promise.resolve();
  }
}

function makeOnComplete(type) {
  if (type === 'developer' || type === 'staff') {
    return async (interaction, session, filePath, client) => {
      const { finalizeApplication } = require('./applySystem');
      await finalizeApplication(interaction, session, filePath);
    };
  }
  if (type === 'client_project') {
    return async (interaction, session, filePath, client) => {
      const { sendForAdminReview } = require('./projectTicket');
      await sendForAdminReview(interaction, session, client);
    };
  }
  if (type === 'seller') {
    return async (interaction, session, filePath, client) => {
      const { handleSellerSubmit } = require('./projectTicket');
      await handleSellerSubmit(interaction, session, client);
    };
  }
  if (type === 'buyer') {
    return async (interaction, session, filePath, client) => {
      const { handleBuyerSubmit } = require('./projectTicket');
      await handleBuyerSubmit(interaction, session, client);
    };
  }
  return null;
}

function restoreSessions(client) {
  const saved = loadSavedSessions();
  let restored = 0;
  for (const [userId, data] of Object.entries(saved)) {
    if (Date.now() - data.lastActivity > SESSION_TTL) continue;
    const session = {
      ...data,
      onComplete: makeOnComplete(data.type),
    };
    activeSessions.set(userId, session);
    restored++;
  }
  if (restored > 0) console.log(`Restored ${restored} Q&A sessions from disk`);
  return restored;
}

function getSession(userId) {
  const session = activeSessions.get(userId);
  if (!session) return null;
  if (Date.now() - session.lastActivity > SESSION_TTL) {
    activeSessions.delete(userId);
    return null;
  }
  return session;
}

function setSession(userId, session) {
  session.lastActivity = Date.now();
  activeSessions.set(userId, session);
  saveSessionsToDisk();
}

function deleteSession(userId) {
  activeSessions.delete(userId);
  saveSessionsToDisk();
}

// === Build helper functions ===

function buildAnswerButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('answer_question')
      .setLabel('Answer')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✏️')
  );
}

function buildEditButton(session) {
  const answeredIndices = [];
  for (let i = 0; i < session.answers.length; i++) {
    answeredIndices.push(i);
  }
  if (answeredIndices.length === 0) return null;

  const select = new StringSelectMenuBuilder()
    .setCustomId(`edit_question_${session.userId}`)
    .setPlaceholder('Select a question to edit...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(answeredIndices.map(i => new StringSelectMenuOptionBuilder()
      .setLabel(`Q${i + 1}: ${session.questions[i].text.slice(0, 30)}${session.questions[i].text.length > 30 ? '...' : ''}`)
      .setValue(String(i))
      .setDescription(session.answers[i] ? `Current: ${session.answers[i].answer.slice(0, 50)}${session.answers[i].answer.length > 50 ? '...' : ''}` : 'No answer yet')
    ));

  return new ActionRowBuilder().addComponents(select);
}

function buildNextButton(session) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`jump_to_question_${session.currentIndex + 1}_${session.userId}`)
      .setLabel('▶️ Next Question')
      .setStyle(ButtonStyle.Success)
  );
}

function buildSummaryEditButton(session) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`back_to_edit_${session.userId}`)
      .setLabel('✏️ Edit Answers')
      .setStyle(ButtonStyle.Secondary)
  );
}

function buildSendButton(session) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`final_submit_${session.userId}`)
      .setLabel('🚀 Send Submission')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🚀')
  );
}

function buildQuestionModal(session, prefillAnswer = null) {
  const q = session.questions[session.currentIndex];
  const modalId = `qa_modal_${session.currentIndex}`;
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(q.text.length > 45 ? q.text.slice(0, 42) + '...' : q.text);
  const input = new TextInputBuilder()
    .setCustomId(`qa_input_${session.currentIndex}`)
    .setLabel(q.text.length > 45 ? q.text.slice(0, 42) + '...' : q.text)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(q.maxLength || 1024);
  if (prefillAnswer) {
    input.setValue(prefillAnswer);
  }
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function buildSelectMenu(session) {
  const q = session.questions[session.currentIndex];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`qa_select_${session.currentIndex}`)
      .setPlaceholder(q.placeholder || 'Select an option...')
      .setMinValues(q.minValues || 1)
      .setMaxValues(q.maxValues || 1)
      .addOptions(q.options.map(opt => ({
        label: opt.label,
        value: opt.value,
        emoji: opt.emoji || undefined,
        description: opt.description || undefined
      })))
  );
}

function buildConfirmButtons(session) {
  const q = session.questions[session.currentIndex];
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`qa_confirm_yes_${session.currentIndex}`)
      .setLabel(q.confirmLabel || '✅ I Agree')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`qa_confirm_no_${session.currentIndex}`)
      .setLabel(q.declineLabel || '❌ I Decline')
      .setStyle(ButtonStyle.Danger)
  );
}

function loadTermsContent(fileName) {
  const termsPath = path.join(__dirname, fileName || 'terms.md');
  try {
    return fs.readFileSync(termsPath, 'utf8');
  } catch {
    return '# Terms & Conditions\n\nTerms file not found.';
  }
}

function buildTermsEmbed(session) {
  const q = session.questions[session.currentIndex];
  const progress = `Step ${session.currentIndex + 1} of ${session.questions.length}`;
  const termsFile = typeof q.termsFile === 'string' ? q.termsFile : 'terms.md';
  const raw = loadTermsContent(termsFile);

  const lines = raw.split('\n');
  const sections = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === '---') {
      if (current.length > 0) {
        sections.push(current.join('\n'));
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) sections.push(current.join('\n'));

  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${session.flowTitle || 'Questions'}\n\n**${q.text}**`),
      new TextDisplayBuilder().setContent(`*${progress}*`)
    );

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(trimmed)
    );
  }

  return container;
}

function buildQuestionEmbed(session) {
  const q = session.questions[session.currentIndex];
  if (q.termsFile) return buildTermsEmbed(session);

  const progress = `Step ${session.currentIndex + 1} of ${session.questions.length}`;
  return new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${session.flowTitle || 'Questions'}\n\n**${q.text}**`),
      new TextDisplayBuilder().setContent(`*${progress}*`)
    );
}

function buildProgressEmbed(session) {
  const answered = session.answers.length > 0
    ? session.answers.map((a, i) => `~~**Q${i + 1}:** ${a.answer}~~`).join('\n')
    : 'None yet';
  const remaining = session.questions.slice(session.currentIndex).map(
    (q, i) => `**Q${session.currentIndex + i + 1}:** ${q.text}`
  ).join('\n');

  return new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Progress\n\n### ✅ Answered (${session.answers.length}/${session.questions.length})\n${answered}\n\n### ❓ Remaining\n${remaining}`),
      new TextDisplayBuilder().setContent(`*Step ${session.currentIndex + 1} of ${session.questions.length}*`)
    );
}

function getCurrentComponents(session) {
  const q = session.questions[session.currentIndex];
  if (!q) return [];
  switch (q.type) {
    case 'select': return [buildSelectMenu(session)];
    case 'confirm': return [buildConfirmButtons(session)];
    default: return [buildAnswerButton()];
  }
}

// === Core functions ===

async function showCurrentQuestion(interaction, session) {
  const q = session.questions[session.currentIndex];
  const container = buildQuestionEmbed(session);
  const components = getCurrentComponents(session);
  const opts = { components: [container, ...components], flags: MessageFlags.IsComponentsV2 };

  // Add edit button if session supports editing and we have answered questions
  if (session.canEdit && session.answers.length > 0) {
    const editBtn = buildEditButton(session);
    if (editBtn) {
      opts.components.push(editBtn);
    }
  }

  if (interaction.isCommand?.() || interaction.isMessageComponent?.()) {
    try { await interaction.update(opts); } catch (e) { await interaction.channel.send(opts).catch(() => {}); }
  } else {
    await interaction.channel.send(opts);
  }
}

async function handleModalSubmit(interaction, client) {
  const userId = interaction.user.id;
  const session = getSession(userId);
  if (!session) {
    return interaction.reply({ content: 'Session expired. Please start again.', flags: 64 });
  }

  const rawAnswer = interaction.fields.getTextInputValue(`qa_input_${session.currentIndex}`);

  const qMeta = session.questionsMeta?.[session.currentIndex];
  if (qMeta) {
    const validationFn = VALIDATORS[qMeta.type];
    if (validationFn) {
      const error = validationFn(rawAnswer);
      if (error) {
        return interaction.reply({ content: `❌ ${error}`, flags: 64 });
      }
    }
  }

  // Check if we're editing an existing answer
  const existingAnswer = session.answers[session.currentIndex];
  if (existingAnswer) {
    existingAnswer.answer = rawAnswer;
  } else {
    session.answers.push({
      question: session.questions[session.currentIndex].text,
      answer: rawAnswer
    });
  }
  session.currentIndex++;
  session.lastActivity = Date.now();

  if (session.currentIndex >= session.questions.length) {
    await showSummaryScreen(interaction, session, client);
    return;
  }

  // Show next question with Next + Edit buttons
  const cont = buildQuestionEmbed(session);
  const components = getCurrentComponents(session);
  const opts = { components: [cont, ...components], flags: MessageFlags.IsComponentsV2 };

  if (session.canEdit && session.answers.length > 0) {
    const editBtn = buildEditButton(session);
    if (editBtn) opts.components.push(editBtn);
  }

  await interaction.update(opts);
}

async function handleSelectSubmit(interaction, client) {
  const userId = interaction.user.id;
  const session = getSession(userId);
  if (!session) {
    return interaction.reply({ content: 'Session expired.', flags: 64 });
  }

  const selected = interaction.values.join(', ');
  const qIndex = parseInt(interaction.customId.replace('qa_select_', ''));

  // Check if editing
  const existingAnswer = session.answers[qIndex];
  if (existingAnswer) {
    existingAnswer.answer = selected;
  } else {
    session.answers.push({
      question: session.questions[qIndex].text,
      answer: selected
    });
  }
  session.currentIndex = qIndex + 1;
  session.lastActivity = Date.now();

  if (session.currentIndex >= session.questions.length) {
    await showSummaryScreen(interaction, session, client);
    return;
  }

  const cont = buildQuestionEmbed(session);
  const components = getCurrentComponents(session);
  const opts = { components: [cont, ...components], flags: MessageFlags.IsComponentsV2 };

  if (session.canEdit && session.answers.length > 0) {
    const editBtn = buildEditButton(session);
    if (editBtn) opts.components.push(editBtn);
  }

  await interaction.update(opts);
}

async function handleConfirmSubmit(interaction, client) {
  const userId = interaction.user.id;
  const session = getSession(userId);
  if (!session) {
    return interaction.reply({ content: 'Session expired.', flags: 64 });
  }

  const agreed = interaction.customId.startsWith('qa_confirm_yes_');
  if (!agreed) {
    return interaction.reply({ content: '❌ You must agree to the terms to continue.', flags: 64 });
  }

  const qIndex = parseInt(interaction.customId.replace('qa_confirm_yes_', ''));

  const existingAnswer = session.answers[qIndex];
  if (existingAnswer) {
    existingAnswer.answer = '✅ Agreed';
  } else {
    session.answers.push({
      question: session.questions[qIndex].text,
      answer: '✅ Agreed'
    });
  }
  session.currentIndex = qIndex + 1;
  session.lastActivity = Date.now();

  if (session.currentIndex >= session.questions.length) {
    await showSummaryScreen(interaction, session, client);
    return;
  }

  const cont = buildQuestionEmbed(session);
  const components = getCurrentComponents(session);
  const opts = { components: [cont, ...components], flags: MessageFlags.IsComponentsV2 };

  if (session.canEdit && session.answers.length > 0) {
    const editBtn = buildEditButton(session);
    if (editBtn) opts.components.push(editBtn);
  }

  await interaction.update(opts);
}

async function showSummaryScreen(interaction, session, client) {
  // Build summary embed based on session type
  let summaryEmbed;
  if (session.type === 'seller') {
    const { buildSellerSummaryEmbed } = require('./projectTicket');
    summaryEmbed = buildSellerSummaryEmbed(session, interaction.user.tag);
  } else if (session.type === 'buyer') {
    const { buildBuyerSummaryEmbed } = require('./projectTicket');
    summaryEmbed = buildBuyerSummaryEmbed(session, interaction.user.tag);
  } else {
    // Default summary
    summaryEmbed = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ✅ Completed\n\nAll questions answered! Your ${session.type === 'developer' ? 'application' : 'project request'} has been submitted.`)
      );
  }

  // Add Send + Edit buttons
  const sendRow = buildSendButton(session);
  const editRow = buildSummaryEditButton(session);

  const opts = { components: [summaryEmbed, sendRow, editRow], flags: MessageFlags.IsComponentsV2 };

  try { await interaction.update(opts); } catch (e) { await interaction.channel.send(opts).catch(() => {}); }
}

async function finalizeSession(interaction, session, client) {
  const filePath = await saveAndSend(client, {
    guildId: interaction.guildId,
    answers: session.answers,
    type: session.type,
    userTag: interaction.user.tag,
    ticketNumber: session.ticketNumber
  });

  deleteSession(interaction.user.id);

  const finalContainer = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ✅ Completed\n\nAll questions answered! Your ${session.type === 'developer' ? 'application' : 'project request'} has been submitted.`)
    );

  try { await interaction.update({ components: [finalContainer], flags: MessageFlags.IsComponentsV2 }); } catch (e) {}
  if (session.onComplete) await session.onComplete(interaction, session, filePath, client);
}

// New: editQuestion - jump to a previous question
async function editQuestion(interaction, targetIndex, client) {
  const userId = interaction.user.id;
  const session = getSession(userId);
  if (!session) {
    return interaction.reply({ content: 'Session expired. Please start again.', flags: 64 });
  }

  if (targetIndex < 0 || targetIndex >= session.questions.length) {
    return interaction.reply({ content: 'Invalid question index.', flags: 64 });
  }

  session.currentIndex = targetIndex;
  session.lastActivity = Date.now();

  // Show the question with existing answer pre-filled if available
  const existingAnswer = session.answers[targetIndex];
  const q = session.questions[targetIndex];

  if (q.type === 'modal' || q.type === 'text') {
    const modal = buildQuestionModal(session, existingAnswer ? existingAnswer.answer : null);
    await interaction.showModal(modal);
  } else if (q.type === 'select') {
    const cont = buildQuestionEmbed(session);
    const components = getCurrentComponents(session);
    const opts = { components: [cont, ...components], flags: MessageFlags.IsComponentsV2 };
    await interaction.update(opts);
  } else if (q.type === 'confirm') {
    const cont = buildQuestionEmbed(session);
    const components = getCurrentComponents(session);
    const opts = { components: [cont, ...components], flags: MessageFlags.IsComponentsV2 };
    await interaction.update(opts);
  }
}

async function handleAnswerButton(interaction) {
  const session = getSession(interaction.user.id);
  if (!session) {
    return interaction.reply({ content: 'Session expired. Please start over.', flags: 64 });
  }
  session.lastActivity = Date.now();
  const q = session.questions[session.currentIndex];
  if (q.type === 'select' || q.type === 'confirm') {
    await showCurrentQuestion(interaction, session);
  } else {
    const modal = buildQuestionModal(session);
    await interaction.showModal(modal);
  }
}

const VALIDATORS = {
  age: (val) => {
    const n = parseInt(val, 10);
    return (isNaN(n) || n < 5 || n > 120) ? 'Please enter a valid age (5–120).' : null;
  },
  timezone: (val) => {
    return /^(UTC|GMT)[+-]\d{1,2}$|^[A-Z]{3,5}$/i.test(val.trim()) ? null : 'Please enter a valid timezone (e.g. UTC+2, EST).';
  },
};

module.exports = {
  activeSessions, getSession, setSession, deleteSession,
  buildAnswerButton, buildQuestionModal, buildSelectMenu, buildConfirmButtons,
  buildQuestionEmbed, buildProgressEmbed, getCurrentComponents, showCurrentQuestion,
  handleModalSubmit, handleSelectSubmit, handleConfirmSubmit,
  handleAnswerButton, finalizeSession, restoreSessions,
  // New exports for edit flow
  buildEditButton, buildNextButton, buildSummaryEditButton, buildSendButton,
  editQuestion, showSummaryScreen, buildTermsEmbed, loadTermsContent,
};
