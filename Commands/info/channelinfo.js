const { SlashCommandBuilder, ChannelType, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Show information about a channel')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel (defaults to current)').setRequired(false)),
  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 📺 Channel Info: ${channel.name}`),
        new TextDisplayBuilder().setContent(`**ID:** ${channel.id}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Type:** ${ChannelType[channel.type] || `${channel.type}`}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Created:** ${channel.createdAt.toLocaleString()}`)
      );
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
