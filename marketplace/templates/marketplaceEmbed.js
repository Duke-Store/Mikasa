const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

function buildMarketplaceEmbed(products, title = '📦 Marketplace') {
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${title}\\n\\n`)
    );

  if (!products || products.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('No products listed yet. Be the first to sell something!')
    );
    return container;
  }

  for (const product of products) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    const statusEmoji = product.status === 'listed' ? '🟢' : product.status === 'sold' ? '🔴' : '🟡';
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**${statusEmoji} ${product.name}**\\n` +
        `**Seller:** ${product.sellerTag}\\n` +
        `**Category:** ${product.category}\\n` +
        `**Price:** ${product.price}\\n` +
        `**Payment:** ${product.paymentMethod}\\n` +
        `**Originality:** ${product.originalityStatus || 'unverified'}\\n` +
        `**Description:** ${product.description?.slice(0, 500) || 'N/A'}\\n` +
        `*ID: ${product.productId} | Listed: <t:${Math.floor((product.createdAt || 0) / 1000)}:F>*`
      )
    );
  }

  return container;
}

function buildProductDetailEmbed(product) {
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📦 ${product.name}\\n\\n`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Seller:** ${product.sellerTag} (${product.sellerId})`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Category:** ${product.category}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Price:** ${product.price}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Payment Method:** ${product.paymentMethod}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Originality Status:** ${product.originalityStatus || 'unverified'}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Description:**\\n${product.description || 'N/A'}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`*ID: ${product.productId} | Created: <t:${Math.floor((product.createdAt || 0) / 1000)}:F>*`)
    );

  return container;
}

function buildPurchaseConfirmationEmbed(product, buyerTag) {
  const container = new ContainerBuilder()
    .setAccentColor(0x00FF00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ✅ Purchase Confirmed\\n\\n`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Product:** ${product.name}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Buyer:** ${buyerTag}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Price:** ${product.price}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Payment Method:** ${product.paymentMethod}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`*Please complete your payment through the ticket system. Do NOT send payments outside the server.*`)
    );

  return container;
}

function buildSellerSubmittedEmbed(session, aiReport) {
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🚀 Submission Received\\n\\n`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Thank you for your submission!** Your product has been sent for review.`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (aiReport) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**AI Evaluation:**\\n` +
        `**Score:** ${'█'.repeat(Math.round(aiReport.finalScore / 2))}${'░'.repeat(5 - Math.round(aiReport.finalScore / 2))} ${aiReport.finalScore}/10\\n` +
        `**Classification:** ${aiReport.classification}\\n` +
        `**Originality:** ${aiReport.originalityAssessment}\\n` +
        `**Suggested Categories:** ${aiReport.recommendedCategories?.join(', ') || 'N/A'}\\n` +
        `**Suggested Price:** ${aiReport.suggestedPriceRange}`
      )
    );

    if (aiReport.strengths && aiReport.strengths.length > 0) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**✅ Strengths:**\\n${aiReport.strengths.map(s => `• ${s}`).join('\n')}`)
      );
    }

    if (aiReport.weaknesses && aiReport.weaknesses.length > 0) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**⚠️ Areas to Improve:**\\n${aiReport.weaknesses.map(w => `• ${w}`).join('\n')}`)
      );
    }
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`*Our team will review your submission within 24 hours.*`)
  );

  return container;
}

function buildBuyerAnalysisEmbed(aiReport) {
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📊 Project Analysis\\n\\n`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Viability Score:** ${'█'.repeat(Math.round(aiReport.viabilityScore / 2))}${'░'.repeat(5 - Math.round(aiReport.viabilityScore / 2))} ${aiReport.viabilityScore}/10`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Complexity:** ${aiReport.complexity}`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (aiReport.winningIdeas && aiReport.winningIdeas.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**💡 Winning Ideas:**\\n${aiReport.winningIdeas.map(i => `• ${i}`).join('\n')}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  if (aiReport.negativesToFix && aiReport.negativesToFix.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**⚠️ Things to Fix:**\\n${aiReport.negativesToFix.map(n => `• ${n}`).join('\n')}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**💰 Estimated Budget:**\\n` +
      `Low: ${aiReport.estimatedBudget.low}\\n` +
      `Mid: ${aiReport.estimatedBudget.mid}\\n` +
      `High: ${aiReport.estimatedBudget.high}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**👨‍💻 Developers Needed:** ${aiReport.estimatedDevCount}\\n` +
      `**Timeline:** ${aiReport.timelineEstimate}\\n` +
      `*AI Confidence: ${aiReport.confidence}*`
    )
  );

  return container;
}

module.exports = {
  buildMarketplaceEmbed,
  buildProductDetailEmbed,
  buildPurchaseConfirmationEmbed,
  buildSellerSubmittedEmbed,
  buildBuyerAnalysisEmbed,
};
