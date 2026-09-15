const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setprotectionlog')
    .setDescription('Enable or disable logging for the protection features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Enable or disable logging')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' }
        )
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send logs to (required when enabling)')
        .setRequired(false)
    ),
  async execute(interaction, client) {
    const action = interaction.options.getString('action');
    const channel = interaction.options.getChannel('channel');

    let title, description, color, emoji;

    if (action === 'enable') {
      if (!channel) {
        return interaction.reply({ content: '❌ You must specify a channel when enabling logging.', flags: 64 });
      }
      if (channel.type !== 0) {
        return interaction.reply({ content: '❌ The specified channel must be a text channel.', flags: 64 });
      }
      db.set(`${interaction.guild.id}_logchannel`, channel.id);
      title = 'Logging Enabled';
      description = `Logging has been enabled. Logs will be sent to ${channel}.`;
      color = 0x00FF00;
      emoji = '✅';
    } else {
      db.delete(`${interaction.guild.id}_logchannel`);
      title = 'Logging Disabled';
      description = 'Logging has been disabled for this server.';
      color = 0xFF0000;
      emoji = '❌';
    }

    const container = new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${emoji} ${title}\n\n${description}`),
        new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`),
        new TextDisplayBuilder().setContent(`*Requested by ${interaction.user.tag}*`)
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
