const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlimted')
    .setDescription('Set limits for protection features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('feature')
        .setDescription('Select the protection feature to set limits for')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Spam', value: 'antispam' },
          { name: 'Anti-Channel Edit', value: 'antichanneledit' },
          { name: 'Anti-Channel Create', value: 'antichannelcreate' },
          { name: 'Anti-Channel Delete', value: 'antichanneldelete' },
          { name: 'Anti-Role Edit', value: 'antiroleedit' },
          { name: 'Anti-Role Create', value: 'antirolecreate' },
          { name: 'Anti-Role Delete', value: 'antiroledelete' },
          { name: 'Anti-Kick', value: 'antikick' },
          { name: 'Anti-Ban', value: 'antiban' }
        )
    )
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Set the limit (number of actions before triggering)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  async execute(interaction, client) {
    const feature = interaction.options.getString('feature');
    const limit = interaction.options.getInteger('limit');

    let title, description, dbKey;
    const guildId = interaction.guild.id;

    switch (feature) {
      case 'antispam':
        title = 'Anti-Spam Limit Set';
        description = `Spam protection will now trigger after ${limit} messages.`;
        dbKey = `${guildId}_antispam_limit`;
        break;
      case 'antichanneledit':
        title = 'Anti-Channel Edit Limit Set';
        description = `Channel edit protection will now trigger after ${limit} edits.`;
        dbKey = `${guildId}_antichanneledit_limit`;
        break;
      case 'antichannelcreate':
        title = 'Anti-Channel Create Limit Set';
        description = `Channel creation protection will now trigger after ${limit} creations.`;
        dbKey = `${guildId}_antichannelcreate_limit`;
        break;
      case 'antichanneldelete':
        title = 'Anti-Channel Delete Limit Set';
        description = `Channel deletion protection will now trigger after ${limit} deletions.`;
        dbKey = `${guildId}_antichanneldelete_limit`;
        break;
      case 'antiroleedit':
        title = 'Anti-Role Edit Limit Set';
        description = `Role edit protection will now trigger after ${limit} edits.`;
        dbKey = `${guildId}_antiroleedit_limit`;
        break;
      case 'antirolecreate':
        title = 'Anti-Role Create Limit Set';
        description = `Role creation protection will now trigger after ${limit} creations.`;
        dbKey = `${guildId}_antirolecreate_limit`;
        break;
      case 'antiroledelete':
        title = 'Anti-Role Delete Limit Set';
        description = `Role deletion protection will now trigger after ${limit} deletions.`;
        dbKey = `${guildId}_antiroledelete_limit`;
        break;
      case 'antikick':
        title = 'Anti-Kick Limit Set';
        description = `Kick protection will now trigger after ${limit} kicks.`;
        dbKey = `${guildId}_antikick_limit`;
        break;
      case 'antiban':
        title = 'Anti-Ban Limit Set';
        description = `Ban protection will now trigger after ${limit} bans.`;
        dbKey = `${guildId}_antiban_limit`;
        break;
    }

    await db.set(dbKey, limit);

    const container = new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${title}\n\n${description}`),
        new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
