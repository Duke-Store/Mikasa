const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disable')
    .setDescription('Disable protection features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('feature')
        .setDescription('Select the protection feature to disable')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Link', value: 'antilink' },
          { name: 'Anti-Spam', value: 'antispam' },
          { name: 'Anti-Scam', value: 'antiscam' },
          { name: 'Anti-Raid', value: 'antiraid' },
          { name: 'Anti-Channel Delete', value: 'antichandeldelete' },
          { name: 'Anti-Channel Create', value: 'antichanelcreate' },
          { name: 'Anti-Channel Edit', value: 'antichanneledit' },
          { name: 'Anti-Role Create', value: 'antirolecreate' },
          { name: 'Anti-Role Delete', value: 'antiroledelete' },
          { name: 'Anti-Role Edit', value: 'antiroleedit' },
          { name: 'Anti-Admin Grant', value: 'antiadmingrant' },
          { name: 'Anti-Kick', value: 'antikick' },
          { name: 'Anti-Ban', value: 'antiban' }
        )
    ),
  async execute(interaction, client) {
    const feature = interaction.options.getString('feature');
    let title, description, color;

    switch (feature) {
      case 'antilink':
        title = 'Anti-Link Disabled';
        description = 'Link protection has been deactivated.';
        color = 0xFF0000;
        db.delete(`${interaction.guild.id}_antilink`);
        break;
      case 'antispam':
        title = 'Anti-Spam Disabled';
        description = 'Spam protection has been deactivated.';
        color = 0xFF4500;
        db.delete(`${interaction.guild.id}_antispam`);
        break;
      case 'antiscam':
        title = 'Anti-Scam Disabled';
        description = 'Scam protection has been deactivated.';
        color = 0xFFFF00;
        db.delete(`${interaction.guild.id}_antiscam`);
        break;
      case 'antiraid':
        title = 'Anti-Raid Disabled';
        description = 'Raid protection has been deactivated.';
        color = 0x0000FF;
        db.delete(`${interaction.guild.id}_antiraid`);
        break;
      case 'antichandeldelete':
        title = 'Anti-Channel Delete Disabled';
        description = 'Protection against channel deletion has been deactivated.';
        color = 0x800080;
        db.delete(`${interaction.guild.id}_antichandeldelete`);
        break;
      case 'antichanelcreate':
        title = 'Anti-Channel Create Disabled';
        description = 'Protection against unauthorized channel creation has been deactivated.';
        color = 0xFFA500;
        db.delete(`${interaction.guild.id}_antichanelcreate`);
        break;
      case 'antichanneledit':
        title = 'Anti-Channel Edit Disabled';
        description = 'Protection against unauthorized channel edits has been deactivated.';
        color = 0x008080;
        db.delete(`${interaction.guild.id}_antichanneledit`);
        break;
      case 'antirolecreate':
        title = 'Anti-Role Create Disabled';
        description = 'Protection against unauthorized role creation has been deactivated.';
        color = 0x1E90FF;
        db.delete(`${interaction.guild.id}_antirolecreate`);
        break;
      case 'antiroledelete':
        title = 'Anti-Role Delete Disabled';
        description = 'Protection against role deletion has been deactivated.';
        color = 0xDC143C;
        db.delete(`${interaction.guild.id}_antiroledelete`);
        break;
      case 'antiroleedit':
        title = 'Anti-Role Edit Disabled';
        description = 'Protection against unauthorized role edits has been deactivated.';
        color = 0x32CD32;
        db.delete(`${interaction.guild.id}_antiroleedit`);
        break;
      case 'antiadmingrant':
        title = 'Anti-Admin Grant Disabled';
        description = 'Protection against unauthorized administrator role grants has been deactivated.';
        color = 0xFFD700;
        db.delete(`${interaction.guild.id}_antiadmingrant`);
        break;
      case 'antikick':
        title = 'Anti-Kick Disabled';
        description = 'Protection against unauthorized kicks has been deactivated.';
        color = 0xA52A2A;
        db.delete(`${interaction.guild.id}_antikick`);
        break;
      case 'antiban':
        title = 'Anti-Ban Disabled';
        description = 'Protection against unauthorized bans has been deactivated.';
        color = 0x8B0000;
        db.delete(`${interaction.guild.id}_antiban`);
        break;
    }

    const container = new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${title}\n\n${description}`),
        new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
