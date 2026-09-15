const { SlashCommandBuilder } = require('discord.js');
const { parseDuration } = require('../../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption((o) => o.setName('time').setDescription('e.g. 10m, 1h').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Reminder text').setRequired(true)),
  async execute(interaction, client) {
    const timeStr = interaction.options.getString('time', true);
    const msg = interaction.options.getString('message', true);
    const ms = parseDuration(timeStr);

    if (!ms || ms <= 0 || ms > 2_147_483_647) {
      return interaction.reply({
        content: 'Invalid time (max about 24 days). Use formats like 10m, 1h, 1d.',
        flags: 64,
      });
    }

    await interaction.reply({
      content: `Ok, I will remind you in ${timeStr}.`,
      flags: 64,
    });

    setTimeout(async () => {
      try {
        await interaction.user.send(`Reminder from ${interaction.guild?.name || 'a server'}: ${msg}`);
      } catch {
        try {
          await interaction.followUp({
            content: `Reminder: ${msg}`,
            flags: 64,
          });
        } catch (e) {
          console.error('Failed to send reminder:', e);
        }
      }
    }, ms);
  },
};
