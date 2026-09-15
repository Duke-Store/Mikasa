const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { proDbGet } = require('../db');

/**
 * @param { import('discord.js').Client } Client 
 * @param { import('discord.js').Message } Message 
 */


module.exports = async(Client, Message) => {
    const ChannelId = await proDbGet(`Messages_${Message.guildId}`);
    const Log = Message.guild.channels.cache.get(ChannelId);
    if(!ChannelId || !Log) return;

    // Skip if author is null (message was deleted before being cached)
    if(!Message.author) return;

    const Container = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Message Deleted\n\nMessage from ${Message.author} deleted in ${Message.channel}\nIt was sent on <t:${Math.floor(Message.createdAt / 1000)}:F>`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Message Content:** ${Message.content || '[Empty message]'}`),
            new TextDisplayBuilder().setContent(`*User ID: ${Message.author.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
        )
    Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
}
