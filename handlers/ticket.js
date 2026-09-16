/** Mikasa — Ticket Handler */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, PermissionFlagsBits } = require('discord.js');

const { isStaffMember, applyTicketPermissionOverwrites } = require('../utils');
const ticketConfig = require('../ticket-config.json');
const projectTicket = require('../projectTicket');

/** Count open tickets in a guild */
function countOpenTickets(guild) {
  const categoryId = ticketConfig.TICKET_CATEGORY_ID;
  if (!categoryId) return 0;
  const category = guild.channels.cache.get(categoryId);
  if (!category) return 0;
  return category.children.cache.filter(ch => ch.name?.startsWith('🎫・')).size;
}

/** Handle close ticket button */
async function handleCloseTicket(interaction, client) {
  const channel = interaction.channel;
  const isStaff = isStaffMember(interaction.member);
  const channelOwner = channel.permissionOverwrites.cache.find(p => p.id === interaction.user.id && p.allow?.has(PermissionFlagsBits.ViewChannel));
  if (!isStaff && !channelOwner) {
    return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  }

  const messages = await channel.messages.fetch({ limit: 10 });
  const existingConfirmation = messages.find(m =>
    (m.content && m.content.includes((ticketConfig.MESSAGES.CONFIRM_CLOSE_PROMPT || '').split('**')[1] || '') && m.components.length > 0) ||
    (m.components?.length > 0 && hasButton(m.components, 'confirm_close'))
  );
  const existingControl = messages.find(m =>
    (m.content && m.content.includes((ticketConfig.MESSAGES.CLOSED_MESSAGE || '').split('@!')[0].trim()) && m.components.length > 0) ||
    (m.components?.length > 0 && hasButton(m.components, 'transcript_btn'))
  );

  if (existingConfirmation) { await interaction.reply({ content: ticketConfig.MESSAGES.CLOSE_ALREADY_OPEN, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {}); return; }
  if (existingControl) { await interaction.reply({ content: ticketConfig.MESSAGES.CLOSE_ALREADY_CLOSED, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {}); return; }

  await interaction.deferUpdate().catch(() => {});
  const closeConfirmComponents = [
    new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔒 ${ticketConfig.MESSAGES.CONFIRM_CLOSE_PROMPT}`))
      .addSectionComponents(
        new SectionBuilder().setButtonAccessory(new ButtonBuilder().setCustomId('confirm_close').setLabel('Close').setStyle(ButtonStyle.Danger)).addTextDisplayComponents(new TextDisplayBuilder().setContent('Permanently close this ticket')),
        new SectionBuilder().setButtonAccessory(new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)).addTextDisplayComponents(new TextDisplayBuilder().setContent('Keep the ticket open'))
      )
  ];
  await channel.send({ components: closeConfirmComponents, flags: MessageFlags.IsComponentsV2 });
}

/** Handle confirm close */
async function handleConfirmClose(interaction, client, logTicketAction, createTranscript, idleSystem) {
  const channel = interaction.channel;
  await interaction.deferUpdate().catch(() => {});

  const originalOwner = channel.permissionOverwrites.cache.find(p => p.allow?.has(PermissionFlagsBits.ViewChannel) && p.id !== channel.guild.id && p.id !== ticketConfig.STAFF_ROLE_ID && p.id !== ticketConfig.MANAGER_ROLE_ID);
  const originalOwnerMember = originalOwner ? interaction.guild.members.cache.get(originalOwner.id) : null;
  const closerId = interaction.user.id;

  await applyTicketPermissionOverwrites(channel, { staffRoleId: ticketConfig.STAFF_ROLE_ID, managerRoleId: ticketConfig.MANAGER_ROLE_ID, ownerId: originalOwner?.id ?? null, openOwner: false }).catch(e => console.error(e));
  await logTicketAction(client, 'CLOSED', interaction.user, channel, `Ticket locked by ${interaction.user.tag}`, '#000000');
  await interaction.message.delete().catch(() => {});

  const closedMessageContent = (ticketConfig.MESSAGES.CLOSED_MESSAGE || '').replace('{userTag}', interaction.user.tag);
  const closedComponents = [
    new ContainerBuilder()
      .setAccentColor(0xFFDD00)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(closedMessageContent))
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${ticketConfig.MESSAGES.CLOSED_EMBED_DESCRIPTION || 'Support Team Controls'}`))
      .addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('transcript_btn').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
        new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Refresh').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
      ))
  ];
  await channel.send({ components: closedComponents, flags: MessageFlags.IsComponentsV2 });
  idleSystem.untrackTicket(channel.id);

  try {
    const transcriptAttachment = await createTranscript(channel, { limit: -1, fileName: `${channel.name}_transcript.html` });
    const tcId = ticketConfig.TRANSCRIPT_CHANNEL_ID;
    if (tcId && tcId !== 'PLACE_YOUR_TRANSCRIPT_ARCHIVE_CHANNEL_ID_HERE') {
      const tc = interaction.guild.channels.cache.get(tcId);
      if (tc) {
        await tc.send({ components: [new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# 📄 Conversation Transcript Generated\n\nTranscript for ticket **${channel.name}** (Owned by ${originalOwner ? `<@${originalOwner.id}>` : 'Unspecified User'}) has been successfully archived.`),
          new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now()/1000)}:F>*`)
        )], flags: MessageFlags.IsComponentsV2 });
        await tc.send({ files: [transcriptAttachment] });
      }
    }
    if (originalOwnerMember) {
      try {
        await originalOwnerMember.send({ components: [new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# 📄 Your Ticket Transcript\n\nTranscript for **${channel.name}**`),
          new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now()/1000)}:F>*`)
        )], flags: MessageFlags.IsComponentsV2 }, { files: [transcriptAttachment] });
      } catch (e) { console.warn('Could not DM transcript:', e.message); }
    }
  } catch (e) { console.error('Transcript error:', e.message); }

  let hasRating = idleSystem.hasRatingBeenRequested(channel.id);
  if (!idleSystem.isTracked(channel.id)) {
    try {
      const msgs = await channel.messages.fetch({ limit: 50 });
      hasRating = msgs.some(m => m.content === '// RATING_REQUEST_SENT //' || m.components?.some(c => c.components?.some(cc => cc.type === 10 && cc.content?.includes('Service Rating'))));
    } catch (e) {}
  }

  if (!hasRating && originalOwnerMember) {
    const ratingRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`dm_rate_5_${channel.id}_${closerId}`).setLabel('⭐⭐⭐⭐⭐ (5)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`dm_rate_4_${channel.id}_${closerId}`).setLabel('⭐⭐⭐⭐ (4)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`dm_rate_3_${channel.id}_${closerId}`).setLabel('⭐⭐⭐ (3)').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`dm_rate_2_${channel.id}_${closerId}`).setLabel('⭐⭐ (2)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`dm_rate_1_${channel.id}_${closerId}`).setLabel('⭐ (1)').setStyle(ButtonStyle.Danger)
    );
    const dmContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ⭐ Service Rating\n\nHello! Your ticket **${channel.name}** has been closed by <@${closerId}>.\n\nPlease take a moment to rate your support experience.`),
      new TextDisplayBuilder().setContent(`*This is a private message and cannot be replied to | <t:${Math.floor(Date.now()/1000)}:F>*`)
    );
    try {
      dmContainer.addActionRowComponents(ratingRow);
      await originalOwnerMember.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
      idleSystem.markRatingRequested(channel.id);
      await channel.send({ content: '// RATING_REQUEST_SENT //' }).catch(e => console.error(e));
    } catch (e) {
      console.warn('Failed to DM rating; fallback:', e.message);
      const fbContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⚠️ Rating\n\n${ticketConfig.MESSAGES.DM_RATING_FALLBACK.replace('{userId}', originalOwnerMember.id)}`));
      await channel.send({ components: [fbContainer, dmContainer], flags: MessageFlags.IsComponentsV2 }).catch(e => console.error(e));
    }
  }
}

/** Handle delete ticket */
async function handleDeleteTicket(interaction, client, logTicketAction) {
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  await logTicketAction(client, 'DELETED', interaction.user, interaction.channel, `Ticket deleted by ${interaction.user.tag}.`, '#E74C3C');
  await interaction.reply({ content: ticketConfig.MESSAGES.DELETE_TICKET_PROMPT, flags: MessageFlags.HTTP_NO_CONTENT });
  await interaction.channel.delete().catch(e => console.error(e));
}

/** Handle reopen ticket */
async function handleReopenTicket(interaction, client, idleSystem, logTicketAction) {
  const channel = interaction.channel;
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});

  const originalOwner = channel.permissionOverwrites.cache.find(p => {
    if (!p) return false;
    if (p.id === channel.guild.id || p.id === ticketConfig.STAFF_ROLE_ID || p.id === ticketConfig.MANAGER_ROLE_ID) return false;
    if (channel.guild.roles.cache.has(p.id)) return false;
    return true;
  });
  const originalOwnerID = originalOwner?.id ?? null;

  const newChannelName = channel.name.replace(/・claim-.*$/i, '');
  try { await channel.setName(newChannelName); } catch (e) { console.error(e); }

  if (originalOwnerID) {
    await applyTicketPermissionOverwrites(channel, { staffRoleId: ticketConfig.STAFF_ROLE_ID, managerRoleId: ticketConfig.MANAGER_ROLE_ID, ownerId: originalOwnerID, openOwner: true }).catch(e => console.error(e));
  } else {
    await interaction.followUp({ content: ticketConfig.MESSAGES.REOPEN_WARNING_NO_OWNER, flags: MessageFlags.HTTP_NO_CONTENT });
  }

  idleSystem.trackTicket(channel.id);
  await logTicketAction(client, 'REOPENED', interaction.user, channel, `Ticket reopened by ${interaction.user.tag}`, '#2ECC71');
  const reopenContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔓 Ticket Reopened\n\n${(ticketConfig.MESSAGES.REOPEN_SUCCESS || '').replace('{user}', `<@${interaction.user.id}>`)}`));
  await interaction.reply({ components: [reopenContainer], flags: MessageFlags.IsComponentsV2 });
  await interaction.message.delete().catch(() => {});
}

/** Handle transcript button */
async function handleTranscript(interaction, client, logTicketAction, createTranscript) {
  const channel = interaction.channel;
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  const tcId = ticketConfig.TRANSCRIPT_CHANNEL_ID;
  if (!tcId || tcId === 'PLACE_YOUR_TRANSCRIPT_ARCHIVE_CHANNEL_ID_HERE') return interaction.reply({ content: ticketConfig.MESSAGES.TRANSCRIPT_CONFIG_ERROR, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});

  await interaction.deferReply({ flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  try {
    const attachment = await createTranscript(channel, { limit: -1, fileName: `${channel.name}_transcript.html` });
    const tc = interaction.guild.channels.cache.get(tcId);
    if (!tc) return interaction.editReply({ content: ticketConfig.MESSAGES.TRANSCRIPT_CHANNEL_NOT_FOUND, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});

    const originalOwner = channel.permissionOverwrites.cache.find(p => {
      if (!p) return false;
      if (p.id === channel.guild.id || p.id === ticketConfig.STAFF_ROLE_ID || p.id === ticketConfig.MANAGER_ROLE_ID) return false;
      if (channel.guild.roles.cache.has(p.id)) return false;
      return true;
    });
    const ticketUserTag = originalOwner ? `<@${originalOwner.id}>` : 'Unspecified User';

    const transcriptContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${ticketConfig.MESSAGES.TRANSCRIPT_SUCCESS_TITLE}\n\n${(ticketConfig.MESSAGES.TRANSCRIPT_SUCCESS_DESCRIPTION || '').replace('{channelName}', channel.name).replace('{userTag}', ticketUserTag)}`),
      new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now()/1000)}:F>*`)
    );
    await tc.send({ components: [transcriptContainer], flags: MessageFlags.IsComponentsV2 });
    await tc.send({ files: [attachment] });

    if (originalOwner) {
      try {
        const ticketUser = await client.users.fetch(originalOwner.id);
        const userTranscriptContainer = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# 📄 Your Ticket Transcript\n\nTranscript for **${channel.name}**`),
          new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now()/1000)}:F>*`)
        );
        await ticketUser.send({ components: [userTranscriptContainer], flags: MessageFlags.IsComponentsV2 });
        await ticketUser.send({ files: [attachment] });
      } catch (e) { console.warn('Could not DM transcript:', e.message); }
    }

    await logTicketAction(client, 'TRANSCRIPT', interaction.user, channel, `Transcript sent to <#${tcId}> and ${ticketUserTag}`, '#FFDD00');
    await interaction.editReply({ content: `${ticketConfig.MESSAGES.TRANSCRIPT_SUCCESS_STAFF_REPLY.replace('{channelId}', tcId)} (also sent to ${ticketUserTag})`, flags: MessageFlags.HTTP_NO_CONTENT });

    const container = interaction.message.components[0];
    const json = JSON.parse(JSON.stringify(container));
    const actionRow = json.components?.find(c => c.type === 1);
    if (actionRow?.components?.[0]) actionRow.components[0].disabled = true;
    await interaction.message.edit({ components: [new ContainerBuilder(json)], flags: MessageFlags.IsComponentsV2 });
  } catch (e) {
    console.error('Transcript error:', e.message);
    await interaction.editReply({ content: ticketConfig.MESSAGES.TRANSCRIPT_ERROR, flags: MessageFlags.HTTP_NO_CONTENT });
  }
}

/** Handle claim ticket */
async function handleClaimTicket(interaction, client, idleSystem, logTicketAction) {
  const channel = interaction.channel;
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.CLAIM_STAFF_ONLY, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});

  const messages = await channel.messages.fetch({ limit: 10 });
  const existingClaim = messages.find(m => m.components?.length > 0 && m.components[0]?.components?.some(c => c.type === 10 && c.content?.includes((ticketConfig.MESSAGES.CLAIM_SUCCESS_TITLE || '').split('✅')[1] || '')));
  if (existingClaim) { await interaction.reply({ content: ticketConfig.MESSAGES.CLAIM_ALREADY_CLAIMED, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {}); return; }

  const welcomeMsg = messages.find(m => m.components.length > 0 && hasButton(m.components, 'claim_ticket'));
  if (welcomeMsg) {
    const container = welcomeMsg.components[0];
    const json = JSON.parse(JSON.stringify(container));
    const actionRow = json.components?.find(c => c.type === 1);
    if (actionRow?.components?.[0]) {
      actionRow.components[0].custom_id = 'unclaim_ticket';
      actionRow.components[0].label = 'Unclaim';
      actionRow.components[0].style = 1;
      actionRow.components[0].emoji = { name: '🙋‍♂️' };
      actionRow.components[0].disabled = false;
    }
    await welcomeMsg.edit({ components: [new ContainerBuilder(json)], flags: MessageFlags.IsComponentsV2 });
  }

  const claimDesc = (ticketConfig.MESSAGES.CLAIM_SUCCESS_DESCRIPTION || '').replace('{user}', interaction.user);
  await channel.send({ components: [new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent(`${ticketConfig.MESSAGES.CLAIM_SUCCESS_TITLE || ''}\n\n${claimDesc}`))], flags: MessageFlags.IsComponentsV2 });
  await logTicketAction(client, 'CLAIMED', interaction.user, channel, `Ticket claimed by ${interaction.user.tag}`, '#FFDD00');
  await interaction.deferUpdate().catch(() => {});
}

/** Handle unclaim ticket */
async function handleUnclaimTicket(interaction, client, idleSystem, logTicketAction) {
  const channel = interaction.channel;
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.CLAIM_STAFF_ONLY, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});

  const messages = await channel.messages.fetch({ limit: 10 });
  const claimMsg = messages.find(m => m.components?.length > 0 && m.components[0]?.components?.some(c => c.type === 10 && c.content?.includes((ticketConfig.MESSAGES.CLAIM_SUCCESS_TITLE || '').split('✅')[1] || '')));
  if (claimMsg) await claimMsg.delete().catch(() => {});

  const welcomeMsg = messages.find(m => m.components.length > 0 && hasButton(m.components, 'unclaim_ticket'));
  if (welcomeMsg) {
    const container = welcomeMsg.components[0];
    const json = JSON.parse(JSON.stringify(container));
    const actionRow = json.components?.find(c => c.type === 1);
    if (actionRow?.components?.[0]) {
      actionRow.components[0].custom_id = 'claim_ticket';
      actionRow.components[0].label = 'Claim';
      actionRow.components[0].style = 3;
      actionRow.components[0].emoji = { name: '🙋‍♂️' };
      actionRow.components[0].disabled = false;
    }
    await welcomeMsg.edit({ components: [new ContainerBuilder(json)], flags: MessageFlags.IsComponentsV2 });
  }

  await logTicketAction(client, 'UNCLAIMED', interaction.user, channel, `Ticket unclaimed by ${interaction.user.tag}`, '#FFDD00');
  await interaction.deferUpdate().catch(() => {});
}

/** Check for a button in components tree */
function hasButton(components, customId) {
  if (!Array.isArray(components)) return false;
  for (const c of components) {
    if (c.type === 2 && c.customId === customId) return true;
    if (c.components && hasButton(c.components, customId)) return true;
  }
  return false;
}

/** Delegate legacy project accept */
async function handleProjectAccept(interaction, client) {
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  return projectTicket.handleProjectAccept(interaction, client);
}

/** Delegate legacy project decline */
async function handleProjectDecline(interaction, client) {
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  return projectTicket.handleProjectDecline(interaction, client);
}

/** Delegate legacy decline reason */
async function handleDeclineReasonSubmit(interaction, client) {
  if (!isStaffMember(interaction.member)) return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: MessageFlags.HTTP_NO_CONTENT }).catch(() => {});
  return projectTicket.handleDeclineReasonSubmit(interaction, client);
}

/** Delegate legacy project type select */
async function handleProjectTypeSelect(interaction, client) {
  // Backward compat: project_type_select is handled by projectTicket
  const { handleProjectTypeSelect: ptSelect } = require('../projectTicket');
  return ptSelect?.(interaction, client);
}

module.exports = {
  handleCloseTicket,
  handleConfirmClose,
  handleDeleteTicket,
  handleReopenTicket,
  handleTranscript,
  handleClaimTicket,
  handleUnclaimTicket,
  handleProjectAccept,
  handleProjectDecline,
  handleDeclineReasonSubmit,
  handleProjectTypeSelect,
  countOpenTickets,
  hasButton,
};
