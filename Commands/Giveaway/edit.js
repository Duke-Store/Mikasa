const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { editGiveaway, getGiveaway } = require('../../giveaway');
const { parseDuration } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gedit')
    .setDescription('Edit a giveaway')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('The message ID of the giveaway')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('prize')
        .setDescription('New prize (leave empty to not change)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('New duration (e.g., 1h, leave empty to not change)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');
    const newPrize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');

    let newDuration = null;
    if (durationStr) {
      newDuration = parseDuration(durationStr);
      if (!newDuration) {
        return interaction.reply({ content: 'Invalid duration format.', flags: 64 });
      }
    }

    const success = editGiveaway(messageId, newPrize, newDuration);
    if (!success) {
      return interaction.reply({ content: 'Giveaway not found.', flags: 64 });
    }

    // Update the message
    try {
      const giveaway = getGiveaway(messageId);
      const message = await interaction.channel.messages.fetch(messageId);
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

    await interaction.reply({ content: 'Giveaway edited.', flags: 64 });
  }
};