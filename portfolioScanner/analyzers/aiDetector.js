const { AI_PHRASE_SIGNATURES, COMMON_TYPOS } = require('../utils/keywordSets');

function analyzeAIGenerated(corpus, answerText, answers) {
  const result = { score: 0, signals: [] };

  const phraseResult = detectAIPhrases(corpus);
  result.score += phraseResult.score;
  result.signals.push(...phraseResult.signals);

  const perplexityResult = estimatePerplexity(corpus);
  result.score += perplexityResult.score;
  if (perplexityResult.signals) result.signals.push(...perplexityResult.signals);

  const burstinessResult = analyzeBurstiness(corpus);
  result.score += burstinessResult.score;
  if (burstinessResult.signals) result.signals.push(...burstinessResult.signals);

  const punctuationResult = analyzePunctuation(corpus);
  result.score += punctuationResult.score;
  result.signals.push(...punctuationResult.signals);

  const typoCount = detectTyposSimple(corpus);
  if (typoCount > 0) {
    result.score -= Math.min(typoCount * 2, 10);
    result.signals.push(`Human typos detected (${typoCount}) — reduces AI likelihood`);
  }

  return result;
}

function detectAIPhrases(text) {
  const signals = [];
  let score = 0;

  for (const { pattern, weight } of AI_PHRASE_SIGNATURES) {
    const matches = text.match(pattern);
    if (matches) {
      signals.push(`AI signature: "${matches[0].slice(0, 80)}"`);
      score += weight * matches.length;
    }
  }

  return { score, signals };
}

function estimatePerplexity(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 20) return { score: 0, signals: ['Text too short for perplexity analysis'], perplexity: null };

  let perplexityScore = 0;
  const signals = [];

  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const ttr = uniqueWords.size / words.length;
  if (ttr < 0.35) {
    perplexityScore += 8;
    signals.push(`Low vocabulary diversity (TTR=${ttr.toFixed(2)})`);
  } else if (ttr > 0.60) {
    perplexityScore -= 3;
    signals.push(`Good vocabulary diversity (TTR=${ttr.toFixed(2)})`);
  }

  const wordLengths = words.map(w => w.length);
  const avgLength = wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length;
  const lengthVariance = wordLengths.reduce((acc, l) => acc + (l - avgLength) ** 2, 0) / wordLengths.length;
  if (lengthVariance < 1.5) {
    perplexityScore += 5;
    signals.push(`Suspiciously consistent word lengths (variance=${lengthVariance.toFixed(2)})`);
  } else if (lengthVariance > 3.0) {
    perplexityScore -= 3;
  }

  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'their', 'our',
    'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very']);
  let stopwordCount = 0;
  for (const w of words) {
    if (stopwords.has(w.toLowerCase())) stopwordCount++;
  }
  const stopwordRatio = stopwordCount / words.length;
  if (stopwordRatio < 0.20) {
    perplexityScore += 6;
    signals.push(`Very low stopword ratio (${(stopwordRatio * 100).toFixed(0)}%) — keyword stuffing?`);
  } else if (stopwordRatio > 0.60) {
    perplexityScore += 4;
    signals.push(`Very high stopword ratio (${(stopwordRatio * 100).toFixed(0)}%) — padding?`);
  } else if (stopwordRatio >= 0.30 && stopwordRatio <= 0.50) {
    perplexityScore -= 4;
    signals.push(`Normal stopword ratio (${(stopwordRatio * 100).toFixed(0)}%)`);
  }

  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'project', 'game', 'work', 'developer', 'scripter', 'builder', 'roblox',
    'discord', 'server', 'bot', 'system', 'script', 'code', 'build', 'made',
    'create', 'created', 'making', 'using', 'used', 'also', 'well', 'get', 'got',
    'one', 'two', 'new', 'like', 'just', 'even', 'much', 'many', 'really',
    'good', 'great', 'nice', 'cool', 'awesome', 'amazing']);
  let rareCount = 0;
  for (const w of words) {
    if (!commonWords.has(w.toLowerCase()) && w.length > 4) rareCount++;
  }
  const rareRatio = rareCount / words.length;
  if (rareRatio > 0.25) {
    perplexityScore -= 3;
  }

  return {
    score: perplexityScore,
    signals,
    perplexity: avgLength / (lengthVariance + 0.01),
  };
}

function analyzeBurstiness(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length < 5) {
    return { score: 0, signals: ['Too few sentences for burstiness analysis'], burstiness: null };
  }

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  const signals = [];
  let score = 0;

  if (coefficientOfVariation < 0.4) {
    score += 10;
    signals.push(`Low burstiness (CV=${coefficientOfVariation.toFixed(2)}) — uniform sentence lengths suggest AI`);
  } else if (coefficientOfVariation < 0.6) {
    score += 4;
    signals.push(`Moderate burstiness (CV=${coefficientOfVariation.toFixed(2)})`);
  } else if (coefficientOfVariation >= 0.8) {
    score -= 5;
    signals.push(`High burstiness (CV=${coefficientOfVariation.toFixed(2)}) — natural variation`);
  } else {
    signals.push(`Normal burstiness (CV=${coefficientOfVariation.toFixed(2)})`);
  }

  return { score, signals, burstiness: coefficientOfVariation };
}

function analyzePunctuation(text) {
  const signals = [];
  let score = 0;

  const emDashCount = (text.match(/—|--/g) || []).length;
  if (emDashCount > 3) {
    score += 4;
    signals.push(`Excessive em dash usage (${emDashCount})`);
  }

  const oxfordList = /[a-zA-Z]+, [a-zA-Z]+, and [a-zA-Z]+/g;
  const noOxfordList = /[a-zA-Z]+, [a-zA-Z]+ and [a-zA-Z]+/g;
  const oxfordCount = (text.match(oxfordList) || []).length;
  const noOxfordCount = (text.match(noOxfordList) || []).length;
  const totalLists = oxfordCount + noOxfordCount;
  if (totalLists >= 2 && oxfordCount / totalLists > 0.75) {
    score += 3;
    signals.push('Consistent Oxford comma usage (AI tendency)');
  }

  const semicolonCount = (text.match(/;/g) || []).length;
  if (semicolonCount > 3) {
    score += 5;
    signals.push(`High semicolon usage (${semicolonCount}) — unusual for casual dev applications`);
  }

  const singleQuotes = (text.match(/'/g) || []).length;
  const doubleQuotes = (text.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    score += 3;
    signals.push('Unbalanced quotation marks (possible copy-paste artifact)');
  }

  return { score, signals };
}

function detectTyposSimple(text) {
  let count = 0;
  for (const p of COMMON_TYPOS) {
    count += (text.match(p) || []).length;
  }

  const repeatedLetters = text.match(/([a-z])\1{2,}/gi);
  if (repeatedLetters) count += repeatedLetters.length;

  return count;
}

module.exports = { analyzeAIGenerated };
