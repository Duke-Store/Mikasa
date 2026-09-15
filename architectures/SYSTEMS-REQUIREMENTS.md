# SYSTEMS & DATABASE REQUIREMENTS

> **Project:** Lunexis Discord Bot  
> **Guild ID:** `830104403440566272`  
> **Client Version:** discord.js v14 (^14.25.1)  
> **Storage Engines:** `pro.db` (JSON key-value), flat `.json` files, `.md` files on disk  
> **Last Updated:** 2026-07-18

---

## Table of Contents

1. [Saving System](#1-saving-system)
2. [Questions Answering System](#2-questions-answering-system)
3. [Projects Tickets - Payment](#3-projects-tickets---payment)
4. [Payments on Development Services](#4-payments-on-development-services)
5. [Applying System](#5-applying-system)
6. [Shared Utilities & Cross-Cutting](#6-shared-utilities--cross-cutting)
7. [File Structure](#7-file-structure)
8. [Channel & Role ID Reference](#8-channel--role-id-reference)

---

## 1. Saving System

### 1.1 Purpose
Persist collected user answers (developer applications, client project details) to Markdown files on disk, then forward the file to a designated Discord channel for staff review.

### 1.2 File Format Specification

Each `.md` file follows this exact template:

```markdown
**Question 01:** Answer 01
**Question 02:** Answer 02
**Question 03:** Answer 03
**Question etc...:** Answer etc...
**Developer:** @username
**Project Owner:** @username
```

- **Key-Value pairs:** Each line begins with the bolded question number/name, a colon, a space, then the user's answer.
- **Header lines:** `**Developer:** @username` or `**Project Owner:** @username` — only the relevant one is included.
- **No extra separators** — questions are listed in sequential order.
- **Encoding:** UTF-8.
- **File extension:** `.md`

### 1.3 File Naming Convention

```
<ticketNumberOrTimestamp>-<userTag>-<type>.md
```

Examples:
```
3-@johndoe-developer-application.md
4-@janedoe-client-project.md
```

### 1.4 Channel Routing

| Type | Discord Channel ID | Purpose |
|------|-------------------|---------|
| Developer Applications | `1526401023588040817` | All developer/staff applications |
| Client Projects | `1526402048361496699` | All client project requests |

### 1.5 Implementation Plan

#### Module: `savingSystem.js`

```js
const fs = require('fs');
const path = require('path');

const SAVE_DIR = path.join(__dirname, 'saved-applications');

// Ensure directory exists
function ensureDir() {
  if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });
}

/**
 * Build markdown content from answers array.
 * @param {Array<{question: string, answer: string}>} answers
 * @param {string} developerTag - "@user" who applied (optional)
 * @param {string} clientTag - "@user" who owns the project (optional)
 * @returns {string} markdown string
 */
function buildMarkdown(answers, developerTag = '', clientTag = '') {
  const lines = answers.map(
    (q, i) => `**Question ${String(i + 1).padStart(2, '0')}:** ${q.answer}`
  );
  if (developerTag) lines.push(`**Developer:** ${developerTag}`);
  if (clientTag) lines.push(`**Project Owner:** ${clientTag}`);
  return lines.join('\n');
}

/**
 * Save markdown to file and send to the appropriate channel.
 * @param {Client} client - Discord.js client
 * @param {Object} options
 * @param {string} options.guildId
 * @param {Array} options.answers
 * @param {'developer'|'client'} options.type
 * @param {string} options.userTag
 * @param {string} options.ticketNumber
 * @returns {Promise<string>} file path saved
 */
async function saveAndSend(client, { guildId, answers, type, userTag, ticketNumber }) {
  ensureDir();

  const safeTag = userTag.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${ticketNumber || Date.now()}-${safeTag}-${type}.md`;
  const filePath = path.join(SAVE_DIR, fileName);

  const developerTag = type === 'developer' ? userTag : '';
  const clientTag = type === 'client' ? userTag : '';
  const content = buildMarkdown(answers, developerTag, clientTag);

  fs.writeFileSync(filePath, content, 'utf8');

  // Route to channel
  const channelId = type === 'developer'
    ? '1526401023588040817'   // Developer apps
    : '1526402048361496699';  // Client projects

  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error(`Guild ${guildId} not found`);

  const channel = guild.channels.cache.get(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found in guild`);

  await channel.send({
    content: `📄 **New ${type} submission from ${userTag}**`,
    files: [filePath]
  });

  return filePath;
}

module.exports = { saveAndSend, buildMarkdown, SAVE_DIR };
```

### 1.6 Dependencies

- `fs` (built-in)
- `path` (built-in)
- The target channels must exist; bot must have `SendMessages` + `AttachFiles` permission.

---

## 2. Questions Answering System

### 2.1 Purpose
Ask the user a series of questions one at a time using Discord modals. After each answer, save it in memory and present the next question. When all questions are answered, hand off the collected answers to the **Saving System**.

### 2.2 Modal/Form Implementation

Each question is presented as a **modal** with a single `TextInput` field. The bot sends a trigger message with a button; clicking the button opens the modal.

#### Modal Pattern

```js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function buildQuestionModal(questionText, questionId, currentValue = '') {
  const modal = new ModalBuilder()
    .setCustomId(`qa_modal_${questionId}`)
    .setTitle(questionText.length > 45 ? questionText.slice(0, 42) + '...' : questionText);

  const input = new TextInputBuilder()
    .setCustomId(`qa_input_${questionId}`)
    .setLabel(questionText)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1024);

  if (currentValue) input.setValue(currentValue);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}
```

### 2.3 Sequential Question Flow

The system uses an **interaction state machine** tracked in a `Map` keyed by user ID:

```
State: {
  type: 'developer_apply' | 'client_project' | 'staff_apply',
  currentIndex: number,
  answers: Array<{ question: string, answer: string }>,
  questions: Array<string>,
  ticketNumber: string
}
```

**Flow:**

1. User triggers a flow (button click or select menu).
2. Bot stores initial state in `activeSessions` Map and shows a button.
3. User clicks button → modal for `questions[currentIndex]` appears.
4. User submits modal → answer is validated → saved to `state.answers` → `currentIndex++`.
5. If more questions: bot updates the embed/message and shows button for next question.
6. If done: bot calls `savingSystem.saveAndSend()`.

### 2.4 Validation / Filtering

| Question Type | Validation Rule | Error Message |
|---------------|----------------|---------------|
| Age | Must be a number between 5 and 120 | "Please enter a valid age (5–120)." |
| Timezone | Must match a known timezone (e.g., UTC+2, EST) | "Please enter a valid timezone (e.g. UTC+2, EST, GMT+3)." |
| All text | Max 1024 characters | "Your answer is too long (max 1024 characters)." |
| Required | Non-empty | "This question requires an answer." |
| Role selection | Must select at least one role | "Please select at least one role." |

Validation function:

```js
function validateAnswer(questionIndex, rawAnswer, questionsMeta) {
  const meta = questionsMeta[questionIndex];
  if (!meta) return null; // no validation

  if (meta.type === 'age') {
    const num = parseInt(rawAnswer, 10);
    if (isNaN(num) || num < 5 || num > 120) return 'Please enter a valid age (5–120).';
  }
  if (meta.type === 'timezone') {
    const valid = /^(UTC|GMT)[+-]\d{1,2}$|^[A-Z]{3,5}$/i.test(rawAnswer.trim());
    if (!valid) return 'Please enter a valid timezone (e.g. UTC+2, EST).';
  }
  return null; // valid
}
```

### 2.5 Interaction Flow Diagram

```
User clicks "Apply" button
  → Bot creates state in activeSessions Map
  → Bot edits message: "Question 1: <question>" + [Answer Button]
  → User clicks "Answer" button
    → Bot shows modal with the question
    → User fills and submits
      → Bot validates answer
      → If invalid: show error ephemeral, let user retry
      → If valid: save answer, increment index
        → If more questions: update embed to show next question
        → If done: call Saving System, clean up session
```

### 2.6 Complete Module Skeleton: `questionFlow.js`

```js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { saveAndSend } = require('./savingSystem');

// Active sessions: Map<userId, Session>
const activeSessions = new Map();

// Question metadata for validation
const QUESTION_META = {
  age: { type: 'age', label: 'Your Age' },
  timezone: { type: 'timezone', label: 'Your Timezone' },
};

function getSession(userId) { return activeSessions.get(userId); }
function setSession(userId, session) { activeSessions.set(userId, session); }
function deleteSession(userId) { activeSessions.delete(userId); }

function buildAnswerButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('answer_question')
      .setLabel('Answer')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✏️')
  );
}

function buildQuestionModal(session) {
  const q = session.questions[session.currentIndex];
  const modalId = `qa_modal_${session.currentIndex}`;
  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle(q.text.length > 45 ? q.text.slice(0, 42) + '...' : q.text);

  const input = new TextInputBuilder()
    .setCustomId(`qa_input_${session.currentIndex}`)
    .setLabel(q.text)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1024);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function buildProgressEmbed(session) {
  const answered = session.answers.map(
    (a, i) => `~~**Q${i + 1}:** ${a.answer}~~`
  ).join('\n');
  const remaining = session.questions.slice(session.currentIndex).map(
    (q) => `**Q${session.questions.indexOf(q) + 1}:** ${q.text}`
  ).join('\n');

  return new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Application Progress')
    .setDescription(
      `### ✅ Answered (${session.answers.length}/${session.questions.length})\n${answered || 'None yet'}\n\n### ❓ Remaining\n${remaining}`
    )
    .setFooter({ text: `Click "Answer" to continue | Step ${session.currentIndex + 1} of ${session.questions.length}` });
}

async function handleModalSubmit(interaction, client) {
  const userId = interaction.user.id;
  const session = getSession(userId);
  if (!session) {
    return interaction.reply({ content: 'Session expired. Please start again.', ephemeral: true });
  }

  const rawAnswer = interaction.fields.getTextInputValue(`qa_input_${session.currentIndex}`);

  // Validate
  const qMeta = session.questionsMeta?.[session.currentIndex];
  if (qMeta) {
    const validationFn = VALIDATORS[qMeta.type];
    if (validationFn) {
      const error = validationFn(rawAnswer);
      if (error) {
        return interaction.reply({ content: `❌ ${error}`, ephemeral: true });
      }
    }
  }

  // Save
  session.answers.push({
    question: session.questions[session.currentIndex].text,
    answer: rawAnswer
  });
  session.currentIndex++;

  // Check if done
  if (session.currentIndex >= session.questions.length) {
    // Finalize
    const filePath = await saveAndSend(client, {
      guildId: interaction.guildId,
      answers: session.answers,
      type: session.type,
      userTag: interaction.user.tag,
      ticketNumber: session.ticketNumber
    });

    deleteSession(userId);

    await interaction.update({
      embeds: [buildProgressEmbed(session)],
      components: [],
      content: `✅ **All questions answered!** Your ${session.type === 'developer' ? 'application' : 'project request'} has been submitted.`
    });

    if (session.onComplete) session.onComplete(interaction, session, filePath);
    return;
  }

  // Update embed with progress
  await interaction.update({
    embeds: [buildProgressEmbed(session)],
    components: [buildAnswerButton()]
  });
}

async function handleAnswerButton(interaction) {
  const session = getSession(interaction.user.id);
  if (!session) {
    return interaction.reply({ content: 'Session expired. Please start over.', ephemeral: true });
  }

  const modal = buildQuestionModal(session);
  await interaction.showModal(modal);
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
  buildAnswerButton, buildQuestionModal, buildProgressEmbed,
  handleModalSubmit, handleAnswerButton
};
```

---

## 3. Projects Tickets - Payment

### 3.1 Purpose
Full project workflow for clients who open a "Purchase / Sales Inquiry" ticket:

1. Client selects **Developer** vs **Service**.
2. If **Service** → ping admin role, wait.
3. If **Developer** → answer project questions → role selector → terms agreement → save to `.md` → embed with info → post to projects channel with Accept/Decline.
4. Admin **Accepts** → project embed posted → developers can **Apply**.
5. Developer applies → portfolio sent to client → client **Accept** (adds dev to ticket) or **Decline** (DM rejection).

### 3.2 Ticket Integration

The existing ticket system already creates channels in category `1438970959783530506`. This system hooks into the "Purchase / Sales Inquiry" ticket type (value `c0f60f084fc44e99ec904a89f83ffaf6`).

On ticket creation for this type, the bot should send an initial question embed instead of the generic welcome message, OR send an additional message after the welcome.

### 3.3 Questions Flow (Client Project)

| # | Question | Input Type | Validation |
|---|----------|-----------|------------|
| 1 | Game Type | Modal (short text) | Required |
| 2 | Payment Method | Modal (short text) | Required |
| 3 | Project Time | Modal (short text) | Required |
| 4 | The Details of the Project | Modal (paragraph) | Required, max 1024 |
| 5 | Number of Developers Needed | Modal (short text) | Must be a number >= 1 |
| 6 | The Roles Needed | StringSelectMenu (multi) | At least 1 selected |
| 7 | Videos / Images to Explain More | Modal (paragraph) | Optional |
| 8 | Do You Agree to the Terms? | Button (opens terms embed) + confirm button | Must confirm |

### 3.4 Role Selector (Question 6)

Send a `StringSelectMenu` with `maxValues: 11` containing these options:

| Label | Value | Emoji |
|-------|-------|-------|
| Scripter | `role_scripter` | 💻 |
| Builder | `role_builder` | 🏗️ |
| Modeler | `role_modeler` | 🎨 |
| FVX | `role_fvx` | ✨ |
| SFX | `role_sfx` | 🔊 |
| Animator | `role_animator` | 🎬 |
| Graphique Designer | `role_graphique` | 🖌️ |
| UI Designer | `role_ui` | 🖥️ |
| Manager | `role_manager` | 📋 |
| Marketing Team | `role_marketing` | 📢 |

### 3.5 Terms Agreement (Question 8)

1. Bot sends embed with terms text (Payment Split, Rules).
2. Two buttons: `📜 View Terms` and `✅ I Agree`.
3. `📜 View Terms` → sends ephemeral embed with full terms.
4. `✅ I Agree` → saves agreement, moves to finalization.

### 3.6 Terms Content

```
## Payment Split

### Client from the Server
- Developer: **60%**
- Server: **40%**

### Client from the Developer
- Developer: **90%**
- Server: **10%**

## Multiple Developers
- If more than one developer works on a project, the developer's share is divided equally unless an admin decides otherwise.
- The server's percentage does not change.

## Minimum Part For Single Developer
- Large projects must have a minimum part of **$100 USD** for a single developer.

## General Rules
- Complete the project professionally and on time.
- Keep the client updated on progress.
- Do not bypass the server's commission for server-provided clients.
- Contact an admin if there is any dispute or issue.
- Administration has the final decision in any conflict.
- You will not get paid if you did not finish the project.
- Talking with the client outside the server is not allowed.
- The developers will get paid after the client receives the project for the protection.
```

### 3.7 Final Summary Embed

After all questions answered, create an embed:

```
Title: 📋 New Project Request
Fields:
  • Game Type: <answer>
  • Payment Method: <answer>
  • Project Time: <answer>
  • Details: <truncated>
  • Developers Needed: <number>
  • Roles Needed: <scripter, builder, ...>
  • Attachments: <yes/no>
  • Terms: ✅ Agreed
Footer: Submitted by @user | Ticket #<number>
```

### 3.8 Channel Output

| Step | Channel ID | Action |
|------|-----------|--------|
| Send for admin review | `1526392883697942598` (Projects) | Embed + Accept / Decline buttons |
| Final accepted project | `1526392883697942598` (Projects) | Embed + Apply button |

### 3.9 Admin Accept / Decline Flow

**Accept button** (`accept_project_<ticketId>`):
1. Edits the embed to add "✅ **Accepted**" banner.
2. Posts a new embed (same info) with an **Apply** button (`apply_project_<uniqueId>`).
3. DMs the ticket owner: "Your project has been accepted!"

**Decline button** (`decline_project_<ticketId>`):
1. Shows a modal asking for a reason.
2. Edits embed to "❌ **Declined** — <reason>".
3. DMs the ticket owner with the reason.

### 3.10 Developer Apply Flow

**Developer clicks "Apply" on project embed:**

1. Bot DMs the developer asking them to submit their portfolio (modal: "Paste a link or describe your portfolio").
2. Developer submits → Bot sends the portfolio to the **client's DM** with two buttons:

   - **✅ Accept** (`dev_accept_<devId>_<ticketId>`):
     - Adds developer to the ticket channel (permission overwrite).
     - DMs developer: "You have been accepted to work on the project!"
     - DMs client: "Developer has been added to your ticket."
   
   - **❌ Decline** (`dev_decline_<devId>_<ticketId>`):
     - DMs developer: "Unfortunately, the client has declined your application for this project."
     - DMs client: "You have declined the developer."

### 3.11 Complete Module Skeleton: `projectTicket.js`

```js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { saveAndSend } = require('./savingSystem');
const { getSession, setSession, deleteSession, buildAnswerButton, buildQuestionModal, handleModalSubmit, handleAnswerButton } = require('./questionFlow');

const PROJECTS_CHANNEL_ID = '1526392883697942598';
const ADMIN_ROLE_ID = '1502962542740377672';

const PROJECT_QUESTIONS = [
  { id: 'game_type', text: 'What is the Game Type?' },
  { id: 'payment_method', text: 'What Payment Method will you use?' },
  { id: 'project_time', text: 'What is the Project Time (estimated duration)?' },
  { id: 'details', text: 'Describe the Details of the Project in full.' },
  { id: 'dev_count', text: 'How many Developers do you need?', meta: { type: 'number' } },
  // Roles and Terms are handled separately
];

const ROLE_OPTIONS = [
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

// Store: Map<ticketChannelId, { clientId, answers, status }>
const projectStore = new Map();

async function startProjectFlow(interaction, client) {
  // Called when a client opens a "Purchase/Sales Inquiry" ticket
  // Send initial selector: Developer or Service
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('project_type_select')
      .setPlaceholder('What You Need')
      .addOptions([
        { label: 'Developer', value: 'developer', emoji: '👨‍💻', description: 'Hire a developer for your project' },
        { label: 'Service', value: 'service', emoji: '🔧', description: 'Request a service from the server' }
      ])
  );

  await interaction.channel.send({
    content: '**What You Need?**',
    components: [row]
  });
}

async function handleProjectTypeSelect(interaction, client) {
  const value = interaction.values[0];

  if (value === 'service') {
    // Ping admin role
    await interaction.update({
      content: `<@&${ADMIN_ROLE_ID}> A service request has been opened. Please handle it.`,
      components: []
    });
    return;
  }

  // Developer → start question flow
  await interaction.deferUpdate();

  const session = {
    type: 'client_project',
    currentIndex: 0,
    answers: [],
    questions: PROJECT_QUESTIONS,
    questionsMeta: PROJECT_QUESTIONS.map(q => q.meta || null),
    userId: interaction.user.id,
    channelId: interaction.channel.id,
    ticketNumber: interaction.channel.name.replace('🎫・', ''),
    selectedRoles: [],
    termsAgreed: false,
  };

  setSession(interaction.user.id, session);

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Project Setup - Question 1')
    .setDescription(`**${PROJECT_QUESTIONS[0].text}**`)
    .setFooter({ text: 'Click "Answer" to fill in your response' });

  await interaction.channel.send({ embeds: [embed], components: [buildAnswerButton()] });
}

function buildProjectSummaryEmbed(session, userTag) {
  const answers = {};
  session.answers.forEach(a => { answers[a.question] = a.answer; });

  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('📋 New Project Request')
    .addFields(
      { name: 'Game Type', value: answers[PROJECT_QUESTIONS[0].text] || 'N/A', inline: true },
      { name: 'Payment Method', value: answers[PROJECT_QUESTIONS[1].text] || 'N/A', inline: true },
      { name: 'Project Time', value: answers[PROJECT_QUESTIONS[2].text] || 'N/A', inline: true },
      { name: 'Details', value: (answers[PROJECT_QUESTIONS[3].text] || 'N/A').slice(0, 1024), inline: false },
      { name: 'Developers Needed', value: answers[PROJECT_QUESTIONS[4].text] || 'N/A', inline: true },
      { name: 'Roles Needed', value: session.selectedRoles.join(', ') || 'N/A', inline: true },
      { name: 'Terms', value: '✅ Agreed', inline: true }
    )
    .setFooter({ text: `Submitted by ${userTag} | Ticket #${session.ticketNumber}` })
    .setTimestamp();

  return embed;
}

async function sendForAdminReview(interaction, session, client) {
  const guild = interaction.guild;
  const projectsChannel = guild.channels.cache.get(PROJECTS_CHANNEL_ID);
  if (!projectsChannel) throw new Error(`Projects channel ${PROJECTS_CHANNEL_ID} not found`);

  const embed = buildProjectSummaryEmbed(session, interaction.user.tag);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`accept_project_${session.ticketNumber}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`decline_project_${session.ticketNumber}`).setLabel('Decline').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );

  const msg = await projectsChannel.send({ embeds: [embed], components: [row] });

  // Store for later reference
  projectStore.set(session.ticketNumber, {
    clientId: interaction.user.id,
    channelId: interaction.channel.id,
    summaryEmbed: embed,
    messageId: msg.id,
    status: 'pending',
    session
  });
}

// Accept handler
async function handleProjectAccept(interaction, client) {
  const ticketNumber = interaction.customId.replace('accept_project_', '');
  const project = projectStore.get(ticketNumber);
  if (!project) return interaction.reply({ content: 'Project not found.', ephemeral: true });

  project.status = 'accepted';
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor('#00FF00')
    .setTitle('✅ Accepted Project')
    .setDescription('This project has been accepted and is open for developer applications.');

  const applyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`apply_project_${ticketNumber}`)
      .setLabel('Apply')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝')
  );

  await interaction.update({ embeds: [embed], components: [applyRow] });

  // DM client
  const clientUser = await client.users.fetch(project.clientId);
  await clientUser.send('✅ **Your project has been accepted!** Developers can now apply to work on it.').catch(() => {});

  projectStore.set(ticketNumber, project);
}

// Decline handler
async function handleProjectDecline(interaction, client) {
  // Show modal for reason
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
  const ticketNumber = interaction.customId.replace('decline_reason_', '');
  const reason = interaction.fields.getTextInputValue('decline_reason_input');
  const project = projectStore.get(ticketNumber);
  if (!project) return interaction.reply({ content: 'Project not found.', ephemeral: true });

  project.status = 'declined';
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor('#FF0000')
    .setTitle('❌ Declined Project')
    .setDescription(`**Reason:** ${reason}`);

  await interaction.update({ embeds: [embed], components: [] });

  const clientUser = await client.users.fetch(project.clientId);
  await clientUser.send(`❌ **Your project has been declined.**\n**Reason:** ${reason}`).catch(() => {});

  projectStore.set(ticketNumber, project);
}

module.exports = {
  startProjectFlow,
  handleProjectTypeSelect,
  handleProjectAccept,
  handleProjectDecline,
  handleDeclineReasonSubmit,
  buildProjectSummaryEmbed,
  sendForAdminReview,
  projectStore,
  PROJECT_QUESTIONS,
  ROLE_OPTIONS,
  PROJECTS_CHANNEL_ID,
  ADMIN_ROLE_ID
};
```

---

## 4. Payments on Development Services

### 4.1 Purpose
Provide a `/payments-method` command that shows a selector with two payment method options, displaying detailed information in **embeds** after selection.

### 4.2 Current Implementation

File: `Commands/general/payments-method.js`  
**Existing behavior:**
- Sends a message with **content** "Select the method that you want" + a `StringSelectMenu`.
- On select (handled in `index.js` via customId `payment_method_select`): sends an embed with method details.
- **Issue:** The initial message uses `content` instead of an embed.

### 4.3 Required Changes

1. **Wrap the initial message in an embed** — replace the string content with an `EmbedBuilder`.
2. The embed should match the visual design from the architecture image (blue color, title, description, footer).

#### Updated `payments-method.js`:

```js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payments-method')
    .setDescription('Displays a selector for payment methods.'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('💳 Payment Methods')
      .setDescription('Select the payment method that suits your project below.');

    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('payment_method_select')
          .setPlaceholder('Select the method that you want')
          .addOptions([
            { label: 'Method 01 "50% then 50%"', value: 'method_01', emoji: '💵' },
            { label: 'Method 02 "Part After Part"', value: 'method_02', emoji: '📊' },
          ])
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
```

### 4.4 Select Menu Response (Already Done - index.js lines 214-269)

The handler in `index.js` already responds with embeds for both methods. This is correct. No changes needed.

### 4.5 Payment Method Content Reference

**Method 01 — 50% then 50%:**

```
### Payment Flow
1. Client pays **50%** of the total project budget.
2. The developer starts working on the project.
3. Once development is finished, the completed project is shown to the client.
4. The client pays the remaining **50%**.
5. After the payment is confirmed, the full project is delivered.
6. The developer receives their share of the payment according to the server rules.

Total Payments:
• First Payment: 50%
• Final Payment: 50%
```

**Method 02 — Part After Part (3 equal parts):**

```
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
• Final Part
```

### 4.6 Interaction Flow

```
User runs /payments-method
  → Bot sends embed: "💳 Payment Methods" + dropdown
  → User selects a method
    → Bot deferReply (ephemeral: true)
    → Bot edits reply with method-specific embed (already implemented)
```

---

## 5. Applying System

### 5.1 Purpose
Allow users to apply for **Developer** or **Staff** roles through a question flow within a ticket channel, ending with saving to `.md` and routing to the developer applications channel.

### 5.2 Trigger

The system should integrate with the **existing ticket system**. When a user opens a ticket (or within a specific ticket type), the bot sends an initial message:

> "If you want to apply for a Developer **# Click** the button"

With a single button: **📝 Apply**

### 5.3 Questions

| # | Question | Input Type | Validation |
|---|----------|-----------|------------|
| 1 | What is your Name? | Modal (short text) | Required, max 100 |
| 2 | What is your Age? | Modal (short text) | Must be 5–120 |
| 3 | What is your Timezone? | Modal (short text) | Must match timezone pattern |
| 4 | What is your Role? | StringSelectMenu (single) | Must select one |
| 5 | What are your Projects? (list them) | Modal (paragraph) | Required, max 1024 |
| 6 | What is the best project you have done? | Modal (paragraph) | Required, max 1024 |
| 7 | How long are you available? | Modal (short text) | Required |
| 8 | What is your specialty? | Modal (short text) | Required |
| 9 | What payment methods do you accept? | Modal (short text) | Required |
| 10 | Do you agree to our terms? | Button (yes/no) | Must agree |

### 5.4 Role Selector (Question 4)

Same roles as project tickets:

| Label | Value |
|-------|-------|
| Scripter | `role_scripter` |
| Builder | `role_builder` |
| Modeler | `role_modeler` |
| FVX | `role_fvx` |
| SFX | `role_sfx` |
| Animator | `role_animator` |
| Graphique Designer | `role_graphique` |
| UI Designer | `role_ui` |
| Manager | `role_manager` |
| Marketing Team | `role_marketing` |

### 5.5 Terms Agreement (Question 10)

- Same terms content as Section 3.6.
- Bot sends embed: "Do You Agree To Our Terms?" with two buttons:
  - `📜 Terms` → ephemeral embed with full terms
  - `✅ I Agree` → proceed to finalization

### 5.6 Saving & Routing

After all 10 questions are answered:

1. Build markdown via `savingSystem.buildMarkdown()` with `developerTag: @user`.
2. Save to file with `savingSystem.saveAndSend()` using type `developer`.
3. File is sent to channel `1526401023588040817` (Developer Applications).
4. Ticket channel cleaned up (buttons removed, final embed sent).

### 5.7 Complete Module Skeleton: `applySystem.js`

```js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { saveAndSend } = require('./savingSystem');
const { getSession, setSession, deleteSession, buildAnswerButton, buildQuestionModal, handleModalSubmit, handleAnswerButton, activeSessions } = require('./questionFlow');

const DEVELOPER_APPLICATIONS_CHANNEL_ID = '1526401023588040817';

const APPLY_QUESTIONS = [
  { id: 'name', text: 'What is your Name?', meta: null },
  { id: 'age', text: 'What is your Age?', meta: { type: 'age' } },
  { id: 'timezone', text: 'What is your Timezone?', meta: { type: 'timezone' } },
  // Role is handled separately (select menu)
  { id: 'projects', text: 'What are your Projects? (List them)' },
  { id: 'best_project', text: 'What is the best project you have done?' },
  { id: 'availability', text: 'How long are you available?' },
  { id: 'specialty', text: 'What is your specialty?' },
  { id: 'payment_methods', text: 'What payment methods do you accept?' },
  // Terms handled separately (button)
];

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

async function startApplyFlow(interaction) {
  const channel = interaction.channel;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('📝 Developer / Staff Application')
    .setDescription('If you want to apply for a Developer, click the button below.\n\nWe will ask you a few questions to review your application.')
    .setFooter({ text: 'Lunexis Team' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_developer_apply')
      .setLabel('Apply')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📝')
  );

  await channel.send({ embeds: [embed], components: [row] });
}

async function handleApplyButton(interaction) {
  // Initialize session
  const session = {
    type: 'developer',
    currentIndex: 0,
    answers: [],
    questions: APPLY_QUESTIONS,
    questionsMeta: APPLY_QUESTIONS.map(q => q.meta || null),
    userId: interaction.user.id,
    channelId: interaction.channel.id,
    ticketNumber: interaction.channel.name.replace('🎫・', ''),
    selectedRole: null,
    termsAgreed: false,
  };

  setSession(interaction.user.id, session);

  await interaction.update({
    content: null,
    embeds: [
      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Application - Question 1')
        .setDescription(`**${APPLY_QUESTIONS[0].text}**`)
    ],
    components: [buildAnswerButton()]
  });
}

async function handleRoleSelect(interaction) {
  const session = getSession(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Session expired.', ephemeral: true });

  session.selectedRole = interaction.values[0];
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Application - Question 5')
        .setDescription(`**${APPLY_QUESTIONS[3].text}**\n\nYour role: **${interaction.values[0]}**`)
    ],
    components: [buildAnswerButton()]
  });
}

async function finalizeApplication(interaction, client) {
  const session = getSession(interaction.user.id);
  if (!session) return;

  // Build final answer array including role and terms
  const allAnswers = [
    ...session.answers,
    { question: 'Role Selected', answer: session.selectedRole || 'N/A' },
    { question: 'Terms Agreed', answer: '✅ Yes' }
  ];

  // Save to .md and send to channel
  const filePath = await saveAndSend(client, {
    guildId: interaction.guildId,
    answers: allAnswers,
    type: 'developer',
    userTag: interaction.user.tag,
    ticketNumber: session.ticketNumber
  });

  // Final embed
  const finalEmbed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('✅ Application Submitted')
    .setDescription(`Thank you **${interaction.user.tag}**! Your developer application has been submitted successfully.\n\nThe team will review it shortly.`)
    .setFooter({ text: 'Lunexis Team' });

  await interaction.channel.send({ embeds: [finalEmbed] });
  deleteSession(interaction.user.id);
}

module.exports = {
  startApplyFlow,
  handleApplyButton,
  handleRoleSelect,
  finalizeApplication,
  APPLY_QUESTIONS,
  APPLY_ROLE_OPTIONS,
  DEVELOPER_APPLICATIONS_CHANNEL_ID
};
```

---

## 6. Shared Utilities & Cross-Cutting

### 6.1 Active Session Map

Defined in `questionFlow.js`:

```js
// Map<userId, Session>
const activeSessions = new Map();
```

Used by:
- `questionFlow.js` — managing sequential Q&A
- `projectTicket.js` — client project questions
- `applySystem.js` — developer application questions

### 6.2 Module Dependencies

```
savingSystem.js (standalone)
  └─ fs, path

questionFlow.js
  └─ savingSystem.js (for final save)
  └─ discord.js (modals, embeds, buttons)

projectTicket.js
  └─ savingSystem.js
  └─ questionFlow.js (session management, modal helpers)
  └─ discord.js

applySystem.js
  └─ savingSystem.js
  └─ questionFlow.js (session management, modal helpers)
  └─ discord.js

payments-method.js (Commands/general/)
  └─ discord.js
```

### 6.3 Store / Persistence

| Data | Storage | File | Persistence |
|------|---------|------|-------------|
| Ticket counter | JSON file | `ticket-config.json` | Yes |
| Ticket config | JSON file | `ticket-config.json` | Yes |
| Saved applications | `.md` files on disk | `saved-applications/*.md` | Yes |
| Project store | In-memory Map | N/A | No (volatile) |
| Active Q&A sessions | In-memory Map | N/A | No (volatile) |
| Protection settings | pro.db (JSON) | `database.json` | Yes |
| Dashboard settings | pro.db (JSON) | `database.json` | Yes |
| Giveaways | JSON file | `giveaways.json` | Yes |
| Guild settings | JSON file | `guildSettings.json` | Yes |
| User stats | JSON file | `userStats.json` | Yes |

### 6.4 pro.db Schema (used by existing protection & dashboard)

All keys follow pattern: `{guildId}_{settingName}`

| Key Pattern | Type | Description |
|------------|------|-------------|
| `{guildId}_antilink` | boolean | Anti-link protection toggle |
| `{guildId}_antiscam` | boolean | Anti-scam protection toggle |
| `{guildId}_antiraid` | boolean | Anti-raid protection toggle |
| `{guildId}_antispam` | boolean | Anti-spam protection toggle |
| `{guildId}_antichanneldelete` | boolean | Anti-channel delete toggle |
| `{guildId}_antichannelcreate` | boolean | Anti-channel create toggle |
| `{guildId}_antichanneledit` | boolean | Anti-channel edit toggle |
| `{guildId}_antirolecreate` | boolean | Anti-role create toggle |
| `{guildId}_antiroledelete` | boolean | Anti-role delete toggle |
| `{guildId}_antiroleedit` | boolean | Anti-role edit toggle |
| `{guildId}_antiadmingrant` | boolean | Anti-admin grant toggle |
| `{guildId}_antikick` | boolean | Anti-kick protection toggle |
| `{guildId}_antiban` | boolean | Anti-ban protection toggle |
| `{guildId}_language` | 'en' \| 'ar' | Server language setting |
| `{guildId}_logchannel` | string | Log channel ID |
| `{guildId}_punishment` | 'removeroles' \| 'kick' \| 'ban' | Punishment action for protections |
| `{guildId}_command_{name}` | boolean | Command enable/disable |
| `{guildId}_verify_role` | string | Verification role ID |
| `{guildId}_{type}_whitelist` | string[] | Whitelist user IDs for protection |

---

## 7. File Structure

```
The Main Bot/
├── architectures/
│   ├── Saving system.md
│   ├── Questions Answering System.md
│   ├── Projects tickets - Payment.md
│   ├── Payments on development services.md
│   ├── Applying system.md
│   └── SYSTEMS-REQUIREMENTS.md          ← THIS FILE
│
├── Commands/
│   ├── general/
│   │   └── payments-method.js           ← Needs embed fix (Section 4.3)
│   ├── ticket/
│   │   ├── ticketPanel.js               ← OK as-is
│   │   └── manage.js                    ← OK as-is
│   └── ... (other command folders)
│
├── saved-applications/                   ← Created at runtime by savingSystem.js
│   ├── 1-@user-developer-application.md
│   └── 2-@user-client-project.md
│
├── questionFlow.js                       ← NEW - Sequential Q&A manager
├── savingSystem.js                       ← NEW - Save to .md + send to channel
├── projectTicket.js                      ← NEW - Project ticket workflow
├── applySystem.js                        ← NEW - Developer / staff application
│
├── index.js                              ← Needs new interaction handlers added
├── utils.js
├── ticket-config.json
├── database.json
├── package.json
├── protectionEvents.js
├── giveaway.js
├── ratingHandler.js
├── presence.js
└── server.js
```

### 7.1 New Files to Create

| File | Purpose |
|------|---------|
| `savingSystem.js` | Save answers to `.md`, route to channels |
| `questionFlow.js` | Shared modal-based sequential question flow |
| `projectTicket.js` | Full project ticket workflow (questions → summary → accept/decline → apply) |
| `applySystem.js` | Developer/staff application flow |

### 7.2 Files to Modify

| File | Change |
|------|--------|
| `index.js` | Add interaction handlers for: modal submits, new customIds (`project_type_select`, `answer_question`, `start_developer_apply`, `accept_project_*`, `decline_project_*`, `apply_project_*`, `dev_accept_*`, `dev_decline_*`, `role_select_apply`, `agree_terms`, `view_terms`, etc.) |
| `Commands/general/payments-method.js` | Replace `content` with embed for initial message (Section 4.3) |

---

## 8. Channel & Role ID Reference

| Entity | ID | Purpose |
|--------|----|---------|
| **Guild** | `830104403440566272` | Main server |
| **Admin Role** | `1502962542740377672` | Pinged for service requests |
| **Manager Role** | `1502962261327876117` | Has ticket manage permissions |
| **Staff Role** | `1502962542740377672` | Ticket staff role (same as admin) |
| **Ticket Category** | `1438970959783530506` | Category where ticket channels are created |
| **Projects Channel** | `1526392883697942598` | Project embeds sent here for admin review / developer apply |
| **Developer Applications** | `1526401023588040817` | Saved developer application .md files sent here |
| **Client Projects** | `1526402048361496699` | Saved client project .md files sent here |
| **Transcript Archive** | `1526626558058434721` | Ticket transcripts archived here |
| **Logs / Rating** | `1442647498517905669` | Ticket logs and ratings |
| **Log Channels (util):** | | |
| Timeout Logs | `1443989919558144171` | Timeout moderation logs |
| Ban Logs | `1443983067692793980` | Ban moderation logs |
| Unban Logs | `1443983067692793980` | Unban moderation logs |
| Warning Logs | `1443982427272777759` | Warning moderation logs |
| Kick Logs | `1443982534240112806` | Kick moderation logs |
| Join Logs | `1443982946305576980` | Member join logs |
| Leave Logs | `1443982968992563400` | Member leave logs |
| Role Create Logs | `1443983217437839432` | Role creation logs |
| Role Delete Logs | `1443983260383449230` | Role deletion logs |
| **Room Maker Category** | `1440460565582581912` | VC room creation category |
| **Room Maker Lobby** | `1440460567340126208` | VC room creation lobby |

---

## Appendix A: Interaction Custom IDs Reference

All custom IDs used across the new systems:

| Custom ID | Handler Location | Description |
|-----------|-----------------|-------------|
| `payment_method_select` | `index.js` line 214 | Payment method dropdown |
| `project_type_select` | `projectTicket.js` | Project type (Developer/Service) |
| `answer_question` | `questionFlow.js` | Open modal for current question |
| `qa_modal_{index}` | `questionFlow.js` | Modal submission for question index |
| `start_developer_apply` | `applySystem.js` | Start developer apply flow |
| `role_select_apply` | `applySystem.js` | Role selection for application |
| `agree_terms` | `applySystem.js` / `projectTicket.js` | User agrees to terms |
| `view_terms` | `applySystem.js` / `projectTicket.js` | Show terms embed (ephemeral) |
| `accept_project_{ticket}` | `projectTicket.js` | Admin accepts project |
| `decline_project_{ticket}` | `projectTicket.js` | Admin declines project |
| `decline_reason_{ticket}` | `projectTicket.js` | Decline reason modal submit |
| `apply_project_{ticket}` | `projectTicket.js` | Developer applies for project |
| `dev_accept_{devId}_{ticket}` | `projectTicket.js` | Client accepts developer |
| `dev_decline_{devId}_{ticket}` | `projectTicket.js` | Client declines developer |

---

## Appendix B: index.js Interaction Handler Wiring

The following new branches must be added to the `InteractionCreate` event in `index.js`:

```js
// === NEW: Answer question button ===
if (interaction.isButton() && interaction.customId === 'answer_question') {
  const { handleAnswerButton } = require('./questionFlow');
  await handleAnswerButton(interaction);
  return;
}

// === NEW: Modal submission for Q&A ===
if (interaction.isModalSubmit() && interaction.customId.startsWith('qa_modal_')) {
  const { handleModalSubmit } = require('./questionFlow');
  await handleModalSubmit(interaction, client);
  return;
}

// === NEW: Project type select ===
if (interaction.isStringSelectMenu() && interaction.customId === 'project_type_select') {
  const { handleProjectTypeSelect } = require('./projectTicket');
  await handleProjectTypeSelect(interaction, client);
  return;
}

// === NEW: Project accept ===
if (interaction.isButton() && interaction.customId.startsWith('accept_project_')) {
  const { handleProjectAccept } = require('./projectTicket');
  await handleProjectAccept(interaction, client);
  return;
}

// === NEW: Project decline ===
if (interaction.isButton() && interaction.customId.startsWith('decline_project_')) {
  const { handleProjectDecline } = require('./projectTicket');
  await handleProjectDecline(interaction, client);
  return;
}

// === NEW: Decline reason modal ===
if (interaction.isModalSubmit() && interaction.customId.startsWith('decline_reason_')) {
  const { handleDeclineReasonSubmit } = require('./projectTicket');
  await handleDeclineReasonSubmit(interaction, client);
  return;
}

// === NEW: Developer apply button ===
if (interaction.isButton() && interaction.customId === 'start_developer_apply') {
  const { handleApplyButton } = require('./applySystem');
  await handleApplyButton(interaction);
  return;
}

// === NEW: Role select in apply ===
if (interaction.isStringSelectMenu() && interaction.customId === 'role_select_apply') {
  const { handleRoleSelect } = require('./applySystem');
  await handleRoleSelect(interaction);
  return;
}

// === NEW: Terms buttons ===
if (interaction.isButton() && interaction.customId === 'view_terms') {
  const termsEmbed = new EmbedBuilder()/* ... full terms embed ... */;
  await interaction.reply({ embeds: [termsEmbed], ephemeral: true });
  return;
}

if (interaction.isButton() && interaction.customId === 'agree_terms') {
  // Handle terms agreement for either apply or project flow
  const { getSession } = require('./questionFlow');
  const session = getSession(interaction.user.id);
  if (!session) return interaction.reply({ content: 'Session expired.', ephemeral: true });
  session.termsAgreed = true;
  // Continue to next question or finalize
  await interaction.update({ content: '✅ Terms agreed!', components: [] });
  return;
}
```

---

*End of SYSTEMS-REQUIREMENTS.md*
