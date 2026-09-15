const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent } = require('discord.js')
const { proDbGet } = require('../db')

/**
 * @param { import('discord.js').Client } Client
 * @param { import('discord.js').GuildMember } OldMember 
 * @param { import('discord.js').GuildMember } NewMember 
 */

module.exports = async(Client, OldMember, NewMember) => {
    const ChannelId = await proDbGet(`GuildMembers_${OldMember.guild.id}`);
    const Log = OldMember.guild.channels.cache.get(ChannelId);
    if(!ChannelId || !Log) return;
    const Logs = await OldMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate });

    const firstEntry = Logs.entries.first();

    if(OldMember.roles.cache.size < NewMember.roles.cache.size) {
        const Role = NewMember.roles.cache.filter((role) => !OldMember.roles.cache.has(role.id)).first();
        if (!Role) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Member Role Changed\n\n${NewMember.user} was given the **${Role.name}** role.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Moderator:** <@${firstEntry?.executor?.id}>`),
                new TextDisplayBuilder().setContent(`*User ID: ${NewMember.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    } else if(OldMember.roles.cache.size > NewMember.roles.cache.size) {
        const Role = OldMember.roles.cache.filter((role) => !NewMember.roles.cache.has(role.id)).first();
        if (!Role) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Member Role Changed\n\n${NewMember.user} was removed from the **${Role.name}** role.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Moderator:** <@${firstEntry?.executor?.id}>`),
                new TextDisplayBuilder().setContent(`*User ID: ${NewMember.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    } else if(OldMember.guild.ownerId !== NewMember.guild.ownerId) {
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Guild Ownership Updated\n\n**:writing_hand: ${OldMember.user} has been updated.**`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Old Ownership:** <@${OldMember.guild.ownerId}>\n**New Ownership:** <@${NewMember.guild.ownerId}>`),
                new TextDisplayBuilder().setContent(`*User ID: ${NewMember.guild.ownerId} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    } else if(OldMember.nickname !== NewMember.nickname) {
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Member Nickname Changed\n\nThe nickname for ${NewMember.user} was changed by **${NewMember.user.username}**.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Before:** ${OldMember.nickname}\n**After:** ${NewMember.nickname ? NewMember.nickname : NewMember.user.username}`),
                new TextDisplayBuilder().setContent(`*User ID: ${NewMember.user.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    }
}
