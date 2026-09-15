const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

function buildAIScoreBar(score) {
  const filled = '█'.repeat(Math.round(score));
  const empty = '░'.repeat(10 - Math.round(score));
  return `${filled}${empty} ${score}/10`;
}

function buildAIAgentReportEmbed(aiReport, metadata = {}) {
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

  const confidenceColor = {
    HIGH: '🟢',
    MEDIUM: '🟡',
    LOW: '🔴',
  };

  const container = new ContainerBuilder()
    .setAccentColor(colorMap[aiReport.classification] || 0xFFDD00)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${emojiMap[aiReport.classification] || '❓'} AI Portfolio Scan\n\n` +
        `**Overall Rating:** ${buildAIScoreBar(aiReport.finalScore)}\n` +
        `**Classification:** ${aiReport.classification}\n` +
        `**Confidence:** ${confidenceColor[aiReport.confidence] || ''} ${aiReport.confidence}`
      )
    );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '### 📊 Detailed Ratings\n' +
      `**Skills:** ${buildAIScoreBar(parseFloat(aiReport.detailedFeedback.skillsRating) || 0)}\n` +
      `**Authenticity:** ${buildAIScoreBar(parseFloat(aiReport.detailedFeedback.authenticityRating) || 0)}\n` +
      `**Completeness:** ${buildAIScoreBar(parseFloat(aiReport.detailedFeedback.completenessRating) || 0)}\n` +
      `**Professionalism:** ${buildAIScoreBar(parseFloat(aiReport.detailedFeedback.professionalismRating) || 0)}`
    )
  );

  if (aiReport.strengths && aiReport.strengths.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ✅ Strengths\n${aiReport.strengths.map(s => `• ${s}`).join('\n')}`
      )
    );
  }

  if (aiReport.missingItems && aiReport.missingItems.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ⚠️ What's Missing\n${aiReport.missingItems.map(m => `• ${m}`).join('\n')}`
      )
    );
  }

  if (aiReport.redFlags && aiReport.redFlags.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 🚩 Red Flags\n${aiReport.redFlags.map(f => `• ${f}`).join('\n')}`
      )
    );
  }

  if (aiReport.agentResults && aiReport.agentResults.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );

    const agentLines = aiReport.agentResults.map(a =>
      `**${a.agentName}** → ${a.score}/10 | ${a.classification} (${a.confidence})`
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 🤖 Agent Consensus\n${agentLines.join('\n')}`
      )
    );
  }

  if (aiReport.evidence) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 📋 Analysis Summary\n${aiReport.evidence}`
      )
    );
  }

  const metaParts = [];
  if (metadata.userTag) metaParts.push(`🧑 Submitted by ${metadata.userTag}`);
  if (metadata.ticketNumber) metaParts.push(`<:Rex_GoldenTicket:1529173698505080874> Ticket #${metadata.ticketNumber}`);
  if (metadata.selectedRole) metaParts.push(`🎯 Role: ${metadata.selectedRole}`);

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${metaParts.join(' | ')}\n*AI Agent Scanner v2.0 | <t:${Math.floor(Date.now() / 1000)}:F>*`
    )
  );

  return container;
}

module.exports = { buildAIAgentReportEmbed };