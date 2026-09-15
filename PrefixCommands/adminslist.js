const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAdmins } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'adminslist',
  description: 'Show the list of admins for auto-ratings',
  aliases: ['admins-list', 'adminlist'],
  usage: '',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(message, args, client) {
    const admins = getAdmins(message.guild.id);

    if (admins.length === 0) {
      return message.reply('📋 No admins configured. Use `addadmin` to add one.');
    }

    const list = admins.map((a, i) => `${i + 1}. <@${a.id}> (\`${a.username}\`)`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📋 Admin List')
      .setDescription(list)
      .setFooter({ text: `${admins.length} admin(s) total` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
