const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addAdmin } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'addadmin',
  description: 'Add a user to the admin list for auto-ratings',
  aliases: ['add-admin'],
  usage: '<@user>',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!target) {
      return message.reply('⚠️ Please mention a user or provide a user ID.');
    }

    if (target.bot) {
      return message.reply('⚠️ Bots cannot be added as admins.');
    }

    const added = addAdmin(message.guild.id, target.id, target.username);
    if (!added) {
      return message.reply(`⚠️ <@${target.id}> is already in the admin list.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('✅ Admin Added')
      .setDescription(`<@${target.id}> has been added to the admin list.`)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
