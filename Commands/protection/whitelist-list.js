const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist-list')
    .setDescription('Display the list of users allowed in the whitelist')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('feature')
        .setDescription('The protection feature to display its whitelist')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Links', value: 'antilink' },
          { name: 'Anti-Channel Delete', value: 'antichanneldelete' },
          { name: 'Anti-Channel Create', value: 'antichannelcreate' },
          { name: 'Anti-Channel Edit', value: 'antichanneledit' },
          { name: 'Anti-Role Create', value: 'antirolecreate' },
          { name: 'Anti-Role Delete', value: 'antiroledelete' },
          { name: 'Anti-Role Edit', value: 'antiroleedit' },
          { name: 'Anti-Admin Grant', value: 'antiadmingrant' },
          { name: 'Anti-Kick', value: 'antikick' },
          { name: 'Anti-Ban', value: 'antiban' },
          { name: 'Anti-Spam', value: 'antispam' },
          { name: 'Anti-Raid', value: 'antiraid' },
          { name: 'Anti-Scam', value: 'antiscam' }
        )
    ),
  async execute(interaction, client) {
    const feature = interaction.options.getString('feature');
    const guildId = interaction.guild.id;

    const whitelistKey = `${guildId}_${feature}_whitelist`;
    const whitelist = await db.get(whitelistKey) || [];

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${feature} Whitelist`));

    if (whitelist.length > 0) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent('List of whitelisted users:'));
      const userList = await Promise.all(whitelist.map(async (userId) => {
        try {
          const user = await client.users.fetch(userId);
          return `${user} (${userId})`;
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          return `Unknown User (${userId})`;
        }
      }));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Users**\n${userList.join('\n')}`));
    } else {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent('No users in the whitelist.'));
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`));

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
