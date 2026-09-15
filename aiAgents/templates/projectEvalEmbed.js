const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

/**
 * Build AI evaluation embed for seller project submissions.
 * Shows combined results from all 3 seller evaluation agents.
 */
function buildProjectEvalEmbed(aiReport, agentResults) {
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 🤖 AI Evaluation Results\n\n`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Overall score bar
  const scoreBars = Math.round(aiReport.finalScore / 2);
  const scoreDots = 5 - scoreBars;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Overall Score:** ${'█'.repeat(scoreBars)}${'░'.repeat(scoreDots)} ${aiReport.finalScore}/10\n` +
      `**Classification:** ${aiReport.classification}\n` +
      `**Confidence:** ${aiReport.confidence}\n` +
      `**Originality:** ${aiReport.originalityAssessment || 'unknown'}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Strengths
  if (aiReport.strengths && aiReport.strengths.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**✅ Strengths:**\n${aiReport.strengths.map(s => `• ${s}`).join('\n')}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Weaknesses
  if (aiReport.weaknesses && aiReport.weaknesses.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**⚠️ Areas to Improve:**\n${aiReport.weaknesses.map(w => `• ${w}`).join('\n')}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Recommended categories
  if (aiReport.recommendedCategories && aiReport.recommendedCategories.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**🎯 Recommended Categories:** ${aiReport.recommendedCategories.join(', ')}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Suggested price
  if (aiReport.suggestedPriceRange && aiReport.suggestedPriceRange !== 'N/A') {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**💰 Suggested Price Range:** ${aiReport.suggestedPriceRange}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Detailed feedback scores
  if (aiReport.detailedFeedback) {
    const fb = aiReport.detailedFeedback;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Detailed Scores:**\n` +
        `Product Quality: ${fb.productQuality || 'N/A'}/10\n` +
        `Originality: ${fb.originality || 'N/A'}/10\n` +
        `Market Fit: ${fb.marketFit || 'N/A'}/10\n` +
        `Professionalism: ${fb.professionalism || 'N/A'}/10`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Per-agent breakdown
  if (agentResults && agentResults.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**--- Agent Breakdown ---**`)
    );
    for (const result of agentResults) {
      const agentName = result.agentName || 'Unknown';
      const agentScore = result.score || '?';
      const agentClass = result.classification || '?';
      const agentConf = result.confidence || '?';
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${agentName}:** Score ${agentScore}/10 | ${agentClass} | ${agentConf} confidence`
        )
      );
    }
  }

  // Evidence / summary
  if (aiReport.evidence) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Summary:**\n${aiReport.evidence}`)
    );
  }

  return container;
}

/**
 * Build AI analysis embed for buyer project requests.
 * Shows combined results from all 3 buyer analysis agents.
 */
function buildBuyerEvalEmbed(aiReport, agentResults) {
  const container = new ContainerBuilder()
    .setAccentColor(0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# 📊 AI Project Analysis\n\n`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Viability score
  const scoreBars = Math.round(aiReport.viabilityScore / 2);
  const scoreDots = 5 - scoreBars;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Viability Score:** ${'█'.repeat(scoreBars)}${'░'.repeat(scoreDots)} ${aiReport.viabilityScore}/10\n` +
      `**Complexity:** ${aiReport.complexity || 'unknown'}\n` +
      `**Confidence:** ${aiReport.confidence}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Winning ideas
  if (aiReport.winningIdeas && aiReport.winningIdeas.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**💡 Winning Ideas:**\n${aiReport.winningIdeas.map(i => `• ${i}`).join('\n')}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Negatives to fix
  if (aiReport.negativesToFix && aiReport.negativesToFix.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**⚠️ Things to Fix:**\n${aiReport.negativesToFix.map(n => `• ${n}`).join('\n')}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Budget estimate
  if (aiReport.estimatedBudget) {
    const b = aiReport.estimatedBudget;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**💰 Estimated Budget:**\n` +
        `Low: ${b.low}\n` +
        `Mid: ${b.mid}\n` +
        `High: ${b.high}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Dev count and timeline
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**👨‍💻 Developers Needed:** ${aiReport.estimatedDevCount || 'N/A'}\n` +
      `**📅 Timeline:** ${aiReport.timelineEstimate || 'N/A'}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Detailed feedback
  if (aiReport.detailedFeedback) {
    const fb = aiReport.detailedFeedback;
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Detailed Scores:**\n` +
        `Viability: ${fb.viability || 'N/A'}/10\n` +
        `Completeness: ${fb.completeness || 'N/A'}/10\n` +
        `Feasibility: ${fb.feasibility || 'N/A'}/10`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Per-agent breakdown
  if (agentResults && agentResults.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**--- Agent Breakdown ---**`)
    );
    for (const result of agentResults) {
      const agentName = result.agentName || 'Unknown';
      const agentScore = result.viabilityScore || '?';
      const agentConf = result.confidence || '?';
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${agentName}:** Score ${agentScore}/10 | ${agentConf} confidence`
        )
      );
    }
  }

  // Evidence
  if (aiReport.evidence) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Summary:**\n${aiReport.evidence}`)
    );
  }

  return container;
}

module.exports = {
  buildProjectEvalEmbed,
  buildBuyerEvalEmbed,
};
