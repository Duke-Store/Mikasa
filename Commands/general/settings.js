const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { getGuildSettings, safeRespond } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Show server settings'),
  async execute(interaction, client) {
    const s = getGuildSettings(interaction.guild.id);
    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# ⚙️ Server Settings'),
        new TextDisplayBuilder().setContent(`**Prefix:** ${s.prefix}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Log Channel:** ${s.logChannelId ? `<#${s.logChannelId}>` : 'Not set'}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Welcome:** ${s.welcomeChannelId ? `<#${s.welcomeChannelId}>` : 'Not set'}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Welcome Message:** ${s.welcomeMessage || 'Default'}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Goodbye:** ${s.goodbyeChannelId ? `<#${s.goodbyeChannelId}>` : 'Not set'}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Goodbye Message:** ${s.goodbyeMessage || 'Default'}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Auto Role:** ${s.autoRoleId ? `<@&${s.autoRoleId}>` : 'Not set'}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Mod Role:** ${s.modRoleId ? `<@&${s.modRoleId}>` : 'Not set'}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Mute Role:** ${s.muteRoleId ? `<@&${s.muteRoleId}>` : 'Not set'}`)
      );

    await safeRespond(interaction, { components: [container], flags: MessageFlags.IsComponentsV2 | 64 });
  },
};
