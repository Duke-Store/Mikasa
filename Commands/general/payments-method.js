const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payments-method')
    .setDescription('Displays a selector for payment methods.'),
  async execute(interaction, client) {
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('payment_method_select')
          .setPlaceholder('Select the method that you want')
          .addOptions([
            {
              label: 'Method 01: Upfront Payment',
              value: 'method_01',
            },
            {
              label: 'Method 02: Per Task',
              value: 'method_02',
            },
            {
              label: 'Method 03: After Completion',
              value: 'method_03',
            },
          ]),
      );

    const container = new ContainerBuilder().setAccentColor(0xFFDD00).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 💳 Payment Methods\n\nSelect the payment method that suits your project below.'));
    await interaction.reply({
      components: [container, row],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
