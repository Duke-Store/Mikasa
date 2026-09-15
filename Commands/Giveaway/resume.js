const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { resumeGiveaway, getGiveaway } = require('../../giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gresume')
    .setDescription('Resume a paused giveaway')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');

    const success = resumeGiveaway(messageId);
    if (!success) {
      return interaction.reply({ content: 'Giveaway not found or not paused.', flags: 64 });
    }

    // Update the message
    try {
      const message = await interaction.channel.messages.fetch(messageId);
      const giveaway = getGiveaway(messageId);
      if (giveaway) {
        const enterButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Enter Giveaway')
            .setStyle(ButtonStyle.Success)
        );
        const container = new ContainerBuilder()
          .setAccentColor(0xFFDD00)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 🎉 Giveaway!\n\n**Prize:** ${giveaway.prize}\n**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n**Hosted by:** <@${giveaway.hostId}>`)
          );
        await message.edit({ components: [container, enterButton], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (error) {
      console.error('Failed to update giveaway message:', error);
    }

    await interaction.reply({ content: 'Giveaway resumed.', flags: 64 });
  }
};