const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { createGiveaway, setMessageId } = require('../../giveaway');
const { parseDuration } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gstart')
    .setDescription('Start a giveaway')
    .addStringOption(option =>
      option.setName('prize')
        .setDescription('The prize for the giveaway')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g., 1h, 30m, 2d)')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to host the giveaway (default: current)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
    }

    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration) {
      return interaction.reply({ content: 'Invalid duration format. Use like 1h, 30m, 2d.', flags: 64 });
    }

    const giveaway = createGiveaway(interaction.guild.id, channel.id, interaction.user.id, prize, duration);

    const enterButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('🎉 Enter Giveaway')
        .setStyle(ButtonStyle.Success)
    );

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 🎉 Giveaway!\n\n**Prize:** ${prize}\n**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n**Hosted by:** ${interaction.user}`)
      );

    const message = await channel.send({ components: [container, enterButton], flags: MessageFlags.IsComponentsV2 });

    setMessageId(message.id, giveaway);

    await interaction.reply({ content: `Giveaway started in ${channel}!`, flags: 64 });
  }
};