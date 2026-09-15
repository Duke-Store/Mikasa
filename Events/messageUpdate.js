const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { proDbGet } = require('../db');

/**
 * @param { import('discord.js').Client } Client 
 * @param { import('discord.js').Message } OldMessage 
 * @param { import('discord.js').Message } NewMessage 
 */

module.exports = async (Client, OldMessage, NewMessage) => {
    if (OldMessage.content === NewMessage.content) return;
    if (!OldMessage.guild) return;

    const ChannelId = await proDbGet(`Messages_${OldMessage.guild.id}`);
    const LogChannel = OldMessage.guild.channels.cache.get(ChannelId);
    if (!ChannelId || !LogChannel) return;

    const Container = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Message Edited`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Author:** <@${OldMessage.author.id}>\n**Channel:** <#${OldMessage.channel.id}>`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Old Content:** ${OldMessage.content.substring(0, 1024) || 'None'}\n**New Content:** ${NewMessage.content.substring(0, 1024) || 'None'}`),
            new TextDisplayBuilder().setContent(`*Message ID: ${OldMessage.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
        );

    LogChannel.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err));
};
