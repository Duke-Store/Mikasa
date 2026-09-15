const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent } = require('discord.js')
const { proDbGet } = require('../db')

/**
 * @param { import('discord.js').Client } Client
 * @param { import('discord.js').GuildMember } Member 
 */

module.exports = async(Client, Member) => {
    const ChannelId = await proDbGet(`GuildMembers_${Member.guild.id}`)
    const Log = Member.guild.channels.cache.find(Channel => Channel.id === ChannelId)
	if(!ChannelId || !Log) return;

    const Container = new ContainerBuilder()
        .setAccentColor(0xFFDD00)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Log (User left)\n\n**User:** ${Member.user.tag}`),
            new TextDisplayBuilder().setContent(`*User ID: ${Member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
        )
    Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
}
