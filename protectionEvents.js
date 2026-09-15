const { AuditLogEvent, PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { proDbGet } = require('./db');
const db = { get: async (key) => proDbGet(key) };

const userMessagesByGuild = new Map();
const userWarningsByGuild = new Map();
const rateCounters = new Map();

function getRateCounter(key) {
  const now = Date.now();
  const entry = rateCounters.get(key);
  if (!entry || now - entry.resetAt > 600000) {
    const newEntry = { count: 0, resetAt: now + 600000 };
    rateCounters.set(key, newEntry);
    return newEntry;
  }
  return entry;
}

function incrementRateCounter(key) {
  const entry = getRateCounter(key);
  entry.count++;
  return entry.count;
}

async function sendProtectionLog(guild, logChannelId, title, fields) {
  if (!logChannelId) return;
  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# Log (Protection)\n\n${title}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(fields),
      new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
    );
  logChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(console.error);
}

async function applyPunishment(member, punishmentAction) {
  if (!member) return;
  switch (punishmentAction) {
    case 'removeroles':
      await member.roles.remove(member.roles.cache).catch(console.error);
      break;
    case 'kick':
      await member.kick('Protection').catch(console.error);
      break;
    case 'ban':
      await member.ban({ reason: 'Protection' }).catch(console.error);
      break;
  }
}

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    const guildId = message.guild.id;
    const authorId = message.author.id;
    if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const [antiLink, antiScam, antiSpam, logChannelId] = await Promise.all([
      db.get(`${guildId}_antilink`),
      db.get(`${guildId}_antiscam`),
      db.get(`${guildId}_antispam`),
      db.get(`${guildId}_logchannel`),
    ]);

    if (antiLink === true) {
      const whitelist = await db.get(`${guildId}_antilink_whitelist`).catch(() => []) || [];
      if (!whitelist.includes(authorId)) {
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)|(discordapp\.com\/invite\/[^\s]+)/gi;
        if (urlRegex.test(message.content)) {
          try {
            await message.delete();
            const warnMsg = await message.channel.send(`${message.author}, sending links is not allowed in this server.`);
            setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
            await sendProtectionLog(message.guild, logChannelId,
              'A link was detected and removed.',
              `**User:** ${message.author.tag} (${authorId})\n**Channel:** ${message.channel.name}\n**Content:** ${message.content.slice(0, 1024)}`);
          } catch (error) {
            console.error('Error in anti-link:', error);
          }
        }
      }
    }

    if (antiScam === true) {
      const whitelist = await db.get(`${guildId}_antiscam_whitelist`).catch(() => []) || [];
      if (!whitelist.includes(authorId)) {
        const scamPatterns = [
          /free\s*nitro/i, /steam\s*gift/i, /discord\s*nitro\s*giveaway/i,
          /\b(?:https?:\/\/)?(?:discord\.(?:gg|io|me|li)|discordapp\.com\/invite)\/[a-z0-9]+\b/i,
          /claim\s*your\s*prize/i
        ];
        if (scamPatterns.some(p => p.test(message.content))) {
          try {
            await message.delete();
            if (message.member) await message.member.timeout(300000, 'Potential scam message detected');
            await sendProtectionLog(message.guild, logChannelId,
              'A potential scam message was detected and removed.',
              `**User:** ${message.author.tag} (${authorId})\n**Action:** Deleted + 5min timeout`);
          } catch (error) {
            console.error('Error in anti-scam:', error);
          }
        }
      }
    }

    if (antiSpam === true) {
      const whitelist = await db.get(`${guildId}_antispam_whitelist`).catch(() => []) || [];
      if (whitelist.includes(authorId)) return;

      const spamThreshold = await db.get(`${guildId}_antispam_limit`).catch(() => 5) || 5;
      const spamInterval = 5000;

      const guildMap = userMessagesByGuild.get(guildId) || new Map();
      let userSet = guildMap.get(authorId);
      if (!userSet) {
        userSet = new Set();
        guildMap.set(authorId, userSet);
      }
      userMessagesByGuild.set(guildId, guildMap);
      userSet.add(message.id);
      setTimeout(() => {
        userSet.delete(message.id);
        if (userSet.size === 0) guildMap.delete(authorId);
      }, spamInterval);

      if (userSet.size > spamThreshold) {
        try {
          const warnings = userWarningsByGuild.get(guildId) || new Map();
          let userWarn = warnings.get(authorId) || 0;

          if (userWarn === 0) {
            userWarn = 1;
            warnings.set(authorId, userWarn);
            userWarningsByGuild.set(guildId, warnings);
            await message.channel.send(`${message.author}, this is a warning. Please stop spamming.`);
          } else {
            if (message.member) await message.member.timeout(300000, 'Spamming detected after warning');
            await message.channel.bulkDelete([...userSet]).catch(() => {});
            warnings.delete(authorId);
            guildMap.delete(authorId);
            await sendProtectionLog(message.guild, logChannelId,
              'Spam detected.',
              `**User:** ${message.author.tag} (${authorId})\n**Action:** Messages deleted + 5min timeout`);
          }
        } catch (error) {
          console.error('Error in anti-spam:', error);
        }
      }
    }
  });

  client.on('guildMemberAdd', async (member) => {
    if (!member.guild) return;
    const [antiRaid, logChannelId] = await Promise.all([
      db.get(`${member.guild.id}_antiraid`),
      db.get(`${member.guild.id}_logchannel`),
    ]);
    if (antiRaid !== true) return;

    const whitelist = await db.get(`${member.guild.id}_antiraid_whitelist`).catch(() => []) || [];
    if (whitelist.includes(member.id)) return;

    const joinedAt = member.joinedAt;
    const recentMembers = member.guild.members.cache.filter(m => m.joinedAt > joinedAt - 10000);
    if (recentMembers.size > 10) {
      try {
        await member.kick('Anti-Raid protection');
        await sendProtectionLog(member.guild, logChannelId,
          'A potential raid was detected.',
          `**User:** ${member.user.tag} (${member.id})\n**Action:** Kicked`);
      } catch (error) {
        console.error('Error in anti-raid:', error);
      }
    }
  });

  async function handleChannelDelete(channel) {
    if (!channel.guild) return;
    const [enabled, limit, logChannelId] = await Promise.all([
      db.get(`${channel.guild.id}_antichanneldelete`),
      db.get(`${channel.guild.id}_antichanneldelete_limit`),
      db.get(`${channel.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;
    const deleteCount = incrementRateCounter(`chdel_${channel.guild.id}`);

    if (deleteCount > (limit || 1)) {
      const auditLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || entry.executor.id === client.user.id || channel.guild.ownerId === entry.executor.id) return;
      const whitelist = await db.get(`${channel.guild.id}_antichanneldelete_whitelist`).catch(() => []) || [];
      if (whitelist.includes(entry.executor.id)) return;
      try {
        const newChannel = await channel.clone();
        await newChannel.setPosition(channel.position);
        const punishment = await db.get(`${channel.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const member = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(member, punishment);
        await sendProtectionLog(channel.guild, logChannelId,
          'Channel deleted and restored.',
          `**Channel:** ${channel.name}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-channel-delete:', error);
      }
    }
  }

  async function handleChannelCreate(channel) {
    if (!channel.guild) return;
    const [enabled, limit, logChannelId] = await Promise.all([
      db.get(`${channel.guild.id}_antichannelcreate`),
      db.get(`${channel.guild.id}_antichannelcreate_limit`),
      db.get(`${channel.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;
    const createCount = incrementRateCounter(`chcr_${channel.guild.id}`);

    if (createCount > (limit || 1)) {
      const auditLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || entry.executor.id === client.user.id || channel.guild.ownerId === entry.executor.id) return;
      const whitelist = await db.get(`${channel.guild.id}_antichannelcreate_whitelist`).catch(() => []) || [];
      if (whitelist.includes(entry.executor.id)) return;
      try {
        await channel.delete();
        const punishment = await db.get(`${channel.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const member = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(member, punishment);
        await sendProtectionLog(channel.guild, logChannelId,
          'Unauthorized channel creation.',
          `**Channel:** ${channel.name}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-channel-create:', error);
      }
    }
  }

  async function handleChannelUpdate(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const [enabled, limit, logChannelId] = await Promise.all([
      db.get(`${newChannel.guild.id}_antichanneledit`),
      db.get(`${newChannel.guild.id}_antichanneledit_limit`),
      db.get(`${newChannel.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;
    const editCount = incrementRateCounter(`ched_${newChannel.guild.id}`);

    if (editCount > (limit || 1)) {
      const auditLogs = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || entry.executor.id === client.user.id || newChannel.guild.ownerId === entry.executor.id) return;
      const whitelist = await db.get(`${newChannel.guild.id}_antichanneledit_whitelist`).catch(() => []) || [];
      if (whitelist.includes(entry.executor.id)) return;
      try {
        await newChannel.edit({
          name: oldChannel.name, topic: oldChannel.topic, nsfw: oldChannel.nsfw,
          bitrate: oldChannel.bitrate, userLimit: oldChannel.userLimit,
          rateLimitPerUser: oldChannel.rateLimitPerUser,
          permissionOverwrites: oldChannel.permissionOverwrites.cache,
        });
        const punishment = await db.get(`${newChannel.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const member = await newChannel.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(member, punishment);
        await sendProtectionLog(newChannel.guild, logChannelId,
          'Unauthorized channel edit.',
          `**Channel:** ${newChannel.name}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-channel-edit:', error);
      }
    }
  }

  async function handleRoleCreate(role) {
    if (!role.guild) return;
    const [enabled, limit, logChannelId] = await Promise.all([
      db.get(`${role.guild.id}_antirolecreate`),
      db.get(`${role.guild.id}_antirolecreate_limit`),
      db.get(`${role.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;
    const createCount = incrementRateCounter(`rolcr_${role.guild.id}`);

    if (createCount > (limit || 1)) {
      const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || entry.executor.id === client.user.id || role.guild.ownerId === entry.executor.id) return;
      const whitelist = await db.get(`${role.guild.id}_antirolecreate_whitelist`).catch(() => []) || [];
      if (whitelist.includes(entry.executor.id)) return;
      try {
        await role.delete();
        const punishment = await db.get(`${role.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const member = await role.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(member, punishment);
        await sendProtectionLog(role.guild, logChannelId,
          'Unauthorized role creation.',
          `**Role:** ${role.name}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-role-create:', error);
      }
    }
  }

  async function handleRoleDelete(role) {
    if (!role.guild) return;
    const [enabled, limit, logChannelId] = await Promise.all([
      db.get(`${role.guild.id}_antiroledelete`),
      db.get(`${role.guild.id}_antiroledelete_limit`),
      db.get(`${role.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;
    const deleteCount = incrementRateCounter(`roldl_${role.guild.id}`);

    if (deleteCount > (limit || 1)) {
      const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || entry.executor.id === client.user.id || role.guild.ownerId === entry.executor.id) return;
      const whitelist = await db.get(`${role.guild.id}_antiroledelete_whitelist`).catch(() => []) || [];
      if (whitelist.includes(entry.executor.id)) return;
      try {
        const newRole = await role.guild.roles.create({
          name: role.name, color: role.color, hoist: role.hoist,
          permissions: role.permissions, position: role.position, mentionable: role.mentionable,
        });
        const punishment = await db.get(`${role.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const member = await role.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(member, punishment);
        await sendProtectionLog(role.guild, logChannelId,
          'Role deleted and restored.',
          `**Role:** ${role.name}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-role-delete:', error);
      }
    }
  }

  async function handleRoleUpdate(oldRole, newRole) {
    if (!newRole.guild) return;
    const [enabled, limit, logChannelId] = await Promise.all([
      db.get(`${newRole.guild.id}_antiroleedit`),
      db.get(`${newRole.guild.id}_antiroleedit_limit`),
      db.get(`${newRole.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;
    const editCount = incrementRateCounter(`roled_${newRole.guild.id}`);

    if (editCount > (limit || 3)) {
      const auditLogs = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || entry.executor.id === client.user.id || newRole.guild.ownerId === entry.executor.id) return;
      const whitelist = await db.get(`${newRole.guild.id}_antiroleedit_whitelist`).catch(() => []) || [];
      if (whitelist.includes(entry.executor.id)) return;
      try {
        await newRole.edit({
          name: oldRole.name, color: oldRole.color, hoist: oldRole.hoist,
          permissions: oldRole.permissions, mentionable: oldRole.mentionable,
        });
        const punishment = await db.get(`${newRole.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const member = await newRole.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(member, punishment);
        await sendProtectionLog(newRole.guild, logChannelId,
          'Unauthorized role edit.',
          `**Role:** ${newRole.name}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-role-edit:', error);
      }
    }
  }

  async function handleGuildMemberUpdate(oldMember, newMember) {
    if (!newMember.guild) return;
    const [enabled, logChannelId] = await Promise.all([
      db.get(`${newMember.guild.id}_antiadmingrant`),
      db.get(`${newMember.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;

    const oldAdmin = oldMember.permissions?.has(PermissionsBitField.Flags.Administrator);
    const newAdmin = newMember.permissions?.has(PermissionsBitField.Flags.Administrator);
    if (oldAdmin || !newAdmin) return;

    const auditLogs = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 });
    const entry = auditLogs.entries.first();
    if (!entry || entry.executor.id === client.user.id || newMember.guild.ownerId === entry.executor.id) return;
    const whitelist = await db.get(`${newMember.guild.id}_antiadmingrant_whitelist`).catch(() => []) || [];
    if (whitelist.includes(entry.executor.id)) return;

    try {
      await newMember.roles.remove(newMember.roles.cache.filter(r => r.permissions.has(PermissionsBitField.Flags.Administrator)));
      const punishment = await db.get(`${newMember.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
      const member = await newMember.guild.members.fetch(entry.executor.id).catch(() => null);
      await applyPunishment(member, punishment);
      await sendProtectionLog(newMember.guild, logChannelId,
        'Unauthorized admin grant.',
        `**User:** ${newMember.user.tag}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
    } catch (error) {
      console.error('Error in anti-admin-grant:', error);
    }
  }

  async function handleGuildMemberRemove(member) {
    if (!member.guild) return;
    const [enabled, logChannelId] = await Promise.all([
      db.get(`${member.guild.id}_antikick`),
      db.get(`${member.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;

    const auditLogs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
    const entry = auditLogs.entries.first();
    if (!entry || entry.executor.id === client.user.id || member.guild.ownerId === entry.executor.id) return;
    if (entry.target?.id !== member.id) return;
    const whitelist = await db.get(`${member.guild.id}_antikick_whitelist`).catch(() => []) || [];
    if (whitelist.includes(entry.executor.id)) return;

    const kickCount = incrementRateCounter(`kick_${member.guild.id}_${entry.executor.id}`);
    const limit = await db.get(`${member.guild.id}_antikick_limit`).catch(() => 1) || 1;

    if (kickCount > limit) {
      try {
        const punishment = await db.get(`${member.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const executorMember = await member.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(executorMember, punishment);
        await sendProtectionLog(member.guild, logChannelId,
          'Unauthorized kick.',
          `**User:** ${member.user.tag}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-kick:', error);
      }
    }
  }

  async function handleGuildBanAdd(ban) {
    if (!ban.guild) return;
    const [enabled, logChannelId] = await Promise.all([
      db.get(`${ban.guild.id}_antiban`),
      db.get(`${ban.guild.id}_logchannel`),
    ]);
    if (enabled !== true) return;

    const auditLogs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
    const entry = auditLogs.entries.first();
    if (!entry || entry.executor.id === client.user.id || ban.guild.ownerId === entry.executor.id) return;
    if (entry.target?.id !== ban.user.id) return;
    const whitelist = await db.get(`${ban.guild.id}_antiban_whitelist`).catch(() => []) || [];
    if (whitelist.includes(entry.executor.id)) return;

    const banCount = incrementRateCounter(`ban_${ban.guild.id}_${entry.executor.id}`);
    const limit = await db.get(`${ban.guild.id}_antiban_limit`).catch(() => 1) || 1;

    if (banCount > limit) {
      try {
        await ban.guild.members.unban(ban.user.id).catch(() => {});
        const punishment = await db.get(`${ban.guild.id}_punishment`).catch(() => 'removeroles') || 'removeroles';
        const executorMember = await ban.guild.members.fetch(entry.executor.id).catch(() => null);
        await applyPunishment(executorMember, punishment);
        await sendProtectionLog(ban.guild, logChannelId,
          'Unauthorized ban.',
          `**User:** ${ban.user.tag}\n**By:** ${entry.executor.tag}\n**Punishment:** ${punishment}`);
      } catch (error) {
        console.error('Error in anti-ban:', error);
      }
    }
  }

  client.on('channelDelete', handleChannelDelete);
  client.on('channelCreate', handleChannelCreate);
  client.on('channelUpdate', handleChannelUpdate);
  client.on('roleCreate', handleRoleCreate);
  client.on('roleDelete', handleRoleDelete);
  client.on('roleUpdate', handleRoleUpdate);
  client.on('guildMemberUpdate', handleGuildMemberUpdate);
  client.on('guildMemberRemove', handleGuildMemberRemove);
  client.on('guildBanAdd', handleGuildBanAdd);
};
