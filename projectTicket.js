const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { saveAndSend } = require('./savingSystem');
const { setSession, showCurrentQuestion } = require('./questionFlow');
const { CHANNELS, ROLES } = require('./config');
const { writeFileAsync, isStaffMember } = require('./utils');
const ticketConfig = require('./ticket-config.json');
const fs = require('fs');
const path = require('path');
const { loadProjects, saveProjects } = require('./db');
const { isTrusted } = require('./trustedClients');
const { addToQueue, removeReview } = require('./adminReviewTimer');
const { evaluateSellerProject } = require('./aiAgents/projectEvaluator');
const { evaluateBuyerProject } = require('./aiAgents/projectEvaluator');
const { listProduct } = require('./marketplace/marketplace');
const { buildMarketplaceEmbed, buildSellerSubmittedEmbed, buildBuyerAnalysisEmbed } = require('./marketplace/templates/marketplaceEmbed');
const REVIEWS_FILE = path.join(__dirname, 'project-ai-reviews.json');

function loadProjectReviews() {
  try {
    if (fs.existsSync(REVIEWS_FILE)) return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8'));
  } catch (e) { console.error('Failed to load project reviews:', e); }
  return [];
}

function saveProjectReview(review) {
  try {
    const reviews = loadProjectReviews();
    reviews.push({ ...review, timestamp: new Date().toISOString() });
    writeFileAsync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
  } catch (e) { console.error('Failed to save project review:', e); }
}

const PROJECTS_CHANNEL_ID = CHANNELS.PROJECTS;
const AI_AGENT_RESULTS_CHANNEL_ID = CHANNELS.AI_AGENT_RESULTS;
const ADMIN_ROLE_ID = ROLES.ADMIN;

const SELLER_ROLE_OPTIONS = [
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
  { label: 'Map Maker', value: 'role_map_maker', emoji: '🗺️' },
  { label: 'Game Developer', value: 'role_game_dev', emoji: '🎮' },
  { label: 'Other', value: 'role_other', emoji: '📦' },
];

const BUYER_CATEGORY_OPTIONS = [
  { label: 'Maps', value: 'category_maps', emoji: '🗺️' },
  { label: 'Games', value: 'category_games', emoji: '🎮' },
  { label: 'Scripts', value: 'category_scripts', emoji: '💻' },
  { label: 'Models', value: 'category_models', emoji: '🎨' },
  { label: 'UI / Textures', value: 'category_ui', emoji: '🖥️' },
  { label: 'Audio', value: 'category_audio', emoji: '🔊' },
  { label: 'Animation', value: 'category_animation', emoji: '🎬' },
  { label: 'Services', value: 'category_services', emoji: '🔧' },
  { label: 'Other', value: 'category_other', emoji: '📦' },
];

const SELLER_QUESTIONS = [
  { id: 'name', text: 'What is your Name?', type: 'modal' },
  { id: 'age', text: 'What is your Age?', type: 'modal', meta: { type: 'age' } },
  { id: 'timezone', text: 'What is your Timezone?', type: 'modal', meta: { type: 'timezone' } },
  { id: 'product_desc', text: 'What are you selling? Describe your product/service in detail.', type: 'modal', meta: { maxLength: 2000 } },
  { id: 'category', text: 'What category does your product fall under?', type: 'select', options: BUYER_CATEGORY_OPTIONS, placeholder: 'Select category...', minValues: 1, maxValues: 1 },
  { id: 'originality', text: 'Is this an original creation? Do you own full sales rights?', type: 'confirm', confirmLabel: '✅ Yes, 100% Original', declineLabel: '❌ No / Not Sure' },
  { id: 'portfolio_links', text: 'Links to your work/portfolio (optional)', type: 'modal' },
  { id: 'price', text: 'What is your price for this product?', type: 'modal' },
  { id: 'terms', text: 'Do you agree to the marketplace terms?', type: 'confirm', confirmLabel: '✅ I Agree', declineLabel: '❌ I Decline', termsFile: 'terms.md' },
];

const BUYER_QUESTIONS = [
  { id: 'project_desc', text: 'Describe your project in detail. What do you want to build? Include examples, references, everything you have in mind.', type: 'modal', meta: { maxLength: 4000 } },
];

const raw = loadProjects();
const projectStore = new Map(Object.entries(raw));

function persistProjectStore() {
  const obj = {};
  for (const [k, v] of projectStore) obj[k] = v;
  saveProjects(obj);
}

async function startSellerFlow(interaction, client) {
  const channel = interaction.channel;
  const user = interaction.user;

  // Step 1: Show developer terms
  const termsContent = loadTermsContent('terms-dev.md');

  const termsContainer = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📜 ${ticketConfig.MESSAGES.SELLER_TERMS_TITLE}\\n\\n${termsContent}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const termsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('seller_terms_agree')
      .setLabel('✅ I Agree')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('seller_terms_decline')
      .setLabel('❌ I Decline')
      .setStyle(ButtonStyle.Danger)
  );

  termsContainer.addActionRowComponents(termsRow);

  await channel.send({ components: [termsContainer], flags: MessageFlags.IsComponentsV2 });

  // Store pending seller flow data
  client._pendingSellerFlow = client._pendingSellerFlow || new Map();
  client._pendingSellerFlow.set(user.id, { channelId: channel.id, ticketNumber: channel.name.replace('🎫・', '') || 'unknown' });
}

async function handleSellerTermsAgree(interaction, client) {
  const user = interaction.user;
  const pending = client._pendingSellerFlow?.get(user.id);
  if (!pending) { await interaction.reply({ content: 'Session expired. Please start over.', flags: 64 }).catch(() => {}); return; }

  const channel = interaction.channel;

  // Show role type select
  const select = new StringSelectMenuBuilder()
    .setCustomId('seller_type_select')
    .setPlaceholder('What type of product are you selling?')
    .addOptions(SELLER_ROLE_OPTIONS.map(opt => ({
      label: opt.label,
      value: opt.value,
      emoji: opt.emoji,
      description: `Sell as a ${opt.label}`
    })));

  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🏷️ What Are You Selling?\\n\\nSelect the category that best describes your product:`)
    );

  await channel.send({ components: [container, new ActionRowBuilder().addComponents(select)], flags: MessageFlags.IsComponentsV2 });

  // Set up the question flow session
  const session = {
    type: 'seller',
    currentIndex: 0,
    answers: [],
    questions: SELLER_QUESTIONS,
    questionsMeta: SELLER_QUESTIONS.map(q => q.meta || null),
    userId: user.id,
    channelId: channel.id,
    ticketNumber: pending.ticketNumber,
    flowTitle: '📦 Seller Submission',
    canEdit: true,
    onComplete: async (interaction, session, filePath, client) => {
      await handleSellerSubmit(interaction, session, client);
    }
  };

  setSession(user.id, session);
  await showCurrentQuestion(interaction, session);
}

async function handleSellerTermsDecline(interaction, client) {
  const container = new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ❌ Submission Cancelled\\n\\nYou have declined the terms. Your submission has been cancelled.`)
    );

  await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

  const pending = client._pendingSellerFlow?.get(interaction.user.id);
  if (pending) {
    client._pendingSellerFlow.delete(interaction.user.id);
  }
}

async function handleSellerTypeSelect(interaction, client) {
  const userId = interaction.user.id;
  const session = questionFlow.getSession(userId);
  if (!session) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }

  const selected = interaction.values[0];
  session.answers.push({
    question: session.questions[0].text,
    answer: selected
  });
  session.currentIndex = 1;
  session.lastActivity = Date.now();

  const cont = questionFlow.buildQuestionEmbed(session);
  const components = questionFlow.getCurrentComponents(session);
  const opts = { components: [cont, ...components], flags: MessageFlags.IsComponentsV2 };

  if (session.canEdit && session.answers.length > 0) {
    const editBtn = questionFlow.buildEditButton(session);
    if (editBtn) opts.components.push(editBtn);
  }

  await interaction.update(opts);
}

async function handleSellerSubmit(interaction, session, client) {
  const guild = interaction.guild;
  const user = interaction.user;

  // Build summary of answers
  const answers = {};
  session.answers.forEach(a => { answers[a.question] = a.answer; });

  // AI analysis
  try {
    const aiReport = await evaluateSellerProject(session.answers);

    // Send AI report to user
    const aiEmbed = buildSellerSubmittedEmbed(session, aiReport);
    const aiRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`final_submit_${user.id}`)
        .setLabel('🚀 Send to Marketplace')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🚀'),
      new ButtonBuilder()
        .setCustomId(`back_to_edit_${user.id}`)
        .setLabel('✏️ Edit Answers')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️')
    );

    await interaction.reply({ components: [aiEmbed, aiRow], flags: MessageFlags.IsComponentsV2 | 64 });

    // Send to admin review channel
    const adminReviewChannel = guild.channels.cache.get(PROJECTS_CHANNEL_ID);
    if (adminReviewChannel) {
      const reviewContainer = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# 📋 New Seller Submission for Review\\n\\n<@${user.id}>`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      for (const [q, a] of Object.entries(answers)) {
        reviewContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${q}:** ${a}`)
        );
        reviewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      }

      const adminRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_accept_seller_${user.id}`)
          .setLabel('✅ Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`admin_decline_seller_${user.id}`)
          .setLabel('❌ Decline')
          .setStyle(ButtonStyle.Danger)
      );

      reviewContainer.addActionRowComponents(adminRow);

      const adminMsg = await adminReviewChannel.send({ components: [reviewContainer], flags: MessageFlags.IsComponentsV2 });

      // Add to 24h review queue
      const ticketNumber = session.ticketNumber;
      const requestId = `seller_${user.id}_${Date.now()}`;
      addToQueue(requestId, 'seller', user.id, user.tag, ticketNumber, guild.id);

      // Save review data
      saveProjectReview({
        type: 'seller_submission',
        userId: user.id,
        userTag: user.tag,
        ticketNumber,
        answers,
        aiReport,
        messageId: adminMsg.id,
      });

      // List product in marketplace
      const productName = answers['What is your Name?'] || 'Untitled Product';
      const productDesc = answers['What are you selling? Describe your product/service in detail.'] || '';
      const productCategory = answers['What category does your product fall under?'] || 'Other';
      const productPrice = answers['What is your price for this product?'] || 'Negotiable';

      const categoryMap = {
        'Maps': 'Maps', 'Games': 'Games', 'Scripts': 'Scripts', 'Models': 'Models',
        'UI / Textures': 'UI/Textures', 'Audio': 'Audio', 'Animation': 'Animation',
        'Services': 'Services', 'Other': 'Other'
      };
      const catValue = categoryMap[productCategory] || 'Other';

      try {
        const product = await listProduct({
          sellerId: user.id,
          sellerTag: user.tag,
          name: productName,
          description: productDesc,
          category: catValue,
          price: productPrice,
          paymentMethod: 'per_task',
          aiReport: aiReport,
        });
        console.log(`[Marketplace] Product listed: ${product.productId} by ${user.tag}`);
      } catch (err) {
        console.error('[Marketplace] Failed to list product:', err.message);
      }
    }
  } catch (aiErr) {
    console.error('AI evaluation error for seller:', aiErr);

    // Still send to admin without AI
    const fallbackContainer = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 📋 New Seller Submission\\n\\n<@${user.id}>`)
      );

    for (const [q, a] of Object.entries(answers)) {
      fallbackContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${q}:** ${a}`)
      );
    }

    const adminRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_accept_seller_${user.id}`)
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`admin_decline_seller_${user.id}`)
        .setLabel('❌ Decline')
        .setStyle(ButtonStyle.Danger)
    );

    fallbackContainer.addActionRowComponents(adminRow);

    const adminReviewChannel = guild.channels.cache.get(PROJECTS_CHANNEL_ID);
    if (adminReviewChannel) {
      await adminReviewChannel.send({ components: [fallbackContainer], flags: MessageFlags.IsComponentsV2 });
    }

    await interaction.reply({ content: '✅ Submission received! (AI analysis unavailable)', flags: 64 });
  }
}

async function startBuyerFlow(interaction, client) {
  const channel = interaction.channel;
  const user = interaction.user;

  // Step 1: Show buyer terms
  const termsContent = loadTermsContent('terms.md');

  const termsContainer = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🛡️ ${ticketConfig.MESSAGES.BUYER_TERMS_TITLE}\\n\\n${termsContent}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const termsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('buyer_terms_agree')
      .setLabel('✅ I Agree')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('buyer_terms_decline')
      .setLabel('❌ I Decline')
      .setStyle(ButtonStyle.Danger)
  );

  termsContainer.addActionRowComponents(termsRow);

  await channel.send({ components: [termsContainer], flags: MessageFlags.IsComponentsV2 });

  client._pendingBuyerFlow = client._pendingBuyerFlow || new Map();
  client._pendingBuyerFlow.set(user.id, { channelId: channel.id, ticketNumber: channel.name.replace('🎫・', '') || 'unknown' });
}

async function handleBuyerTermsAgree(interaction, client) {
  const user = interaction.user;
  const pending = client._pendingBuyerFlow?.get(user.id);
  if (!pending) { await interaction.reply({ content: 'Session expired. Please start over.', flags: 64 }).catch(() => {}); return; }

  const channel = interaction.channel;

  // Show project description modal
  const modal = new ModalBuilder()
    .setCustomId('buyer_desc_modal')
    .setTitle('Describe Your Project');

  const input = new TextInputBuilder()
    .setCustomId('buyer_desc_input')
    .setLabel('Describe your project in detail (examples, references, everything)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleBuyerDescSubmit(interaction, client) {
  const user = interaction.user;
  const pending = client._pendingBuyerFlow?.get(user.id);
  if (!pending) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }

  const description = interaction.fields.getTextInputValue('buyer_desc_input');

  // Create a minimal session for AI analysis
  const session = {
    type: 'buyer',
    currentIndex: 1,
    answers: [
      { question: 'Describe your project in detail', answer: description }
    ],
    questions: BUYEＲ_QUESTIONS,
    questionsMeta: [{}, { maxLength: 4000 }],
    userId: user.id,
    channelId: pending.channelId,
    ticketNumber: pending.ticketNumber,
    flowTitle: '📋 Project Request',
    canEdit: false,
  };

  try {
    const aiReport = await evaluateBuyerProject(session.answers);

    const analysisEmbed = buildBuyerAnalysisEmbed(aiReport);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`buyer_submit_${user.id}`)
        .setLabel('🚀 Send to Admin')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🚀'),
      new ButtonBuilder()
        .setCustomId(`buyer_edit_desc_${user.id}`)
        .setLabel('✏️ Edit Description')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️')
    );

    await interaction.reply({ components: [analysisEmbed, actionRow], flags: MessageFlags.IsComponentsV2 | 64 });
  } catch (aiErr) {
    console.error('AI buyer analysis error:', aiErr);

    const fallbackEmbed = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 📋 Project Description Received\\n\\n${description.slice(0, 1024)}`)
      );

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`buyer_submit_${user.id}`)
        .setLabel('🚀 Send to Admin')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`buyer_edit_desc_${user.id}`)
        .setLabel('✏️ Edit')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ components: [fallbackEmbed, actionRow], flags: MessageFlags.IsComponentsV2 | 64 });
  }
}

async function handleBuyerSubmit(interaction, client) {
  const user = interaction.user;
  const pending = client._pendingBuyerFlow?.get(user.id);
  if (!pending) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }

  // Get the description from the session
  const session = questionFlow.getSession(user.id);
  const description = session?.answers?.[0]?.answer || '';

  // For buyer flow, we need budget & dev count before sending
  // Show a modal to get budget
  const budgetModal = new ModalBuilder()
    .setCustomId('buyer_budget_modal')
    .setTitle('Budget & Developers');

  const budgetInput = new TextInputBuilder()
    .setCustomId('buyer_budget_input')
    .setLabel('What is your budget? (e.g. $100-$500, or "Negotiable")')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  const devInput = new TextInputBuilder()
    .setCustomId('buyer_dev_input')
    .setLabel('How many developers do you need? (or "Let admin decide")')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(200);

  budgetModal.addComponents(
    new ActionRowBuilder().addComponents(budgetInput),
    new ActionRowBuilder().addComponents(devInput)
  );

  await interaction.showModal(budgetModal);
}

async function handleBuyerBudgetSubmit(interaction, client) {
  const user = interaction.user;
  const pending = client._pendingBuyerFlow?.get(user.id);
  if (!pending) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }

  const budget = interaction.fields.getTextInputValue('buyer_budget_input');
  const devCount = interaction.fields.getTextInputValue('buyer_dev_input');

  // Payment method selection
  const paymentSelect = new StringSelectMenuBuilder()
    .setCustomId('buyer_payment_select')
    .setPlaceholder('Select payment method')
    .addOptions([
      { label: 'Per Task', value: 'per_task', emoji: '📋', description: 'Pay for each completed milestone' },
      { label: '50% Upfront', value: '50_upfront', emoji: '💰', description: 'Pay half before work starts' },
      { label: 'After Completion', value: 'after_completion', emoji: '✅', description: 'Pay fully after receiving project (Trusted clients only)' },
    ]);

  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 💳 Select Payment Method\\n\\n**Budget:** ${budget}\\n**Developers Needed:** ${devCount}`)
    );

  await interaction.reply({ components: [container, new ActionRowBuilder().addComponents(paymentSelect)], flags: MessageFlags.IsComponentsV2 | 64 });
}

async function handleBuyerPaymentSelect(interaction, client) {
  const user = interaction.user;
  const pending = client._pendingBuyerFlow?.get(user.id);
  if (!pending) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }

  const method = interaction.values[0];

  // Check trusted status for after_completion
  if (method === 'after_completion' && !isTrusted(user.id)) {
    const warnContainer = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(ticketConfig.MESSAGES.AFTER_COMPLETION_NOT_AVAILABLE || '❌ After Completion payment is only for trusted clients.')
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const retryRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('buyer_payment_retry')
        .setLabel('🔙 Choose Different Method')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ components: [warnContainer, retryRow], flags: MessageFlags.IsComponentsV2 });
    return;
  }

  // Send to admin review
  const session = questionFlow.getSession(user.id);
  const description = session?.answers?.[0]?.answer || '';

  const answers = {
    'Project Description': description,
    'Budget': interaction.fields?.getTextInputValue?.('buyer_budget_input') || budget,
    'Developers Needed': devCount,
    'Payment Method': method,
  };

  // Send to admin
  const adminReviewChannel = interaction.guild.channels.cache.get(PROJECTS_CHANNEL_ID);
  if (adminReviewChannel) {
    const reviewContainer = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 📋 New Project Request for Review\\n\\n<@${user.id}>`)
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    for (const [q, a] of Object.entries(answers)) {
      reviewContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${q}:** ${a}`)
      );
      reviewContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    }

    const adminRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin_accept_buyer_${user.id}`)
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`admin_decline_buyer_${user.id}`)
        .setLabel('❌ Decline')
        .setStyle(ButtonStyle.Danger)
    );

    reviewContainer.addActionRowComponents(adminRow);

    await adminReviewChannel.send({ components: [reviewContainer], flags: MessageFlags.IsComponentsV2 });

    // Add to 24h review queue
    const requestId = `buyer_${user.id}_${Date.now()}`;
    addToQueue(requestId, 'buyer', user.id, user.tag, pending.ticketNumber, interaction.guild.id);

    await interaction.reply({ content: '✅ Your project request has been sent to admin for review. You will receive a response within 24 hours.', flags: 64 });
  } else {
    await interaction.reply({ content: '❌ Admin review channel not found.', flags: 64 });
  }
}

function loadTermsContent(fileName) {
  const termsPath = path.join(__dirname, fileName || 'terms.md');
  try {
    return fs.readFileSync(termsPath, 'utf8');
  } catch {
    return '# Terms & Conditions\\n\\nTerms file not found.';
  }
}

async function handleProjectAccept(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const ticketNumber = interaction.customId.replace('accept_project_', '');
  const project = projectStore.get(ticketNumber);
  if (!project) return interaction.reply({ content: 'Project not found.', flags: 64 });

  project.status = 'accepted';
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ✅ Accepted Project\\n\\nThis project has been accepted and is open for developer applications.`)
    );

  const applyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`apply_project_${ticketNumber}`)
      .setLabel('Apply')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝')
  );

  container.addActionRowComponents(applyRow);

  await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });

  const projectsChannel = interaction.guild.channels.cache.get(PROJECTS_CHANNEL_ID);
  if (projectsChannel) {
    const acceptContainer = new ContainerBuilder()
      .setAccentColor(0x00FF00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ✅ Project Accepted\\n\\nProject **#${ticketNumber}** by <@${project.clientId}> has been accepted and is open for developer applications.`),
        new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
      );
    await projectsChannel.send({ components: [acceptContainer], flags: MessageFlags.IsComponentsV2 });
  }

  projectStore.set(ticketNumber, project);
  persistProjectStore();
}

async function handleProjectDecline(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const modal = new ModalBuilder()
    .setCustomId(`decline_reason_${interaction.customId.replace('decline_project_', '')}`)
    .setTitle('Decline Reason');

  const input = new TextInputBuilder()
    .setCustomId('decline_reason_input')
    .setLabel('Why is this project being declined?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleDeclineReasonSubmit(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const ticketNumber = interaction.customId.replace('decline_reason_', '');
  const reason = interaction.fields.getTextInputValue('decline_reason_input');
  const project = projectStore.get(ticketNumber);
  if (!project) return interaction.reply({ content: 'Project not found.', flags: 64 });

  project.status = 'declined';
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ❌ Declined Project\\n\\n**Reason:** ${reason}`)
    );

  try { await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 }); } catch (e) {}

  const projectsChannel = interaction.guild.channels.cache.get(PROJECTS_CHANNEL_ID);
  if (projectsChannel) {
    const declineContainer = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ❌ Project Declined\\n\\nProject **#${ticketNumber}** by <@${project.clientId}> has been declined.\\n\\n**Reason:** ${reason}`),
        new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
      );
    await projectsChannel.send({ components: [declineContainer], flags: MessageFlags.IsComponentsV2 });
  }

  projectStore.set(ticketNumber, project);
  persistProjectStore();
}

// === ADMIN REVIEW HANDLERS ===

async function handleAdminAcceptSeller(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const userId = interaction.customId.replace('admin_accept_seller_', '');
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return interaction.reply({ content: 'User not found.', flags: 64 });

  await user.send('✅ **Your seller submission has been accepted!** Your product is now listed in the marketplace.');

  try { await interaction.update({ content: '✅ **Seller submission accepted!**', components: [] }); } catch (e) {}

  // Remove from review queue
  removeReview(`seller_${userId}_*`);
}

async function handleAdminDeclineSeller(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const userId = interaction.customId.replace('admin_decline_seller_', '');
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return interaction.reply({ content: 'User not found.', flags: 64 });

  // Show decline reason modal
  const modal = new ModalBuilder()
    .setCustomId(`admin_decline_seller_reason_${userId}`)
    .setTitle('Decline Reason');

  const input = new TextInputBuilder()
    .setCustomId('admin_decline_seller_input')
    .setLabel('Reason for declining')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleAdminDeclineSellerReason(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const userId = interaction.customId.replace('admin_decline_seller_reason_', '');
  const reason = interaction.fields.getTextInputValue('admin_decline_seller_input');
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return interaction.reply({ content: 'User not found.', flags: 64 });

  await user.send(`❌ **Your seller submission has been declined.**\\n\\n**Reason:** ${reason}`);

  try { await interaction.update({ content: '❌ **Seller submission declined.**', components: [] }); } catch (e) {}

  removeReview(`seller_${userId}_*`);
}

async function handleAdminAcceptBuyer(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const userId = interaction.customId.replace('admin_accept_buyer_', '');
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return interaction.reply({ content: 'User not found.', flags: 64 });

  await user.send('✅ **Your project request has been accepted!** A staff member will contact you shortly.');

  try { await interaction.update({ content: '✅ **Project request accepted!**', components: [] }); } catch (e) {}

  removeReview(`buyer_${userId}_*`);
}

async function handleAdminDeclineBuyer(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const userId = interaction.customId.replace('admin_decline_buyer_', '');
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return interaction.reply({ content: 'User not found.', flags: 64 });

  const modal = new ModalBuilder()
    .setCustomId(`admin_decline_buyer_reason_${userId}`)
    .setTitle('Decline Reason');

  const input = new TextInputBuilder()
    .setCustomId('admin_decline_buyer_input')
    .setLabel('Reason for declining')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleAdminDeclineBuyerReason(interaction, client) {
  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 }).catch(() => {});
  }

  const userId = interaction.customId.replace('admin_decline_buyer_reason_', '');
  const reason = interaction.fields.getTextInputValue('admin_decline_buyer_input');
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return interaction.reply({ content: 'User not found.', flags: 64 });

  await user.send(`❌ **Your project request has been declined.**\\n\\n**Reason:** ${reason}`);

  try { await interaction.update({ content: '❌ **Project request declined.**', components: [] }); } catch (e) {}

  removeReview(`buyer_${userId}_*`);
}

module.exports = {
  startSellerFlow,
  handleSellerTermsAgree,
  handleSellerTermsDecline,
  handleSellerTypeSelect,
  handleSellerSubmit,
  startBuyerFlow,
  handleBuyerTermsAgree,
  handleBuyerDescSubmit,
  handleBuyerSubmit,
  handleBuyerBudgetSubmit,
  handleBuyerPaymentSelect,
  handleProjectAccept,
  handleProjectDecline,
  handleDeclineReasonSubmit,
  projectStore,
  PROJECTS_CHANNEL_ID,
  ADMIN_ROLE_ID,
  SELLER_QUESTIONS,
  SELLER_ROLE_OPTIONS,
  loadTermsContent,
  handleAdminAcceptSeller,
  handleAdminDeclineSeller,
  handleAdminDeclineSellerReason,
  handleAdminAcceptBuyer,
  handleAdminDeclineBuyer,
  handleAdminDeclineBuyerReason,
};
