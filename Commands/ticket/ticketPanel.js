const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
} = require('discord.js');
const ticketConfig = require('../../ticket-config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Sends the ticket system setup message'),
	async execute(interaction) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({ content: ticketConfig.MESSAGES.ERROR_NO_PERMISSION, flags: 64 });
		}

		const setupComponents = [
			new ContainerBuilder()
				.setAccentColor(0xFFDD00)
				.addSectionComponents(
					new SectionBuilder()
						.setThumbnailAccessory(
							new ThumbnailBuilder()
								.setURL('https://i.ibb.co/TDYj9SHb/file-00000000a56481f4bcf97d3306788bf5.png')
								.setDescription('Aurex Team Icon')
						)
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent('# <:Rex_GoldenTicket:1529173698505080874> Ticket Panel'),
							new TextDisplayBuilder().setContent('╭─◆ Open a `Ticket` with **Aurex** <:crown:1529469205127368774>\n│\n├ Select the service you need.\n├ Our team will respond as soon as possible.\n╰ Start your journey with `Aurex`.')
						)
				)
				.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent('## <:0868fbe3015e0fda:1529182897758797936> Start Your Adventure'),
					new TextDisplayBuilder().setContent('╭─◆ Choose your service.\n├ Create your `Ticket`.\n╰ Begin your adventure with **Aurex** <:dc20dcf8bced5da4:1529183052239077487>')
				)
				.addMediaGalleryComponents(
					new MediaGalleryBuilder().addItems(
						new MediaGalleryItemBuilder()
							.setURL('https://i.ibb.co/q3J2pfKZ/file-00000000593481f4932881fb99ea63c3.png')
							.setDescription('Ticket System Banner')
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent('<:54545:1529182913592295584>  `Aurex Team® • 2026`')
				),
			new ActionRowBuilder()
				.addComponents(
					new StringSelectMenuBuilder()
						.setCustomId("ticket_starter")
						.setMaxValues(1)
						.addOptions(
							new StringSelectMenuOptionBuilder()
								.setLabel("Apply")
								.setValue("apply")
								.setEmoji("1529181582089257162"),
							new StringSelectMenuOptionBuilder()
								.setLabel("Purchase A Service")
								.setValue("buy")
								.setEmoji("1529182913592295584"),
							new StringSelectMenuOptionBuilder()
								.setLabel("Request a Project / Buy")
								.setValue("buy_req")
								.setEmoji("1529183052239077487"),
							new StringSelectMenuOptionBuilder()
								.setLabel("Sell a Project / Product")
								.setValue("sell")
								.setEmoji("1529183052239077487"),
							new StringSelectMenuOptionBuilder()
								.setLabel("Report a Bug or a User")
								.setValue("support")
								.setEmoji("1528893357865177259")
						)
				)
		];

		await interaction.deferReply({ flags: 64 }).catch(() => {});
		await interaction.channel.send({ components: setupComponents, flags: MessageFlags.IsComponentsV2 });
		await interaction.editReply({ content: '✅ Ticket setup message sent.' }).catch(() => {});
	},
};
