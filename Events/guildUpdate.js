const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent } = require('discord.js')
const { proDbGet } = require('../db')

/**
 * @param { import('discord.js').Client } Client
 * @param { import('discord.js').Guild } OldGuild 
 * @param { import('discord.js').Guild } NewGuild 
 */

module.exports = async (Client, OldGuild, NewGuild) => {
    const ChannelId = await proDbGet(`GuildUpdates_${NewGuild.id}`)
    const Log = OldGuild.channels.cache.get(ChannelId);
	if(!ChannelId || !Log) return;
    OldGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate }).then(async Logs => {
        const executor = Logs.entries.first()?.executor;
        if (!executor) return;

        if(!OldGuild.afkChannel && NewGuild.afkChannel) {
            const Container = new ContainerBuilder()
                .setAccentColor(0xFFDD00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# AFK Channel Changed`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**The Channel:** ${NewGuild.afkChannel}\n**Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(!NewGuild.afkChannel && OldGuild.afkChannel) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# AFK Channel Removed`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old AFK:** ${OldGuild.afkChannel}\n**Responsible Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldGuild.afkChannel && NewGuild.afkChannel) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# AFK Channel Updated\n\nAFK Channel has been updated.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old AFK:** ${OldGuild.afkChannel}\n**New AFK:** ${NewGuild.afkChannel}\n**Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(!OldGuild.description && NewGuild.description) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Guild Description Changed`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**The Description:** ${NewGuild.description}\n**Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldGuild.description && NewGuild.description) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Guild Description Updated`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Description:** \`\`\`${OldGuild.description}\`\`\`\n**New Description:** \`\`\`${NewGuild.description}\`\`\`\n**Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldGuild.description && !NewGuild.description == null) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Guild Description Removed`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Description:** ${OldGuild.description}\n**Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(NewGuild.name && OldGuild.name) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Guild Name Updated\n\nGuild Name has been updated.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Name:** \`${OldGuild.name}\`\n**New Name:** \`${NewGuild.name}\`\n**Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } 
    }) 
}
