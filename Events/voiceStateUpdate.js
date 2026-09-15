const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { proDbGet } = require('../db')

/**
 * 
 * @param { import('discord.js').Client } Client 
 * @param { import('discord.js').VoiceState } OldVoice 
 * @param { import('discord.js').VoiceState } NewVoice 
 */

module.exports = async(Client, OldVoice, NewVoice) => {
    const ChannelId = await proDbGet(`VoiceState_${OldVoice.guild.id}`)
    const Log = OldVoice.guild.channels.cache.get(ChannelId);
    if(!ChannelId || !Log) return;

    if(!OldVoice.channel && NewVoice.channel) {
        if (!NewVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Log (User joined a voice)\n\n**User:** ${NewVoice.member.user.tag}\n**Channel:** ${NewVoice.channel.name}`),
                new TextDisplayBuilder().setContent(`*User ID: ${NewVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!NewVoice.channel && OldVoice.channel) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Log (User has left a voice)\n\n**User:** ${OldVoice.member.user.tag}\n**Channel:** ${OldVoice.channel.name}`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!OldVoice.serverMute && NewVoice.serverMute) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:microphone2: Server Mute:** **True**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!NewVoice.serverMute && OldVoice.serverMute) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:microphone2: Server Mute:** **False**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!OldVoice.serverDeaf && NewVoice.serverDeaf) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:speaker: Server Deafen:** **True**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!NewVoice.serverDeaf && OldVoice.serverDeaf) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:speaker: Server Deafen:** **False**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!OldVoice.streaming && NewVoice.streaming) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:tv: Streaming:** **True**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!NewVoice.streaming && OldVoice.streaming) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:tv: Streaming:** **False**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(!OldVoice.selfVideo && NewVoice.selfVideo) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:movie_camera: Video Camera:** **True**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(OldVoice.selfVideo && !NewVoice.selfVideo) {
        if (!OldVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${OldVoice.member.user.username}\n\nVoice state of ${NewVoice.member} has been updated.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**:movie_camera: Video Camera:** **False**`),
                new TextDisplayBuilder().setContent(`*User ID: ${OldVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    } else if(OldVoice.channel && NewVoice.channel && OldVoice.channelId !== NewVoice.channelId) {
        if (!NewVoice.member) return;
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# @${NewVoice.member.user.username}\n\n${NewVoice.channel} has moved to a different voice channel.`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Previous Channel:** ${OldVoice.channel.name} (${OldVoice.channel.members.size} Members)\n**New Channel:** ${NewVoice.channel.name} (${NewVoice.channel.members.size} Members)`),
                new TextDisplayBuilder().setContent(`*User ID: ${NewVoice.member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )
        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send voice log:', err))
    }
}
