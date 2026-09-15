const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a user')
    .addUserOption((o) => o.setName('user').setDescription('User (defaults to you)').setRequired(false)),
  async execute(interaction, client) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member =
      interaction.guild.members.cache.get(user.id) ||
      (await interaction.guild.members.fetch(user.id).catch(() => null));

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 👤 ${user.tag}`));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**ID:** ${user.id}`));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Created:** ${user.createdAt.toLocaleString()}`));
    if (member) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Joined:** ${member.joinedAt?.toLocaleString() || 'Unknown'}`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Roles [${member.roles.cache.filter(r => r.id !== interaction.guild.id).size}]:** ${member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(', ') || 'None'}`));
    }
    container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(user.displayAvatarURL())));
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
