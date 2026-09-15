const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'reviews',
  description: 'Show auto-rating commands and status',
  aliases: ['ratingcommands', 'r'],
  usage: '',
  cooldown: 3,
  async execute(message, args, client) {
    const { getGuildSettings } = require('../utils');
    const prefix = getGuildSettings(message.guild.id).prefix || '!';

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📋 Auto-Rating Commands')
      .setDescription(`Use \`${prefix}reviews <command>\` for details on a specific command.`)
      .addFields(
        { name: `${prefix}setratingchannel <#channel>`, value: 'Set the auto-rating channel', inline: false },
        { name: `${prefix}stopratings`, value: 'Stop auto-ratings in this server', inline: false },
        { name: `${prefix}ratingstatus`, value: 'Check auto-rating configuration', inline: false },
        { name: `${prefix}sendrating`, value: 'Manually send a rating now', inline: false },
        { name: `${prefix}addadmin <@user>`, value: 'Add a user to the admin list', inline: false },
        { name: `${prefix}removeadmin <@user>`, value: 'Remove a user from the admin list', inline: false },
        { name: `${prefix}adminslist`, value: 'Show the admin list', inline: false },
        { name: `${prefix}sendmassratings <count>`, value: 'Send multiple random ratings (max 100)', inline: false },
      )
      .setFooter({ text: `${prefix}reviews <command> for details` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
