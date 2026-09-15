const CONFIDENCE_THRESHOLDS = {
  FAKE:   { high: 30, medium: 15 },
  STOLEN: { high: 25, medium: 12 },
  AI:     { high: 35, medium: 20 },
  LEGIT:  { high: 70, medium: 50 },
};

function calculateScores(fake, stolen, ai, legit) {
  return {
    fake: Math.max(0, Math.min(100, fake.score)),
    stolen: Math.max(0, Math.min(100, stolen.score)),
    ai: Math.max(0, Math.min(100, ai.score)),
    legit: Math.max(0, Math.min(100, legit.score)),
  };
}

function classifyPortfolio(scores) {
  const categories = [
    { key: 'FAKE', score: scores.fake, threshold: CONFIDENCE_THRESHOLDS.FAKE },
    { key: 'STOLEN', score: scores.stolen, threshold: CONFIDENCE_THRESHOLDS.STOLEN },
    { key: 'AI_GEN', score: scores.ai, threshold: CONFIDENCE_THRESHOLDS.AI },
  ];

  categories.sort((a, b) => b.score - a.score);
  const top = categories[0];

  let classification, confidence;

  const topIsHigh = top.score >= top.threshold.high;
  const legitIsHigh = scores.legit >= CONFIDENCE_THRESHOLDS.LEGIT.high;
  const legitIsMedium = scores.legit >= CONFIDENCE_THRESHOLDS.LEGIT.medium;

  if (topIsHigh) {
    classification = top.key;
    confidence = 'HIGH';
  } else if (legitIsHigh) {
    classification = 'LEGIT';
    confidence = 'HIGH';
  } else if (legitIsMedium && top.score < top.threshold.medium) {
    classification = 'LEGIT';
    confidence = 'MEDIUM';
  } else if (top.score >= top.threshold.medium) {
    classification = top.key;
    confidence = 'MEDIUM';
  } else {
    classification = 'UNCERTAIN';
    confidence = 'LOW';
  }

  return { classification, confidence };
}

function generateRecommendation(report) {
  const { classification, confidence, rawScores } = report;

  if (classification === 'FAKE' && confidence === 'HIGH')
    return { action: 'DECLINE', reason: 'Portfolio appears to be entirely fabricated', urgency: 'HIGH' };
  if (classification === 'STOLEN' && confidence === 'HIGH')
    return { action: 'DECLINE', reason: 'Portfolio appears to contain stolen content', urgency: 'HIGH' };
  if (classification === 'AI_GEN' && confidence === 'HIGH')
    return { action: 'INTERVIEW', reason: 'Portfolio appears AI-generated — request voice/video interview', urgency: 'MEDIUM' };
  if (classification === 'LEGIT' && confidence === 'HIGH')
    return { action: 'APPROVE', reason: 'Portfolio appears genuine with high confidence', urgency: 'LOW' };
  if (classification === 'LEGIT' && confidence === 'MEDIUM')
    return { action: 'APPROVE', reason: 'Portfolio appears genuine (medium confidence)', urgency: 'LOW' };
  if (classification === 'UNCERTAIN' || confidence === 'LOW')
    return { action: 'REVIEW', reason: 'Scanner could not determine authenticity — manual review required', urgency: 'MEDIUM' };

  if (rawScores.fake >= 20 && rawScores.ai >= 20) {
    return { action: 'DECLINE', reason: 'Portfolio flagged for both AI-generation and fabrication', urgency: 'HIGH' };
  }
  if (rawScores.legit >= 60) {
    return { action: 'APPROVE', reason: 'High legitimacy score despite some flags', urgency: 'LOW' };
  }

  return { action: 'REVIEW', reason: 'Mixed signals — admin judgment required', urgency: 'MEDIUM' };
}

module.exports = { calculateScores, classifyPortfolio, generateRecommendation };
