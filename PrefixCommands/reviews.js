module.exports = {
  name: 'reviews',
  description: 'Show Mikasa Developer Portal — bot services, commands, and developer terms overview',
  aliases: ['ratingcommands', 'r', 'help'],
  usage: '',
  cooldown: 3,
  async execute(message, args, client) {
    const { getGuildSettings } = require('../utils');
    const prefix = getGuildSettings(message.guild.id).prefix || '!';

    // Convincing developer portal panel — Mikasa's request
    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setAuthor({ name: 'Mikasa Developer Portal', iconURL: client.user.displayAvatarURL() })
      .setTitle('📋 Discord Developer Portal — Bot Services')
      .setDescription(
        `**Mikasa** is a Discord Developer Portal — a bot that powers your server with professional development services. ` +
        `Built for servers with 10K+ members, it provides ticketing, developer applications, project management, ` +
        `marketplace listings, AI-powered reviews, and an integrated payment system.\n\n` +
        `**What this bot does:**\n` +
        `• 🎫 **Ticket System** — Support, buy, sell, and apply tickets with automated flows\n` +
        `• 👨‍💻 **Developer Portal** — Apply as a developer, get assigned projects, earn commissions\n` +
        `• 📦 **Marketplace** — Buy and sell digital products (scripts, models, UI, audio, etc.)\n` +
        `• 🤖 **Bot Development** — Commission custom Discord bots for your server\n` +
        `• 📊 **Auto-Rating** — Automatic customer satisfaction ratings after ticket closure\n` +
        `• 🧪 **AI Reviews** — AI-powered project analysis and portfolio scanning\n` +
        `• 💳 **Payment System** — 50% upfront or per-task payment with admin protection\n\n` +
        `---

` +
        `**Developer Terms of Service** — All developers must agree to these terms:\n` +
        `• **01** Professional Conduct — no fraud, scams, or harassment\n` +
        `• **02** Complete work on time, stay responsive\n` +
        `• **06** Payment: 50% upfront OR per-task before starting\n` +
        `• **07** Cannot quit a project without management approval\n` +
        `• **09** Client privacy — never share confidential info\n` +
        `• **10** Studio property stays Studio property\n` +
        `• **13** AI tools only when permitted — you're responsible for the result\n` +
        `• **20** No competing with the Studio using its clients\n` +
        `• **25** Serious violations = immediate termination\n` +
        `• **Full 28 rules** enforced — not reading them doesn't exempt you`
      )
      .addFields(
        { name: `🔧 ${prefix}reviews`, value: 'Show this developer portal panel', inline: false },
        { name: `${prefix}setratingchannel <#channel>`, value: 'Set the auto-rating channel', inline: true },
        { name: `${prefix}stopratings`, value: 'Stop auto-ratings in this server', inline: true },
        { name: `${prefix}ratingstatus`, value: 'Check auto-rating configuration', inline: true },
        { name: `${prefix}sendrating`, value: 'Manually send a rating now', inline: true },
        { name: `${prefix}addadmin <@user>`, value: 'Add a user to the admin list', inline: true },
        { name: `${prefix}removeadmin <@user>`, value: 'Remove a user from the admin list', inline: true },
        { name: `${prefix}adminslist`, value: 'Show the admin list', inline: true },
        { name: `${prefix}sendmassratings <count>`, value: 'Send multiple random ratings (max 100)', inline: true },
      )
      .setFooter({ text: `Mikasa Bot v1.0 — Developer Portal for 10K+ servers | ${prefix}help for details` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
