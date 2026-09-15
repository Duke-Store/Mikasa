const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile, safeRespond } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('store-setticketroom')
    .setDescription('Set the ticket room used by your existing ticket bot')
    .addChannelOption((o) => o.setName('room').setDescription('Channel where the ticket bot panel is').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction, client) {
    const room = interaction.options.getChannel('room', true);

    if (!room.isTextBased) {
      return safeRespond(interaction, {
        content: 'Please select a **text** channel.',
        flags: 64,
      });
    }

    const settings = getGuildSettings(interaction.guild.id);
    settings.ticketRoomChannelId = room.id;
    saveGuildSettingsToFile();

    const ticketRoomContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ Ticket Room Set\n\nTicket room set to ${room}. Users will be sent there when they click **Buy** or **Contact Support**.`));
    await safeRespond(interaction, {
      components: [ticketRoomContainer],
      flags: MessageFlags.IsComponentsV2 | 64,
    });
  },
};
