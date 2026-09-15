const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Show information about this server'),
  async execute(interaction, client) {
    const g = interaction.guild;
    const botCount = g.members.cache.filter(m => m.user.bot).size;
    const humanCount = g.memberCount - botCount;

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Server Information: ${g.name}\n\n<t:${Math.floor(Date.now() / 1000)}:F>`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**👑 Owner:** <@${g.ownerId}>`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**📅 Created At:** <t:${Math.floor(g.createdTimestamp / 1000)}:R>`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**👥 Members:** Total: ${g.memberCount} | Humans: ${humanCount} | Bots: ${botCount}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**📺 Rooms:** ${g.channels.cache.size}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**🎭 Roles:** ${g.roles.cache.size}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`*Server ID: ${g.id}*`)
      );
    if (g.iconURL({ dynamic: true, size: 512 })) {
      container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(g.iconURL({ dynamic: true, size: 512 }))));
    }
    if (g.bannerURL({ dynamic: true, size: 1024 })) {
      container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(g.bannerURL({ dynamic: true, size: 1024 }))));
    }

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
