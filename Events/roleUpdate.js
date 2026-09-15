const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent } = require('discord.js')
const { proDbGet } = require('../db')

/**
 * @param { import('discord.js').Client } Client
 * @param { import('discord.js').Role } OldRole 
 * @param { import('discord.js').Role } NewRole  
 */


module.exports = async (Client, OldRole, NewRole) => {
    const ChannelId = await proDbGet(`RolesUpdate_${OldRole.guild.id}`);
    const Log = OldRole.guild.channels.cache.get(ChannelId);
    if(!ChannelId || !Log) return;

    OldRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate }).then(async Logs => {
        const executor = Logs.entries.first()?.executor;
        if (!executor) return;

        if(!OldRole.icon && NewRole.icon) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Role Updated\n\nThe icon of the **${NewRole.name}** role was changed by **@${executor.username}**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Role Icon:** [Icon URL](${NewRole.iconURL({ size: 4096 })})`),
                    new TextDisplayBuilder().setContent(`*Role ID: ${NewRole.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldRole.icon && !NewRole.icon) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Role Updated\n\nThe icon of the **${NewRole.name}** role was removed by **@${executor.username}**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Icon:** [Icon URL](${OldRole.iconURL({ size: 4096 })})`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldRole.icon && NewRole.icon) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Role Updated\nThe icon of the **${NewRole.name}** role was updated by **@${executor.username}**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Icon:** [Icon URL](${OldRole.iconURL({ size: 4096 })})\n**New Icon:** [Icon URL](${NewRole.iconURL({ size: 4096 })})`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(!OldRole.color && NewRole.color) {
            const Container = new ContainerBuilder()
                .setAccentColor(0xFFDD00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Role Updated\nThe color of the **${NewRole.name}** role was changed by **@${executor.username}**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**New Color:** ${NewRole.hexColor}`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldRole.color && !NewRole.color) {
            const Container = new ContainerBuilder()
                .setAccentColor(0xFFDD00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Role Updated\nThe color of the **${NewRole.name}** role was removed by **@${executor.username}**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Color:** ${OldRole.hexColor}`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldRole.color && NewRole.color) {
            const Container = new ContainerBuilder()
                .setAccentColor(0xFFDD00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Role Updated\nThe color of the **${NewRole.name}** role was updated by **@${executor.username}**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Color:** ${OldRole.hexColor}\n**New Color:** ${NewRole.hexColor}`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldRole.name && NewRole.name) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${executor.username}\n\nThe name of this role was changed by **@${executor.username}**.`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Name:** ${OldRole.name}\n**New Name:** ${NewRole.name}`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        } else if(OldRole.permissions && NewRole.permissions) {
            const Container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# ${executor.username}\n\n**:family_mmb: Role permissions has been updated \`${OldRole.name}\`.**`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**Old Permissions:** ${OldRole.permissions.bitfield}\n**New Permissions:** ${NewRole.permissions.bitfield}\n**Responsible Moderator:** <@${executor.id}>`),
                    new TextDisplayBuilder().setContent(`*<t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        }
    })
}
