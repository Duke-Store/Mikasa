const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

function buildReportEmbed(report) {
  const colorMap = {
    FAKE: 0xFFDD00,
    STOLEN: 0xFFDD00,
    AI_GEN: 0xFFDD00,
    LEGIT: 0xFFDD00,
    UNCERTAIN: 0xFFDD00,
  };

  const emojiMap = {
    FAKE: '🚫',
    STOLEN: '©️',
    AI_GEN: '🤖',
    LEGIT: '✅',
    UNCERTAIN: '❓',
  };

  const confidenceEmoji = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢',
  };

  const recommendationColors = {
    APPROVE: 0xFFDD00,
    DECLINE: 0xFFDD00,
    REVIEW: 0xFFDD00,
    INTERVIEW: 0xFFDD00,
  };

  const container = new ContainerBuilder()
    .setAccentColor(colorMap[report.classification] || 0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${emojiMap[report.classification] || '❓'} Portfolio Scan: ${report.classification}\n\n**Confidence:** ${confidenceEmoji[report.confidence] || ''} ${report.confidence}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**📊 Scores**\nFake: \`${report.rawScores.fake}/100\`\nStolen: \`${report.rawScores.stolen}/100\`\nAI-Gen: \`${report.rawScores.ai}/100\`\nLegit: \`${report.rawScores.legit}/100\``)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**⚠️ Flags**\n${report.signals.slice(0, 5).join('\n') || 'None'}`)
    );

  if (report.signals.length > 5) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**📋 Additional Signals (${report.signals.length - 5} more)**\n${report.signals.slice(5, 10).join('\n') || 'None'}`)
    );
  }

  const rec = report.recommendation || {};
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**🛠️ Recommendation**\n**${rec.action || 'REVIEW'}**${rec.reason ? `\n${rec.reason}` : ''}`)
  );

  if (report.metadata) {
    const metaLines = [];
    if (report.metadata.userTag) metaLines.push(`🧑 Submitted by ${report.metadata.userTag}`);
    if (report.metadata.ticketNumber) metaLines.push(`<:Rex_GoldenTicket:1529173698505080874> Ticket #${report.metadata.ticketNumber}`);
    if (report.metadata.totalChars) metaLines.push(`📝 ${report.metadata.totalChars} chars, ${report.metadata.wordCount || 0} words`);
    if (metaLines.length > 0) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**📌 Details**\n${metaLines.join('\n')}`)
      );
    }
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`*Scanner v1.0 | ${report.metadata.userTag || 'Unknown'} | <t:${Math.floor(Date.now() / 1000)}:F>*`)
  );

  return container;
}

module.exports = { buildReportEmbed };
