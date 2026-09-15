const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, AuditLogEvent } = require('discord.js')
const { proDbGet } = require('../db')
const { getGuildSettings } = require('../utils');

module.exports = async(Client, Member) => {
    const ChannelId = await proDbGet(`GuildMembers_${Member.guild.id}`);
    const Log = Member.guild.channels.cache.get(ChannelId);

    if (!ChannelId || !Log) return;

    if (Member.user.bot) {
        Member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd }).then(async Logs => {
            const executor = Logs.entries.first()?.executor;
            const Container = new ContainerBuilder()
                .setAccentColor(0xFFDD00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# Log (User join)\n\n**User:** ${Member.user.tag}\n**Bot:** Yes\n**Invited by:** ${executor ? executor.tag : 'Unknown'}`),
                    new TextDisplayBuilder().setContent(`*User ID: ${Member.user.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
                )
            Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
        }).catch(err => console.error('Failed to fetch audit logs for bot add:', err))
    } else {
        let inviterTag = 'Unknown';
        try {
            const invites = await Member.guild.invites.fetch();
            if (invites && Client.GuildsInvites) {
                const Invite = invites.find((invite) => {
                    const prevUses = Client.GuildsInvites.get(invite.code);
                    return prevUses !== undefined && invite.uses > prevUses;
                });
                if (Invite?.inviter) inviterTag = Invite.inviter.tag;
            }
        } catch (err) {
            console.error('Failed to resolve invite for guild member add:', err);
        }
        const Container = new ContainerBuilder()
            .setAccentColor(0xFFDD00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# Log (User join)\n\n**User:** ${Member.user.tag}\n**Invited by:** ${inviterTag}`),
                new TextDisplayBuilder().setContent(`*User ID: ${Member.id} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
            )

        Log.send({ components: [Container], flags: MessageFlags.IsComponentsV2 }).catch(err => console.error('Failed to send log message:', err))
    }

    const settings = getGuildSettings(Member.guild.id);
    const welcomeChannelId = settings.welcomeChannelId;
    const welcomeMessage = settings.welcomeMessage;

    if (welcomeChannelId) {
        const welcomeChannel = Member.guild.channels.cache.get(welcomeChannelId);
        if (welcomeChannel) {
            const customMsg = (welcomeMessage || 'Welcome {user} to {server}!')
                .replace(/{user}/g, Member.user.toString())
                .replace(/{server}/g, Member.guild.name);

            const gettingStartedContainer = new ContainerBuilder()
                .setAccentColor(0xFFDD00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# 👋 Welcome ${Member.user.username}!\n\n${customMsg}`)
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🚀 Getting Started\n\n` +
                        `Here's what you can do to get started:\n\n` +
                        `🎫 **Open a Ticket** — Create a support or service request ticket to get help or start a project.\n` +
                        `💼 **Apply as Developer** — Submit your portfolio and apply to work on projects.\n` +
                        `📋 **Browse Commands** — Use \`/help\` to see all available commands.\n` +
                        `🏆 **Giveaways** — Check out active giveaways with \`/glist\`.\n\n` +
                        `If you need assistance, feel free to open a ticket or ask a staff member!`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`*Joined <t:${Math.floor(Date.now() / 1000)}:R>*`)
                );

            welcomeChannel.send({
                components: [gettingStartedContainer],
                flags: MessageFlags.IsComponentsV2
            }).catch(err => console.error('Failed to send welcome message:', err));
        }
    }
}
