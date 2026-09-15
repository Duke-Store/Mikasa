const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage whitelist for protection features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Add or remove from whitelist')
        .setRequired(true)
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' }
        )
    )
    .addStringOption(option =>
      option.setName('feature')
        .setDescription('The protection feature to whitelist for')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Spam', value: 'antispam' },
          { name: 'Anti-Raid', value: 'antiraid' },
          { name: 'Anti-Scam', value: 'antiscam' },
          { name: 'Anti-Links', value: 'antilink' },
          { name: 'Anti-Channel Delete', value: 'antichanneldelete' },
          { name: 'Anti-Channel Create', value: 'antichannelcreate' },
          { name: 'Anti-Channel Edit', value: 'antichanneledit' },
          { name: 'Anti-Role Create', value: 'antirolecreate' },
          { name: 'Anti-Role Delete', value: 'antiroledelete' },
          { name: 'Anti-Role Edit', value: 'antiroleedit' },
          { name: 'Anti-Admin Grant', value: 'antiadmingrant' },
          { name: 'Anti-Kick', value: 'antikick' },
          { name: 'Anti-Ban', value: 'antiban' }
        )
    )
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to whitelist/unwhitelist')
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const action = interaction.options.getString('action');
    const feature = interaction.options.getString('feature');
    const user = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    const whitelistKey = `${guildId}_${feature}_whitelist`;
    let whitelist = await db.get(whitelistKey) || [];

    if (action === 'add') {
      if (whitelist.includes(user.id)) {
        return interaction.reply({ content: `❌ This user is already whitelisted for ${feature}.`, flags: 64 });
      }
      whitelist.push(user.id);
      await db.set(whitelistKey, whitelist);

      const container = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ⚪ ${feature} Whitelist Updated\n\n${user.tag} has been added to the ${feature} whitelist.`),
          new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
        );

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else if (action === 'remove') {
      if (!whitelist.includes(user.id)) {
        return interaction.reply({ content: `❌ This user is not in the ${feature} whitelist.`, flags: 64 });
      }
      whitelist = whitelist.filter(id => id !== user.id);
      await db.set(whitelistKey, whitelist);

      const container = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ⚪ ${feature} Whitelist Updated\n\n${user.tag} has been removed from the ${feature} whitelist.`),
          new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
        );

      await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
