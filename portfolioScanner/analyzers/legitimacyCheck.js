function analyzeLegitimacy(fakeScore, stolenScore, aiScore) {
  const signals = [];
  const normalizedFake = Math.min(100, Math.max(0, fakeScore));
  const normalizedStolen = Math.min(100, Math.max(0, stolenScore));
  const normalizedAi = Math.min(100, Math.max(0, aiScore));

  const maxRedFlag = Math.max(normalizedFake, normalizedStolen, normalizedAi);
  const avgRedFlag = (normalizedFake + normalizedStolen + normalizedAi) / 3;
  const combinedRedFlag = maxRedFlag * 0.6 + avgRedFlag * 0.4;

  let score = 100 - combinedRedFlag;

  if (score >= 70) {
    signals.push('High legitimacy score — portfolio appears genuine');
  } else if (score >= 50) {
    signals.push('Moderate legitimacy score — some concerns');
  } else {
    signals.push('Low legitimacy score — significant red flags detected');
  }

  return { score: Math.max(0, Math.min(100, score)), signals };
}

module.exports = { analyzeLegitimacy };
