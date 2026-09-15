const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getRatingStatus, getRandomMember, buildRatingEmbed } = require('../ratingSystem/autoRating');

module.exports = {
  name: 'sendmassratings',
  description: 'Send multiple random ratings to the configured channel (max 100)',
  aliases: ['send-mass-ratings', 'massratings'],
  usage: '<count>',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 10,
  async execute(message, args, client) {
    const status = getRatingStatus(message.guild.id);
    if (!status) {
      return message.reply('⚠️ No rating channel configured. Use `setratingchannel` first.');
    }

    const count = parseInt(args[0], 10);
    if (!count || isNaN(count) || count < 1 || count > 100) {
      return message.reply('⚠️ Please provide a number between 1 and 100.');
    }

    const channel = message.guild.channels.cache.get(status.channelId);
    if (!channel) {
      return message.reply('⚠️ Configured channel not found. Was it deleted?');
    }

    const statusMsg = await message.reply(`📨 Sending **${count}** ratings...`);

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const member = await getRandomMember(message.guild);
        if (!member) {
          failed++;
          continue;
        }
        const embed = buildRatingEmbed(member);
        await channel.send({ embeds: [embed] });
        sent++;
      } catch (err) {
        failed++;
        if (errors.length < 3) errors.push(err.message);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(sent > 0 ? 0x2ECC71 : 0xE74C3C)
      .setTitle('📨 Mass Ratings Complete')
      .setDescription(`Requested: **${count}**\nSent: **${sent}**\nFailed: **${failed}**`)
      .setTimestamp();

    if (errors.length > 0) {
      embed.addFields({ name: 'Errors', value: errors.map(e => `\`${e}\``).join('\n') });
    }

    await statusMsg.edit({ content: null, embeds: [embed] });
  },
};
