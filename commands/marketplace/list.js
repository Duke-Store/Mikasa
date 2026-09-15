const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { listAllProducts, searchProducts, getProduct } = require('../../marketplace/marketplace');
const { buildMarketplaceEmbed } = require('../../marketplace/templates/marketplaceEmbed');
const { buildProductDetailEmbed } = require('../../marketplace/templates/marketplaceEmbed');
const { buildProjectEvalEmbed } = require('../../aiAgents/templates/projectEvalEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('marketplace')
    .setDescription('Browse the marketplace for products and services')
    .addSubcommand(sub =>
      sub.setName('list')
      .setDescription('List all available products')
      .addStringOption(opt =>
        opt.setName('category')
        .setDescription('Filter by category (optional)')
        .setRequired(false)
        .addChoices(
          { name: 'Maps', value: 'Maps' },
          { name: 'Games', value: 'Games' },
          { name: 'Scripts', value: 'Scripts' },
          { name: 'Models', value: 'Models' },
          { name: 'UI / Textures', value: 'UI / Textures' },
          { name: 'Audio', value: 'Audio' },
          { name: 'Animation', value: 'Animation' },
          { name: 'Services', value: 'Services' },
          { name: 'Other', value: 'Other' }
        )
      )
      .addStringOption(opt =>
        opt.setName('search')
        .setDescription('Search products by name or description')
        .setRequired(false)
      )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      const category = interaction.options.getString('category');
      const search = interaction.options.getString('search');

      let products;
      if (search) {
        products = searchProducts(search);
      } else {
        products = listAllProducts(category || null);
      }

      if (products.length === 0) {
        return interaction.reply({
          content: 'No products found in the marketplace. Be the first to list something!',
          flags: MessageFlags.IsComponentsV2 | 64
        });
      }

      // Show first 10 products with pagination indicator
      const shown = products.slice(0, 10);
      const embed = buildMarketplaceEmbed(shown, `📦 Marketplace (${products.length} products)`);

      const components = [embed];

      if (products.length > 10) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('marketplace_next_page')
              .setLabel(`Show More (${products.length - 10} remaining)`)
              .setStyle(ButtonStyle.Primary)
          )
        );
      }

      // Store for pagination
      if (!client._marketplaceCache) client._marketplaceCache = new Map();
      client._marketplaceCache.set(interaction.user.id, { products, page: 0 });

      await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 | 64 });
    }
  }
};
