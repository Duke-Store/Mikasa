const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('pro.db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enable')
    .setDescription('Enable server protection features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Select the protection type to enable')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Spam', value: 'antispam' },
          { name: 'Anti-Raid', value: 'antiraid' },
          { name: 'Anti-Scam', value: 'antiscam' },
          { name: 'Anti-Links', value: 'antilink' },
          { name: 'Anti-Channel Delete', value: 'antichandeldelete' },
          { name: 'Anti-Channel Create', value: 'antichanelcreate' },
          { name: 'Anti-Channel Edit', value: 'antichanneledit' },
          { name: 'Anti-Role Create', value: 'antirolecreate' },
          { name: 'Anti-Role Delete', value: 'antiroledelete' },
          { name: 'Anti-Role Edit', value: 'antiroleedit' },
          { name: 'Anti-Admin Grant', value: 'antiadmingrant' },
          { name: 'Anti-Ban', value: 'antiban' },
          { name: 'Anti-Kick', value: 'antikick' }
        )
    ),
  async execute(interaction, client) {
    const choice = interaction.options.getString('choice');
    let title, description, color;

    switch (choice) {
      case 'antispam':
        title = 'Anti-Spam Enabled';
        description = 'Spam protection has been activated for this server.';
        color = 0x00FF00;
        db.set(`${interaction.guild.id}_antispam`, true);
        break;
      case 'antiraid':
        title = 'Anti-Raid Enabled';
        description = 'Raid protection has been activated for this server.';
        color = 0xFF0000;
        db.set(`${interaction.guild.id}_antiraid`, true);
        break;
      case 'antiscam':
        title = 'Anti-Scam Enabled';
        description = 'Scam protection has been activated for this server.';
        color = 0xFFFF00;
        db.set(`${interaction.guild.id}_antiscam`, true);
        break;
      case 'antilink':
        title = 'Anti-Links Enabled';
        description = 'Link protection has been activated for this server.';
        color = 0x0000FF;
        db.set(`${interaction.guild.id}_antilink`, true);
        break;
      case 'antichandeldelete':
        title = 'Anti-Channel Delete Enabled';
        description = 'Protection against channel deletion has been activated.';
        color = 0x800080;
        db.set(`${interaction.guild.id}_antichandeldelete`, true);
        break;
      case 'antichanelcreate':
        title = 'Anti-Channel Create Enabled';
        description = 'Protection against unauthorized channel creation has been activated.';
        color = 0xFFA500;
        db.set(`${interaction.guild.id}_antichanelcreate`, true);
        break;
      case 'antichanneledit':
        title = 'Anti-Channel Edit Enabled';
        description = 'Protection against unauthorized channel edits has been activated.';
        color = 0x008080;
        db.set(`${interaction.guild.id}_antichanneledit`, true);
        break;
      case 'antirolecreate':
        title = 'Anti-Role Create Enabled';
        description = 'Protection against unauthorized role creation has been activated.';
        color = 0x1E90FF;
        db.set(`${interaction.guild.id}_antirolecreate`, true);
        break;
      case 'antiroledelete':
        title = 'Anti-Role Delete Enabled';
        description = 'Protection against role deletion has been activated.';
        color = 0xDC143C;
        db.set(`${interaction.guild.id}_antiroledelete`, true);
        break;
      case 'antiroleedit':
        title = 'Anti-Role Edit Enabled';
        description = 'Protection against unauthorized role edits has been activated.';
        color = 0x32CD32;
        db.set(`${interaction.guild.id}_antiroleedit`, true);
        break;
      case 'antiadmingrant':
        title = 'Anti-Admin Grant Enabled';
        description = 'Protection against unauthorized granting of administrator roles has been activated.';
        color = 0x8B0000;
        db.set(`${interaction.guild.id}_antiadmingrant`, true);
        break;
      case 'antiban':
        title = 'Anti-Ban Enabled';
        description = 'Protection against unauthorized bans has been activated.';
        color = 0x4B0082;
        db.set(`${interaction.guild.id}_antiban`, true);
        break;
      case 'antikick':
        title = 'Anti-Kick Enabled';
        description = 'Protection against unauthorized kicks has been activated.';
        color = 0xFFD700;
        db.set(`${interaction.guild.id}_antikick`, true);
        break;
      default:
        title = 'Invalid Choice';
        description = 'Please select a valid protection type.';
        color = 0xFF0000;
    }

    const container = new ContainerBuilder()
      .setAccentColor(color)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${title}\n\n${description}`),
        new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`),
        new TextDisplayBuilder().setContent(`*Requested by ${interaction.user.tag}*`)
      );

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
