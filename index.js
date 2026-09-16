require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Events,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActivityType,
  TextDisplayBuilder,
  SectionBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  AttachmentBuilder,
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const { loadGuildSettingsFromFile, loadUserStatsFromFile, statsDirty, saveUserStatsToFile, writeFileAsync, isAdmin, isStaffMember, applyTicketPermissionOverwrites, getRemainingCooldown, setCooldown, flushFileWrites } = require('./utils');
// Ticket system helpers (from the ready ticket bot)
const ticketConfig = require('./ticket-config.json');
const { logTicketAction } = require('./ticketLogger');
const { handleRatingInteraction } = require('./ratingHandler');
const { createTranscript } = require('discord-html-transcripts');
const { loadGiveaways } = require('./giveaway');
const questionFlow = require('./questionFlow');
const projectTicket = require('./projectTicket');
const applySystem = require('./applySystem');
const ticketHandler = require('./handlers/ticket');
const applyHandler = require('./handlers/apply');
const { saveProjects } = require('./db');
const idleSystem = require('./idleSystem');
const { startMonitoring } = require('./ratingSystem/monitor');
const { handleDM } = require('./ratingSystem/dmHandler');

const termsContainer = new ContainerBuilder()
  .setAccentColor(0xFFDD00)
  .addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 📜 Terms & Conditions\n\n## Payment Split\n\n### Client from the Server\n- Developer: **60%**\n- Server: **40%**\n\n### Client from the Developer\n- Developer: **90%**\n- Server: **10%**\n\n## Multiple Developers\n- If more than one developer works on a project, the developer's share is divided equally unless an admin decides otherwise.\n- The server's percentage does not change.\n\n## Minimum Part For Single Developer\n- Large projects must have a minimum part of **$100 USD** for a single developer.\n\n## General Rules\n- Complete the project professionally and on time.\n- Keep the client updated on progress.\n- Do not bypass the server's commission for server-provided clients.\n- Contact an admin if there is any dispute or issue.\n- Administration has the final decision in any conflict.\n- You will not get paid if you did not finish the project.\n- Talking with the client outside the server is not allowed.\n- The developers will get paid after the client receives the project for the protection.`)
  );

// Helper: recursively check component tree for a button with a given customId
function componentHasButton(components, customId) {
  if (!Array.isArray(components)) return false;
  for (const component of components) {
    if (component.type === 2 && component.customId === customId) return true;
    if (component.components && componentHasButton(component.components, customId)) return true;
  }
  return false;
}

// Load data at startup
loadGuildSettingsFromFile();
loadUserStatsFromFile();

// Periodically save stats
setInterval(() => {
  if (statsDirty) {
    saveUserStatsToFile();
    statsDirty = false;
  }
}, 30_000);

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.GuildScheduledEvent, Partials.Message, Partials.Reaction, Partials.ThreadMember, Partials.User],
});

loadGiveaways(client);

// Load commands dynamically
const commands = [];
const commandsPath = path.join(__dirname, 'Commands');

function loadCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      loadCommands(filePath); // Recursively load subdirectories
    } else if (file.name.endsWith('.js')) {
      try {
        const command = require(filePath);
        if (command.data && command.execute) {
          commands.push(command);
          console.log(`Loaded command: ${command.data.name}`);
    } else {
          console.warn(`Command file ${filePath} is missing data or execute property.`);
        }
      } catch (error) {
        console.error(`Error loading command ${filePath}:`, error);
      }
    }
  }
}

loadCommands(commandsPath);

// Load prefix commands
const prefixCommands = new Map();
const prefixAliases = new Map();
const prefixCommandsPath = path.join(__dirname, 'PrefixCommands');

function loadPrefixCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadPrefixCommands(filePath);
    } else if (file.name.endsWith('.js')) {
      try {
        const command = require(filePath);
        if (command.name && command.execute) {
          prefixCommands.set(command.name, command);
          if (command.aliases) {
            for (const alias of command.aliases) {
              prefixAliases.set(alias, command.name);
            }
          }
          console.log(`Loaded prefix command: ${command.name}`);
        }
      } catch (error) {
        console.error(`Error loading prefix command ${filePath}:`, error);
      }
    }
  }
}
loadPrefixCommands(prefixCommandsPath);

// Register slash commands
client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  // Initialize GuildsInvites Map
  client.GuildsInvites = new Map();
  // Cache invites
  for (const guild of c.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      invites.forEach((invite) => client.GuildsInvites.set(invite.code, invite.uses));
    } catch (e) {}
  }

  // Restore Q&A sessions from disk
  try {
    questionFlow.restoreSessions(client);
  } catch (err) {
    console.error('Failed to restore sessions:', err);
  }

  // Start idle ticket system
  try {
    idleSystem.initIdleSystem(client);
    console.log('Idle ticket system initialized.');
  } catch (err) {
    console.error('Failed to start idle system:', err);
  }

  // Validate ticket config IDs against guild
  const ticketGuild = ticketConfig.GUILD_ID ? c.guilds.cache.get(ticketConfig.GUILD_ID) : null;
  if (ticketConfig.GUILD_ID && !ticketGuild) {
    console.warn(`[CONFIG WARNING] Ticket guild ${ticketConfig.GUILD_ID} not found in bot's guilds. Ticket system may not work.`);
  }
  const categoryId = ticketConfig.TICKET_CATEGORY_ID;
  if (ticketGuild && categoryId) {
    const category = ticketGuild.channels.cache.get(categoryId);
    if (!category) {
      console.warn(`[CONFIG WARNING] Ticket category ${categoryId} not found in guild ${ticketGuild.id}. Check TICKET_CATEGORY_ID in ticket-config.json.`);
    } else {
      const ticketChannels = ticketGuild.channels.cache.filter(c =>
        c.parentId === categoryId && c.name.startsWith('🎫・')
      );
      ticketChannels.forEach(ch => idleSystem.trackTicket(ch.id));
    }
  }

  // Start Express server
  try {
    require('./server')(client);
  } catch (err) {
    console.error('Failed to start web server:', err);
  }

  // Start memory monitoring for rating system
  startMonitoring();

  // Start 24h admin review timer escalation
  try {
    const adminReviewTimer = require('./adminReviewTimer');
    adminReviewTimer.startTimerCheck(client);
  } catch (err) {
    console.error('Failed to start admin review timer:', err);
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const jsonCommands = commands.map((cmd) => cmd.data.toJSON());

  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: jsonCommands });
    console.log(`Registered ${jsonCommands.length} application commands.`);
  } catch (e) {
    console.error('Failed to register slash commands:', e);
  }
});

// Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Cooldown check (skip for admins)
    if (interaction.user && !isAdmin(interaction.user.id)) {
      let cdKey, cdDuration;
      if (interaction.isChatInputCommand()) {
        cdKey = `cmd_${interaction.commandName}`;
        cdDuration = 3000;
      } else if (interaction.isButton()) {
        cdKey = `btn_${interaction.customId}`;
        cdDuration = interaction.customId === 'ticket_starter' ? 30000 : 5000;
      } else if (interaction.isStringSelectMenu()) {
        cdKey = `menu_${interaction.customId}`;
        cdDuration = interaction.customId === 'ticket_starter' ? 30000 : 10000;
      } else if (interaction.isModalSubmit()) {
        cdKey = `modal_${interaction.customId}`;
        cdDuration = 5000;
      }
      if (cdKey) {
        const remaining = getRemainingCooldown(interaction.user.id, cdKey);
        if (remaining > 0) {
          if (interaction.isChatInputCommand()) {
            await interaction.reply({ content: `⏳ Please wait ${remaining}s before using this command again.`, flags: 64 }).catch(() => {});
            return;
          }
          return;
        }
        setCooldown(interaction.user.id, cdKey, cdDuration);
      }
    }

    // 0. Rating interactions (DM buttons like dm_rate_5_channel_closer)
    if (interaction.isButton() && interaction.customId && interaction.customId.startsWith('dm_rate_')) {
      const handled = await handleRatingInteraction(client, interaction);
      if (handled) return;
    }

    // 0.5 Verification button click
    if (interaction.isButton() && interaction.customId === 'ver') {
      if (!interaction.guild) return;
      const guildId = interaction.guild.id;
      const userId = interaction.user.id;
      const dashboardUrl = `${process.env.DOMAIN || 'http://localhost:3000'}/verify?guild=${guildId}&user=${userId}`;

      const verifyContainer = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# Verification Process\n\nTo complete the verification process, click the button below to visit the verification page.`)
        );

      const verifyButton = new ButtonBuilder()
        .setLabel('Verify')
        .setStyle(ButtonStyle.Link)
        .setURL(dashboardUrl);

      const row = new ActionRowBuilder().addComponents(verifyButton);

      await interaction.reply({ components: [verifyContainer, row], flags: MessageFlags.IsComponentsV2 | 64 }).catch(() => {});
      return;
    }

    // If it's a command (slash), dispatch to loaded commands
    if (interaction.isChatInputCommand()) {
      const command = commands.find((c) => c.data.name === interaction.commandName);
      if (!command) {
        await interaction.reply({ content: 'Unknown command.', flags: 64 }).catch(() => {});
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        try {
          await interaction.reply({ content: 'There was an error while executing this command.', flags: 64 });
        } catch (e) {
          try {
            await interaction.followUp({ content: 'There was an error while executing this command.', flags: 64 });
          } catch (e2) {
            console.error('Failed to send error response:', e2.message);
          }
        }
      }
      return;
    }

    // === NEW: Answer question button ===
    if (interaction.isButton() && interaction.customId === 'answer_question') {
      await questionFlow.handleAnswerButton(interaction);
      return;
    }

    // === NEW: Modal submission for Q&A ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith('qa_modal_')) {
      await questionFlow.handleModalSubmit(interaction, client);
      return;
    }

    // === NEW: Project type select ===
    if (interaction.isStringSelectMenu() && interaction.customId === 'project_type_select') {
      await ticketHandler.handleProjectTypeSelect(interaction, client);
      return;
    }

    // === NEW: Project accept ===
    if (interaction.isButton() && interaction.customId.startsWith('accept_project_')) {
      await ticketHandler.handleProjectAccept(interaction, client);
      return;
    }

    // === NEW: Project decline ===
    if (interaction.isButton() && interaction.customId.startsWith('decline_project_')) {
      await ticketHandler.handleProjectDecline(interaction, client);
      return;
    }

    // === NEW: Decline reason modal ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith('decline_reason_')) {
      await ticketHandler.handleDeclineReasonSubmit(interaction, client);
      return;
    }

    // === NEW: Developer apply button ===
    if (interaction.isButton() && interaction.customId === 'start_developer_apply') {
      await applyHandler.handleApplyButton(interaction);
      return;
    }

    // === NEW: View terms button ===
    if (interaction.isButton() && interaction.customId === 'view_terms') {
      await applyHandler.showTerms(interaction);
      return;
    }

    // === NEW: Agree terms button ===
    if (interaction.isButton() && interaction.customId === 'agree_terms') {
      await applyHandler.handleTermsAgree(interaction);
      return;
    }

    // === NEW: Select menu for Q&A ===
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('qa_select_')) {
      await questionFlow.handleSelectSubmit(interaction, client);
      return;
    }

    // === NEW: Confirm buttons for Q&A ===
    if (interaction.isButton() && interaction.customId.startsWith('qa_confirm_yes_')) {
      await questionFlow.handleConfirmSubmit(interaction, client);
      return;
    }
    if (interaction.isButton() && interaction.customId.startsWith('qa_confirm_no_')) {
      await questionFlow.handleConfirmSubmit(interaction, client);
      return;
    }

    // === NEW: Staff apply button ===
    if (interaction.isButton() && interaction.customId === 'start_staff_apply') {
      await applyHandler.handleStaffApplyButton(interaction);
      return;
    }

    // === NEW: Dev app approve/decline buttons ===
    if (interaction.isButton() && interaction.customId.startsWith('dev_app_approve_')) {
      await applyHandler.handleDevAppApprove(interaction);
      return;
    }
    if (interaction.isButton() && interaction.customId.startsWith('dev_app_decline_')) {
      await applyHandler.handleDevAppDecline(interaction);
      return;
    }

    // === NEW: Developer apply on project ===
    if (interaction.isButton() && interaction.customId.startsWith('apply_project_')) {
      const ticketNumber = interaction.customId.replace('apply_project_', '');
      await applyHandler.showPortfolioModal(interaction, ticketNumber);
      return;
    }

    // === NEW: Developer portfolio modal submit ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith('dev_portfolio_')) {
      const ticketNumber = interaction.customId.replace('dev_portfolio_', '');
      await applyHandler.handlePortfolioSubmit(interaction, ticketNumber, client);
      return;
    }

    // === NEW: Client accept developer ===
    if (interaction.isButton() && interaction.customId.startsWith('dev_accept_')) {
      const parts = interaction.customId.replace('dev_accept_', '').split('_');
      const devId = parts[0];
      const ticketNumber = parts.slice(1).join('_');
      await applyHandler.handleClientAcceptDev(interaction, devId, ticketNumber, client);
      return;
    }

    // === NEW: Client decline developer ===
    if (interaction.isButton() && interaction.customId.startsWith('dev_decline_')) {
      const parts = interaction.customId.replace('dev_decline_', '').split('_');
      const devId = parts[0];
      const ticketNumber = parts.slice(1).join('_');
      await applyHandler.handleClientDeclineDev(interaction, devId, ticketNumber, client);
      return;
    }

    // === Terms agree/decline buttons for marketplace flows ===
    if (interaction.isButton() && interaction.customId === 'seller_terms_agree') {
      await projectTicket.handleSellerTermsAgree(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'seller_terms_decline') {
      await projectTicket.handleSellerTermsDecline(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'buyer_terms_agree') {
      await projectTicket.handleBuyerTermsAgree(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'buyer_terms_decline') {
      await interaction.update({ content: '❌ Request cancelled.', components: [] });
      const pending = client._pendingBuyerFlow?.get(interaction.user.id);
      if (pending) client._pendingBuyerFlow.delete(interaction.user.id);
      return;
    }

    // === Buyer description modal submit ===
    if (interaction.isModalSubmit() && interaction.customId === 'buyer_desc_modal') {
      await projectTicket.handleBuyerDescSubmit(interaction, client);
      return;
    }

    // === Buyer budget modal submit ===
    if (interaction.isModalSubmit() && interaction.customId === 'buyer_budget_modal') {
      await projectTicket.handleBuyerBudgetSubmit(interaction, client);
      return;
    }

    // === Marketplace: Edit question jump ===
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('edit_question_')) {
      const userId = interaction.user.id;
      const session = questionFlow.getSession(userId);
      if (!session) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }
      const targetIndex = parseInt(interaction.values[0]);
      await questionFlow.editQuestion(interaction, targetIndex, client);
      return;
    }

    // === Marketplace: Final submit ===
    if (interaction.isButton() && interaction.customId.startsWith('final_submit_')) {
      const userId = interaction.user.id;
      const session = questionFlow.getSession(userId);
      if (!session) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }
      await questionFlow.finalizeSession(interaction, session, client);
      return;
    }

    // === Marketplace: Back to edit from summary ===
    if (interaction.isButton() && interaction.customId.startsWith('back_to_edit_')) {
      const userId = interaction.user.id;
      const session = questionFlow.getSession(userId);
      if (!session) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }
      await questionFlow.showCurrentQuestion(interaction, session);
      return;
    }

    // === Marketplace: Seller type select ===
    if (interaction.isStringSelectMenu() && interaction.customId === 'seller_type_select') {
      const userId = interaction.user.id;
      const session = questionFlow.getSession(userId);
      if (!session) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }
      const value = interaction.values[0];
      session.answers.push({
        question: session.questions[session.currentIndex].text,
        answer: value
      });
      session.currentIndex++;
      session.lastActivity = Date.now();

      if (session.currentIndex >= session.questions.length) {
        await questionFlow.showSummaryScreen(interaction, session, client);
        return;
      }

      const cont = questionFlow.buildQuestionEmbed(session);
      const components = questionFlow.getCurrentComponents(session);
      const opts = { components: [cont, ...components], flags: MessageFlags.IsComponentsV2 };

      if (session.canEdit && session.answers.length > 0) {
        const editBtn = questionFlow.buildEditButton(session);
        if (editBtn) opts.components.push(editBtn);
      }

      await interaction.update(opts);
      return;
    }

    // === Marketplace: Buyer submit buttons ===
    if (interaction.isButton() && interaction.customId.startsWith('buyer_submit_')) {
      const userId = interaction.customId.replace('buyer_submit_', '');
      const pending = client._pendingBuyerFlow?.get(userId);
      if (!pending) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }
      await projectTicket.handleBuyerSubmit(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('buyer_edit_desc_')) {
      const userId = interaction.customId.replace('buyer_edit_desc_', '');
      const pending = client._pendingBuyerFlow?.get(userId);
      if (!pending) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }
      const channel = client.channels.cache.get(pending.channelId);
      if (channel) {
        const modal = new ModalBuilder()
          .setCustomId('buyer_desc_modal')
          .setTitle('Edit Project Description');
        const input = new TextInputBuilder()
          .setCustomId('buyer_desc_input')
          .setLabel('Describe your project (edit your description)')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === 'buyer_payment_retry') {
      const userId = interaction.user.id;
      const pending = client._pendingBuyerFlow?.get(userId);
      if (!pending) { await interaction.reply({ content: 'Session expired.', flags: 64 }).catch(() => {}); return; }
      await projectTicket.handleBuyerPaymentSelect(interaction, client);
      return;
    }

    // === Marketplace: Admin review buttons ===
    if (interaction.isButton() && interaction.customId.startsWith('admin_accept_seller_')) {
      await projectTicket.handleAdminAcceptSeller(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('admin_decline_seller_')) {
      await projectTicket.handleAdminDeclineSeller(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('admin_accept_buyer_')) {
      await projectTicket.handleAdminAcceptBuyer(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('admin_decline_buyer_')) {
      await projectTicket.handleAdminDeclineBuyer(interaction, client);
      return;
    }

    // === Marketplace: Admin decline reason modals ===
    if (interaction.isModalSubmit() && interaction.customId.startsWith('admin_decline_seller_reason_')) {
      await projectTicket.handleAdminDeclineSellerReason(interaction, client);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('admin_decline_buyer_reason_')) {
      await projectTicket.handleAdminDeclineBuyerReason(interaction, client);
      return;
    }

    // Payment method select menu
    if (interaction.isStringSelectMenu() && interaction.customId === 'payment_method_select') {
      await interaction.deferReply({ flags: 64 }).catch(() => {});

      const selected = interaction.values[0];
      let paymentContent;
      let paymentTitle;

      if (selected === 'method_01') {
        paymentTitle = 'Method 01: Upfront Payment';
        paymentContent = `This payment method is recommended for custom projects.

### Payment Flow

1. Client pays **50%** of the total project budget.
2. The developer starts working on the project.
3. Once development is finished, the completed project is shown to the client.
4. The client pays the remaining **50%**. 
5. After the payment is confirmed, the full project is delivered.
6. The developer receives their share of the payment according to the server rules.

Total Payments:
• First Payment: 50%
• Final Payment: 50%`;
      } else if (selected === 'method_02') {
        paymentTitle = 'Method 02: Per Task';
        paymentContent = `This payment method is recommended for larger custom projects.

### Payment Flow

The total project budget is divided into **3 equal parts**.

#### Part 1
1. Client pays the first part.
2. The developer completes the first milestone.
3. The completed part is shown to the client.

#### Part 2
4. Client pays the second part.
5. The developer completes the next milestone.
6. The completed part is shown to the client.

#### Final Part
7. Client pays the final part.
8. The developer completes the remaining work.
9. The full project is delivered after payment confirmation.

Finally, the developer receives their share of the payment according to the server rules.

Total Payments:
• Part 1
• Part 2
• Final Part`;
      } else if (selected === 'method_03') {
        paymentTitle = 'Method 03: After Completion';
        paymentContent = `This payment method is recommended for trusted **Clients** only.

### Payment Flow

The total budget of the project will be **Paid** after receiving the project (Roblox map — a Development service — etc.)

### How to be a **Trusted** Client

To be a **Trusted** client you need to follow at least a single **Condition** of these:

1. Spending over **$120** in any services.
2. Be a **Youtuber** or a **Streamer** or a **Partner** with the server.
3. You get us a least 2 **Client** from you side .`;
      }

      const paymentContainer = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${paymentTitle}\n\n${paymentContent}`)
        );

      await interaction.editReply({ components: [paymentContainer], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    // 1. Ticket select menu (opens ticket)
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_starter') {
      let deferred = false;
      try {
        await interaction.deferReply({ flags: 64 });
        deferred = true;
      } catch (e) {}

      const ticketType = interaction.values[0];
      const user = interaction.user;
      const guild = interaction.guild;
  const staffRoleID = ticketConfig.STAFF_ROLE_ID;
  const managerRoleID = ticketConfig.MANAGER_ROLE_ID;
      const ticketConfigType = ticketConfig.TICKET_TYPES.find(t => t.value === ticketType) || {};

      // Check for existing open ticket for this user
      const trackedTicket = idleSystem.hasOpenTicket(user.id);
      let existingChannel = trackedTicket ? guild.channels.cache.get(trackedTicket) : null;
      if (!existingChannel) {
        existingChannel = guild.channels.cache.find(c => {
          if (!c.name.includes(`🎫・`) || c.parentId !== ticketConfig.TICKET_CATEGORY_ID) return false;
          const userOverwrite = c.permissionOverwrites.cache.get(user.id);
          return userOverwrite && userOverwrite.allow && userOverwrite.allow.has(PermissionFlagsBits.ViewChannel);
        });
      }

      if (existingChannel) {
        if (deferred) await interaction.editReply({ content: ticketConfig.MESSAGES.ERROR_ALREADY_OPEN.replace('{channelId}', existingChannel.id), flags: 64 }).catch(() => {});
        return;
      }

      // Per-guild ticket cap
      const maxTicketsPerGuild = ticketConfig.MAX_TICKETS_PER_GUILD || 20;
      const openTicketsInGuild = guild.channels.cache.filter(c =>
        c.name?.startsWith('🎫・') && c.parentId === ticketConfig.TICKET_CATEGORY_ID
      ).size;
      if (openTicketsInGuild >= maxTicketsPerGuild) {
        if (deferred) await interaction.editReply({ content: `❌ Ticket limit reached (${maxTicketsPerGuild} per guild). Please close an existing ticket first.`, flags: 64 }).catch(() => {});
        return;
      }

      // Increment counter in ticket config file (persist)
      ticketConfig.TICKET_COUNTER = (ticketConfig.TICKET_COUNTER || 0) + 1;
      const newTicketNumber = ticketConfig.TICKET_COUNTER;
      try {
        writeFileAsync(path.join(__dirname, 'ticket-config.json'), JSON.stringify(ticketConfig, null, 4));
      } catch (err) {
        console.error('Failed to write ticket counter to config:', err);
      }

      const channelName = `🎫・${newTicketNumber}`;

      const category = guild.channels.cache.get(ticketConfig.TICKET_CATEGORY_ID);
      if (!category || category.type !== ChannelType.GuildCategory) {
        console.error(`[CONFIG ERROR] Ticket category ${ticketConfig.TICKET_CATEGORY_ID} not found or is not a category in guild ${guild.id}.`);
        if (deferred) await interaction.editReply({ content: 'Ticket system misconfigured: ticket category not found. Please contact an administrator.', flags: 64 }).catch(() => {});
        return;
      }

      try {
        const permissionOverwrites = [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ];

        const staffRole = guild.roles.cache.get(staffRoleID);
        if (staffRole) {
          permissionOverwrites.push({ id: staffRoleID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        } else {
          console.warn(`[CONFIG WARNING] Staff role ID ${staffRoleID} not found in guild ${guild.id}.`);
        }
        const managerRole = managerRoleID ? guild.roles.cache.get(managerRoleID) : null;
        if (managerRole) {
          permissionOverwrites.push({ id: managerRoleID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        } else if (managerRoleID && managerRoleID !== staffRoleID) {
          console.warn(`[CONFIG WARNING] Manager role ID ${managerRoleID} not found in guild ${guild.id}.`);
        }
        if (!staffRole && !managerRole) {
          console.warn(`[CONFIG WARNING] Staff/Manager Role IDs not found: ${staffRoleID}, ${managerRoleID}. Ticket opened without explicit staff permissions.`);
        }

        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: ticketConfig.TICKET_CATEGORY_ID,
          permissionOverwrites,
        });

        const ticketColor = parseInt((ticketConfigType.color || '#99AAB5').replace('#', ''), 16);

        const welcomeComponents = [
          new ContainerBuilder()
            .setAccentColor(ticketColor)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`<:Rex_GoldenTicket:1529173698505080874> New Ticket`)
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `╭─ \`Ticket Information\`\n` +
                `│\n` +
                `├ \`Ticket:\` "#${newTicketNumber}"\n` +
                `├ \`Type:\` "${ticketConfigType.label}"\n` +
                `├ \`Created By:\` <@${user.id}>\n` +
                `╰ \`Staff Role:\` <@&${staffRoleID}>`
              )
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## Welcome\n` +
                `╭─ Thank you for choosing **LUNEXIS**.\n` +
                `├ A staff member will assist you shortly.\n` +
                `╰ Please remain patient while waiting.`
              )
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addSectionComponents(
              new SectionBuilder()
                .setButtonAccessory(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                  `## Ticket Controls\n` +
                  `╭─ \`Close\`\n` +
                  `╰ Press the **🔒 Close** button to close this ticket.`
                ))
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addSectionComponents(
              new SectionBuilder()
                .setButtonAccessory(new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                  `## Staff Notice\n` +
                  `╭─ \`Staff Only\`\n` +
                  `╰ Press **Claim** to take ownership of this ticket.`
                ))
            )
        ];

        await ticketChannel.send({ components: welcomeComponents, flags: MessageFlags.IsComponentsV2 });

        // Auto-trigger flows based on ticket type
        if (ticketType === 'support') {
          // Support tickets - no special flow needed currently
        } else if (ticketType === 'buy') {
          await projectTicket.startProjectFlow({ channel: ticketChannel, guild: guild }, client);
        } else if (ticketType === 'apply') {
          await applySystem.startApplyFlow({ channel: ticketChannel, guild: guild });
        } else if (ticketType === 'sell') {
          await projectTicket.startSellerFlow({ channel: ticketChannel, guild: guild }, client);
        } else if (ticketType === 'buy_req') {
          await projectTicket.startBuyerFlow({ channel: ticketChannel, guild: guild }, client);
        }

        idleSystem.trackTicket(ticketChannel.id, user.id);

        await logTicketAction(client, 'OPEN', user, ticketChannel, `Type: ${ticketType.toUpperCase()}`, ticketConfigType.color || '#3498DB');

        const ticketOpenedContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ✅ Ticket Opened\n\n${(ticketConfig.MESSAGES.TICKET_OPENED_SUCCESS || '').replace('{ticketNumber}', newTicketNumber).replace('{channelId}', ticketChannel.id)}`)
        );
        if (deferred) await interaction.editReply({ components: [ticketOpenedContainer], flags: MessageFlags.IsComponentsV2 | 64 });

      } catch (error) {
        console.error('Failed to create ticket channel:', error);
        if (deferred) await interaction.editReply({ content: ticketConfig.MESSAGES.ERROR_CONFIG_CHECK || 'An error occurred.', flags: 64 });
      }
      return;
    }

    // 2. Close ticket -> ask confirm
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      await ticketHandler.handleCloseTicket(interaction, client, ticketConfig, idleSystem, logTicketAction);
      return;
    }

    // 3. Confirm Close -> lock channel and initiate rating
    if (interaction.isButton() && interaction.customId === 'confirm_close') {
      await ticketHandler.handleConfirmClose(interaction, client, ticketConfig, idleSystem, logTicketAction, createTranscript, applyTicketPermissionOverwrites, componentHasButton);
      return;
    }

    // 4. Cancel close
    if (interaction.isButton() && interaction.customId === 'cancel_close') {
      try { await interaction.deferUpdate(); } catch (e) {}
      await interaction.message.delete().catch(() => {});
      return;
    }

    // 5. Delete ticket
    if (interaction.isButton() && interaction.customId === 'delete_ticket') {
      await ticketHandler.handleDeleteTicket(interaction, client, ticketConfig, isStaffMember, logTicketAction);
      return;
    }

    // 6. Reopen ticket
    if (interaction.isButton() && interaction.customId === 'reopen_ticket') {
      await ticketHandler.handleReopenTicket(interaction, client, ticketConfig, idleSystem, logTicketAction, applyTicketPermissionOverwrites, isStaffMember);
      return;
    }

    // 7. Transcript
    if (interaction.isButton() && interaction.customId === 'transcript_btn') {
      await ticketHandler.handleTranscript(interaction, client, ticketConfig, isStaffMember, logTicketAction, createTranscript, componentHasButton);
      return;
    }

    // 8. Claim ticket
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
      await ticketHandler.handleClaimTicket(interaction, client, ticketConfig, idleSystem, logTicketAction, componentHasButton);
      return;
    }

    // 9. Unclaim ticket
    if (interaction.isButton() && interaction.customId === 'unclaim_ticket') {
      await ticketHandler.handleUnclaimTicket(interaction, client, ticketConfig, idleSystem, logTicketAction, componentHasButton);
      return;
    }

    // 10. Giveaway enter button
    if (interaction.isButton() && interaction.customId === 'giveaway_enter') {
      const { getGiveaway, addParticipant } = require('./giveaway');
      const giveaway = getGiveaway(interaction.message.id);
      if (!giveaway) {
        await interaction.reply({ content: 'This giveaway is no longer active.', flags: 64 }).catch(() => {});
        return;
      }
      if (giveaway.paused) {
        await interaction.reply({ content: 'This giveaway is currently paused.', flags: 64 }).catch(() => {});
        return;
      }
      if (giveaway.participants.includes(interaction.user.id)) {
        await interaction.reply({ content: 'You have already entered this giveaway!', flags: 64 }).catch(() => {});
        return;
      }
      addParticipant(interaction.message.id, interaction.user.id);
      await interaction.reply({ content: '✅ You have entered the giveaway!', flags: 64 });
      return;
    }

  } catch (err) {
    console.error('Interaction error:', err);
  }
});

// Initialize protection events
require('./protectionEvents')(client);

// Load logging events dynamically
const eventsPath = path.join(__dirname, 'Events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath);
  for (const file of eventFiles) {
    if (file.endsWith('.js')) {
      const eventName = file.split('.')[0];
      if (eventName === 'ready' || eventName === 'interactionCreate') continue;
      try {
        const eventHandler = require(path.join(eventsPath, file));
        client.on(eventName, (...args) => eventHandler(client, ...args));
        console.log(`Loaded logging event: ${eventName}`);
      } catch (error) {
        console.error(`Error loading logging event ${file}:`, error);
      }
    }
  }
}

// Reset idle timer on new messages in ticket channels + handle prefix commands + DMs
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // Handle Direct Messages (AI chat)
  if (!message.guild) {
    await handleDM(message);
    return;
  }

  // Reset idle timer for ticket channels
  if (message.channel.name?.startsWith('🎫・')) {
    idleSystem.resetIdleTimer(message.channel.id);
  }

  // Handle prefix commands
  const { getGuildSettings, isAdmin, getRemainingCooldown, setCooldown } = require('./utils');
  const settings = getGuildSettings(message.guild.id);
  const prefix = settings.prefix || '!';

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = prefixCommands.get(commandName) || prefixCommands.get(prefixAliases.get(commandName));
  if (!command) return;

  // Owner/admin bypass for cooldowns
  if (!isAdmin(message.author.id)) {
    const cdKey = `prefix_${command.name}`;
    const remaining = getRemainingCooldown(message.author.id, cdKey);
    if (remaining > 0) {
      return message.reply(`⏳ Please wait ${remaining}s before using this command again.`);
    }
    setCooldown(message.author.id, cdKey, (command.cooldown || 3) * 1000);
  }

  // Permission check
  if (command.permissions && command.permissions.length > 0) {
    if (!message.member.permissions.has(command.permissions)) {
      return message.reply('❌ You do not have permission to use this command.');
    }
  }

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`Error executing prefix command ${command.name}:`, error);
    await message.reply('There was an error executing that command.').catch(() => {});
  }
});

// Untrack deleted ticket channels
client.on(Events.ChannelDelete, (channel) => {
  if (channel.name?.startsWith('🎫・')) {
    idleSystem.untrackTicket(channel.id);
  }
});

client.login(TOKEN);

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  saveProjects(Object.fromEntries(projectTicket.projectStore));
  saveUserStatsToFile();
  questionFlow.activeSessions.clear();
  await flushFileWrites();
  client.destroy();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  saveProjects(Object.fromEntries(projectTicket.projectStore));
  saveUserStatsToFile();
  await flushFileWrites();
  client.destroy();
  process.exit(0);
});