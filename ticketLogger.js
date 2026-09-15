const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const config = require('./ticket-config.json');

async function logTicketAction(client, action, user, channel, details = '', color = '#3498DB') {
  const logsChannelId = config.LOGS_CHANNEL_ID;
  if (!logsChannelId || logsChannelId === 'YOUR_TICKET_LOGS_CHANNEL_ID') return;

  const logChannel = client.channels.cache.get(logsChannelId);
  if (!logChannel) return;

  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(details ? `# [${action}] | ${channel.name}\n\n${details}` : `# [${action}] | ${channel.name}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**👤 Performed By:** ${user.tag} (${user.id})\n**📍 Ticket Channel:** <#${channel.id}>\n**⏰ Date/Time:** <t:${Math.floor(Date.now() / 1000)}:F>`),
      new TextDisplayBuilder().setContent(`*Action ID: ${action}*`)
    );

  await logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send general action log:', err));
}

async function logTicketRating(client, rating, rater, channel, closer) {
  const ratingChannelId = config.RATING_CHANNEL_ID;
  const starEmoji = '⭐'.repeat(rating);
  if (!ratingChannelId || ratingChannelId === 'YOUR_TICKET_RATING_CHANNEL_ID') return;

  const logChannel = client.channels.cache.get(ratingChannelId);
  if (!logChannel) return;

  const colorValue = 0xFFDD00;
  const container = new ContainerBuilder()
    .setAccentColor(colorValue)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ⭐ New Rating for ${channel.name}\n\n**${starEmoji} (${rating}/5)**`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**👤 Rated By:** ${rater.tag} (${rater.id})\n**🧑‍💻 Closed By:** ${closer.tag} (${closer.id})\n**📍 Ticket Link:** [Jump to Ticket](https://discord.com/channels/${channel.guild.id}/${channel.id})`),
      new TextDisplayBuilder().setContent(`*Rater ID: ${rater.id}*`)
    );

  await logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send rating log:', err));
}

module.exports = { logTicketAction, logTicketRating };
