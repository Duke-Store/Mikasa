const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { removeAdmin } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'removeadmin',
  description: 'Remove a user from the admin list for auto-ratings',
  aliases: ['remove-admin'],
  usage: '<@user>',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) {
      return message.reply('⚠️ Please mention a user or provide a user ID.');
    }

    const removed = removeAdmin(message.guild.id, target.id);
    if (!removed) {
      return message.reply(`⚠️ <@${target.id}> is not in the admin list.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('✅ Admin Removed')
      .setDescription(`<@${target.id}> has been removed from the admin list.`)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
