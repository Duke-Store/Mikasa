const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { getActiveGiveaways } = require('../../giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('glist')
    .setDescription('List all active giveaways in this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
    }
    const giveaways = getActiveGiveaways(interaction.guild.id);

    if (giveaways.length === 0) {
      return interaction.reply({ content: 'No active giveaways.', flags: 64 });
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Active Giveaways'));
    giveaways.forEach((g, i) => {
      if (i > 0) container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${g.prize}**\nChannel: <#${g.channelId}>\nEnds: <t:${Math.floor(g.endTime / 1000)}:R>\nParticipants: ${g.participants.length}`));
    });

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | 64 });
  }
};