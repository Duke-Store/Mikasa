const { ActionRowBuilder, ButtonBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const config = require('./ticket-config.json');
const { logTicketRating } = require('./ticketLogger');

async function handleRatingInteraction(client, interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('dm_rate_')) return false;

  await interaction.deferUpdate().catch(() => {});

  const parts = interaction.customId.split('_');
  const rating = parseInt(parts[2]);
  const channelId = parts[3];
  const closerId = parts[4];

  const rater = interaction.user;
  const message = interaction.message;

  const guild = client.guilds.cache.get(config.GUILD_ID) || client.guilds.cache.find(g => g.channels.cache.has(channelId));
  if (!guild) return interaction.followUp({ content: '❌ An error occurred: Server not found (Check GUILD_ID).', flags: 64 });

  const channel = guild.channels.cache.get(channelId);
  const closerMember = guild.members.cache.get(closerId);
  if (!channel || !closerMember) return interaction.followUp({ content: '❌ Rating data error: Ticket channel or staff member not found. Rating cancelled.', flags: 64 });

  const closer = closerMember.user;
  const starDisplay = '⭐'.repeat(rating);

  try {
    await logTicketRating(client, rating, rater, channel, closer);

    const actionRowData = message.components[0].components?.find(c => c.type === 1);
    const disabledRow = ActionRowBuilder.from(actionRowData).setComponents(
      actionRowData.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
    );

    const confirmationContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ✅ Thank You!\n\nYour rating of ${starDisplay} (${rating}/5) for ticket **${channel.name}** has been successfully recorded.`)
    );

    await message.edit({ components: [confirmationContainer, disabledRow], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to edit rating message:', err));
  } catch (error) {
    console.error('Failed to process rating interaction:', error);
    await interaction.followUp({ content: '❌ An error occurred while recording your rating.', flags: 64 });
  }

  return true;
}

module.exports = { handleRatingInteraction };
