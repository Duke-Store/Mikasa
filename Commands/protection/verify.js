const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Set up the verification system for the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the verification message')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role to give to verified members')
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const guildId = interaction.guild.id;

    if (!channel.isTextBased) {
      return interaction.reply({ content: '❌ The verification channel must be a text channel.', flags: 64 });
    }

    const verifyContainer = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Member Verification\n\nTo verify that you are human, please click the button below and proceed to the verification page in the dashboard.')
      );

    const verifyButton = new ButtonBuilder()
      .setCustomId('ver')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(verifyButton);

    const message = await channel.send({ components: [verifyContainer, row], flags: MessageFlags.IsComponentsV2 });

    await db.set(`${guildId}_verify_message`, message.id);
    await db.set(`${guildId}_verify_channel`, channel.id);
    await db.set(`${guildId}_verify_role`, role.id);

    const successContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ Verification Setup\n\nVerification system has been set up successfully! Verified members will receive the ${role.name} role.`));
    interaction.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 | 64 });
  }
};
