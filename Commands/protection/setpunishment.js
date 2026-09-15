const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setpunishment')
    .setDescription('Set punishment for protection violations')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Select the punishment action')
        .setRequired(true)
        .addChoices(
          { name: 'Remove Roles', value: 'removeroles' },
          { name: 'Kick', value: 'kick' },
          { name: 'Ban', value: 'ban' }
        )
    ),
  async execute(interaction, client) {
    const action = interaction.options.getString('action');
    await db.set(`${interaction.guild.id}_punishment`, action);

    const actionDescriptions = {
      removeroles: 'Remove all roles',
      kick: 'Kick from the server',
      ban: 'Ban from the server'
    };

    const actionDescription = actionDescriptions[action];

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# 🛡️ Punishment Set\n\nThe punishment for protection violations has been set to: **${actionDescription}**`),
        new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
