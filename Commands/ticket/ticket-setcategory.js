const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildSettings, saveGuildSettingsToFile, safeRespond } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setcategory')
    .setDescription('Set the category where ticket channels will be created')
    .addChannelOption((o) =>
      o.setName('category').setDescription('Ticket category').setRequired(true).addChannelTypes(ChannelType.GuildCategory)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction, client) {
    const category = interaction.options.getChannel('category', true);
    const settings = getGuildSettings(interaction.guild.id);
    settings.ticketCategoryId = category.id;
    saveGuildSettingsToFile();

    const container = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📁 Ticket Category Set\n\nTicket category set to **${category.name}**. I will create ticket rooms under this category.`));
    await safeRespond(interaction, { components: [container], flags: MessageFlags.IsComponentsV2 | 64 });
  },
};
