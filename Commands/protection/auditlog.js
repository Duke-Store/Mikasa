const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auditlog')
    .setDescription('Set up server logs for various events')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('log_type')
        .setDescription('Select the type of log to set up')
        .setRequired(true)
        .addChoices(
          { name: 'Messages', value: 'messages' },
          { name: 'Channels', value: 'channels' },
          { name: 'Voice', value: 'voice' },
          { name: 'Members', value: 'members' },
          { name: 'Server', value: 'guild' },
          { name: 'Roles', value: 'roles' },
          { name: 'Moderation', value: 'moderation' }
        )
    )
    .addChannelOption(option =>
      option.setName('log_channel')
        .setDescription('Select the channel for logs')
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const logType = interaction.options.getString('log_type');
    const channel = interaction.options.getChannel('log_channel');

    if (!channel.isTextBased) {
      return interaction.reply({ 
        content: '❌ The specified channel must be a text channel.', 
        flags: 64 
      });
    }

    let dbKey, logTypeName;

    switch(logType) {
      case 'messages': 
        logTypeName = 'messages';
        dbKey = `Messages_${interaction.guild.id}`;
        break;
      case 'channels':
        logTypeName = 'channels';
        dbKey = `Channels_${interaction.guild.id}`;
        break;
      case 'voice':
        logTypeName = 'voice';
        dbKey = `VoiceState_${interaction.guild.id}`;
        break;
      case 'members':
        logTypeName = 'members';
        dbKey = `GuildMembers_${interaction.guild.id}`;
        break;
      case 'guild':
        logTypeName = 'server';
        dbKey = `GuildUpdates_${interaction.guild.id}`;
        break;
      case 'roles':
        logTypeName = 'roles';
        dbKey = `RolesUpdate_${interaction.guild.id}`;
        break;
      case 'moderation':
        logTypeName = 'moderation';
        dbKey = `Moderation_${interaction.guild.id}`;
        break;
    }

    db.set(dbKey, channel.id);

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ✅ Log Set Successfully\n\n${logTypeName.charAt(0).toUpperCase() + logTypeName.slice(1)} log has been set to ${channel}`),
        new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`),
        new TextDisplayBuilder().setContent('*Powerful Protection Bot*')
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | 64 });
  }
};
