const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent } = require('discord.js')
const { proDbGet } = require('../db')

/**
 * 
 * @param { import('discord.js').Client } Client 
 * @param { import('discord.js').Role } Role 
 */

module.exports = async(Client, Role) => {
    const ChannelId = await proDbGet(`RolesUpdate_${Role.guild.id}`);
    const Log = Role.guild.channels.cache.get(ChannelId);
    if(!ChannelId || !Log) return;
    
    Role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate }).then(async Logs => {
        const executor = Logs.entries.first()?.executor;
        if (!executor) return;

        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Role Created\n\n**Role:** ${Role.name}\n**Moderator:** @${executor.username}`),
                new TextDisplayBuilder().setContent(`*Role ID: ${Role.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    })
}
