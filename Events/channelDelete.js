const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent } = require('discord.js')
const { proDbGet } = require('../db')

/**
 * @param { import('discord.js').Client } Client 
 * @param { import('discord.js').GuildChannel } Channel 
 */

module.exports = async (Client, Channel) => {

    const ChannelId = await proDbGet(`Channels_${Channel.guildId}`);
    const Log = Channel.guild.channels.cache.get(ChannelId);
    if(!ChannelId || !Log) return;

    const Logs = await Channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete });
    const firstEntry = Logs.entries.first();
    if (!firstEntry) return;

    const Container = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Channel Deleted\n\n**Channel:** #${Channel.name}\n**Moderator:** @${firstEntry.executor?.username}`),
            new TextDisplayBuilder().setContent(`*Channel ID: ${Channel.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
        )

    Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))

}
