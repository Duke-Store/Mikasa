const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent, ChannelType } = require('discord.js')
const { proDbGet } = require('../db')

/**
 * @param { import('discord.js').Client } Client 
 * @param { import('discord.js').GuildChannel } OldChannel 
 * @param { import('discord.js').GuildChannel } NewChannel 
 */

module.exports = async(Client, OldChannel, NewChannel) => {
    const ChannelId = await proDbGet(`Channels_${NewChannel.guild.id}`);
    const Log = await OldChannel.guild.channels.cache.get(ChannelId);
    if(!ChannelId || !Log) return;

    const Logs = await OldChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate });

    if(OldChannel.name !== NewChannel.name) {

        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Channel Renamed\n\nThe name of this channel was changed by **@${Logs.entries.first().executor.username}**.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Before:** ${OldChannel.name}\n**After:** ${NewChannel.name}`),
                new TextDisplayBuilder().setContent(`*Channel ID: ${NewChannel.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))

    } else if(!OldChannel.topic && NewChannel.topic) {

        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Channel Topic Created\n\nThe topic of the **#${NewChannel.name}** channel was changed by **@${Logs.entries.first().executor.username}**.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**The Topic:** ${NewChannel.topic}`),
                new TextDisplayBuilder().setContent(`*Channel ID: ${NewChannel.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))

    } else if(OldChannel.topic !== NewChannel.topic) {

        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Channel Topic Updated\nThe topic of the **#${NewChannel.name}** channel was changed by **@${Logs.entries.first().executor.username}**.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Before:** ${OldChannel.topic}\n**After:** ${NewChannel.topic}`),
                new TextDisplayBuilder().setContent(`*Channel ID: ${NewChannel.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))

    } else if(OldChannel.topic && !NewChannel.topic) {

        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Channel Topic Deleted\nThe topic of the **#${NewChannel.name}** channel was changed by **@${Logs.entries.first().executor.username}**.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Old Topic:** ${OldChannel.topic}`),
                new TextDisplayBuilder().setContent(`*Channel ID: ${NewChannel.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))

    } else if(!OldChannel.parent && NewChannel.parent) {
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Channel Category Changed\nThe category of the **#${NewChannel.name}** channel was changed by **@${Logs.entries.first().executor.username}**.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Category:** ${NewChannel.parent}\n**Moderator:** <@${Logs.entries.first().executor.id}>`),
                new TextDisplayBuilder().setContent(`*User ID: ${Logs.entries.first().executor.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    } else if(OldChannel.parent !== NewChannel.parent) {
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Channel Category Updated\nThe category of the **#${NewChannel.name}** channel was updated by **@${Logs.entries.first().executor.username}**.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Old Category:** ${OldChannel.parent}\n**New Category:** ${NewChannel.parent ? NewChannel.parent : 'No Category'}\n**Moderator:** <@${Logs.entries.first().executor.id}>`),
                new TextDisplayBuilder().setContent(`*User ID: ${Logs.entries.first().executor.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    }
}
