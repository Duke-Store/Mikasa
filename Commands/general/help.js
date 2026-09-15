const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

const HELP_SECTIONS = {
  home: {
    title: 'Bot Help Center',
    description: 'Use the buttons below to browse the available command sections.',
    color: 0x5865f2,
    commands: [
      { name: '/help', description: 'Show this help menu.' },
      { name: '/ping', description: 'Check the bot response time.' },
      { name: '/stats', description: 'Show your activity stats.' },
      { name: '/settings', description: 'View the current bot settings.' },
    ],
  },
  system: {
    title: 'System Commands',
    description: 'Useful commands for general bot usage and server overview.',
    color: 0x1f8b4c,
    commands: [
      { name: '/help', description: 'Open the help menu.' },
      { name: '/ping', description: 'Check the bot latency.' },
      { name: '/stats', description: 'View your server statistics.' },
      { name: '/top', description: 'See the top users by activity.' },
      { name: '/settings', description: 'Open the settings panel.' },
    ],
  },
  ticket: {
    title: 'Ticket Commands',
    description: 'Commands for opening and managing support tickets.',
    color: 0xfaa61a,
    commands: [
      { name: '/setup', description: 'Create the ticket panel in a channel.' },
      { name: '/manage add', description: 'Add a user to the current ticket.' },
      { name: '/manage remove', description: 'Remove a user from the current ticket.' },
      { name: '/ticket-setcategory', description: 'Choose the category for new tickets.' },
    ],
  },
  moderation: {
    title: 'Moderation Commands',
    description: 'Staff tools for managing behavior and server safety.',
    color: 0xed4245,
    commands: [
      { name: '/ban', description: 'Ban a user from the server.' },
      { name: '/kick', description: 'Kick a user from the server.' },
      { name: '/mute', description: 'Mute a user temporarily.' },
      { name: '/timeout', description: 'Timeout a user.' },
      { name: '/warn', description: 'Warn a user.' },
      { name: '/warnings', description: 'Show a user warning history.' },
      { name: '/clear', description: 'Delete multiple messages.' },
    ],
  },
  utility: {
    title: 'Utility Commands',
    description: 'Helpful tools for announcements, reminders, polls, and more.',
    color: 0x99aab5,
    commands: [
      { name: '/announce', description: 'Send an announcement to a channel.' },
      { name: '/remind', description: 'Set a reminder for yourself.' },
      { name: '/say', description: 'Make the bot send a message.' },
      { name: '/invite', description: 'Get the bot invite link.' },
    ],
  },
  info: {
    title: 'Info Commands',
    description: 'Commands for looking up server and user details.',
    color: 0x7289da,
    commands: [
      { name: '/avatar', description: 'Show a user avatar.' },
      { name: '/userinfo', description: 'Show information about a user.' },
      { name: '/serverinfo', description: 'Show information about the server.' },
      { name: '/channelinfo', description: 'Show information about a channel.' },
      { name: '/roleinfo', description: 'Show information about a role.' },
    ],
  },
  config: {
    title: 'Configuration Commands',
    description: 'Commands for setting up welcome, goodbye, logs, and roles.',
    color: 0x2ecc71,
    commands: [
      { name: '/setwelcome', description: 'Set the welcome channel and message.' },
      { name: '/setgoodbye', description: 'Set the goodbye channel and message.' },
      { name: '/setlog', description: 'Set the logging channel.' },
      { name: '/setautorole', description: 'Set the auto-role for new members.' },
      { name: '/setmodrole', description: 'Set the moderator role.' },
    ],
  },
  giveaway: {
    title: 'Giveaway Commands',
    description: 'Commands for managing giveaways and winners.',
    color: 0xff69b4,
    commands: [
      { name: '/gstart', description: 'Create a new giveaway.' },
      { name: '/gend', description: 'End an existing giveaway.' },
      { name: '/greroll', description: 'Reroll a giveaway winner.' },
      { name: '/glist', description: 'List active giveaways.' },
      { name: '/gpause', description: 'Pause a giveaway.' },
      { name: '/gresume', description: 'Resume a paused giveaway.' },
    ],
  },
  protection: {
    title: '🛡️ Protection Commands',
    description: 'Commands for enabling, disabling, and configuring server protection features.',
    color: 0xe74c3c,
    commands: [
      { name: '/enable', description: 'Enable a server protection feature (Anti-Spam, Anti-Raid, Anti-Scam, etc.).' },
      { name: '/disable', description: 'Disable a server protection feature.' },
      { name: '/setlimted', description: 'Set the action limit before a protection feature triggers.' },
      { name: '/setpunishment', description: 'Set the punishment for protection violations (remove roles, kick, or ban).' },
      { name: '/whitelist', description: 'Add or remove a user from the whitelist of a protection feature.' },
      { name: '/whitelist-list', description: 'View the whitelist for a specific protection feature.' },
      { name: '/setprotectionlog', description: 'Set the channel where protection events are logged.' },
      { name: '/auditlog', description: 'View recent server audit log entries.' },
      { name: '/verify', description: 'Verify your identity or manage verification settings.' },
    ],
  },
};

function getHelpContainer(sectionKey = 'home') {
  const section = HELP_SECTIONS[sectionKey] || HELP_SECTIONS.home;
  const container = new ContainerBuilder().setAccentColor(section.color);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${section.title}\n\n${section.description}`)
  );
  if (section.commands && section.commands.length) {
    for (const cmd of section.commands) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${cmd.name}** — ${cmd.description}`));
    }
  }
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('*Use the buttons below to switch sections.*'));
  return container;
}

function getHelpRows(activeSection = 'home') {
  const buttonData = [
    { id: 'home', label: 'Home', style: ButtonStyle.Primary },
    { id: 'system', label: 'System', style: ButtonStyle.Secondary },
    { id: 'ticket', label: 'Ticket', style: ButtonStyle.Secondary },
    { id: 'moderation', label: 'Moderation', style: ButtonStyle.Secondary },
    { id: 'utility', label: 'Utility', style: ButtonStyle.Secondary },
  ];

  const secondRow = [
    { id: 'info', label: 'Info', style: ButtonStyle.Secondary },
    { id: 'config', label: 'Config', style: ButtonStyle.Secondary },
    { id: 'giveaway', label: 'Giveaway', style: ButtonStyle.Secondary },
    { id: 'protection', label: '🛡️ Protection', style: ButtonStyle.Danger },
  ];

  const buildRow = (buttons) =>
    new ActionRowBuilder().addComponents(
      ...buttons.map((button) => {
        const isActive = activeSection === button.id;
        return new ButtonBuilder()
          .setCustomId(`help_${button.id}`)
          .setLabel(button.label)
          .setStyle(isActive ? ButtonStyle.Success : button.style);
      })
    );

  return [buildRow(buttonData), buildRow(secondRow)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help for bot commands in categories'),
  async execute(interaction) {
    const initialSection = 'home';
    await interaction.reply({
      components: [getHelpContainer(initialSection), ...getHelpRows(initialSection)],
      flags: MessageFlags.IsComponentsV2,
    });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,
      time: 5 * 60 * 1000,
    });

    collector.on('collect', async (buttonInteraction) => {
      try {
        await buttonInteraction.deferUpdate();
        const sectionKey = buttonInteraction.customId.replace('help_', '');
        await reply.edit({
          components: [getHelpContainer(sectionKey), ...getHelpRows(sectionKey)],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch (error) {
        console.error('Help button update failed:', error);
      }
    });

    collector.on('end', async () => {
      try {
        if (!reply.deleted) {
          const expiredContainer = new ContainerBuilder().setAccentColor(0xFFDD00)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('*Help menu expired. Use `/help` to open a new one.*'));
          await reply.edit({
            components: [expiredContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      } catch (error) {
        console.error('Help collector cleanup failed:', error);
      }
    });
  },
};
